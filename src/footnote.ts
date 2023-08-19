import {
	Editor,
	EditorPosition,
} from 'obsidian';

export class EnhancedFootnote {

	// regexes for matching
	private StandaloneMarkers = /(?<=\s)\[\^([^[\]]+)\](?!:)/dg;	// matches ' [^123abc]' (excludes the whitespace in the actual match)
	private WordMarkers = /[^\s=]+\[\^([^[\]]+)\](?!:)/dg;			// matches word[^123abc]
	private CommentMarkers = /==.+==\[\^([^[\]]+)\](?!:)/dg;		// matches ==some text==[^123abc]
	private DetailInLine = /\[\^([^[\]]+)\]:/;						// matches [^123]: , [^abc]:
	private NumbersFromFootnotes = /(?<=\[\^)(\d+)(?=\])/g;			// matches 123 from [^123]


	private cursorStart: EditorPosition;
	private cursorEnd: EditorPosition;
	private selectedLineText: string;
	private fileText: string;

	public AddNamedFootnote(editor: Editor): void
	{
		this.InitEditorInfo(editor);
		
		// navigate to exisiting footnote if we need to
		if (this.NavigateDetailToMarker(editor, this.selectedLineText) ||
			this.NavigateMarkerToDetail(editor, this.cursorEnd, this.selectedLineText))
			return;

		if (this.MoveCursorToEndOfWord(editor))
		{
			editor.replaceSelection("[^]");
			editor.setCursor({line: this.cursorEnd.line, ch: this.cursorEnd.ch+2})
		}
		else
		{
			editor.replaceSelection(`==${editor.getSelection()}==[^]`);
			editor.setCursor({line: this.cursorEnd.line, ch: this.cursorEnd.ch+6})
		}

	}

	public AddNumberedFootnote(editor: Editor): void
	{
		this.InitEditorInfo(editor);

		// navigate to existing footnote if we need to
		if (this.NavigateDetailToMarker(editor, this.selectedLineText) ||
			this.NavigateMarkerToDetail(editor, this.cursorEnd, this.selectedLineText))
			return;

		// find out which number we should use for the footnote
		// TODO: make this re-index all the numbers
		const matches = this.fileText.match(this.NumbersFromFootnotes);
		const numbers: Array<number> = [];
		let currentMax = 1;

		if (matches != null)
		{
			for (let i = 0; i < matches.length; i++)
			{
				numbers[i] = Number(matches[i]);
				if (numbers[i] + 1 > currentMax)
					currentMax = numbers[i] + 1;
			}
		}

		const footnoteID = currentMax;
		const footnoteMarker = `[^${footnoteID}]`;
		
		// insert marker at selection
		if (this.MoveCursorToEndOfWord(editor))
			editor.replaceSelection(footnoteMarker);
		else
			editor.replaceSelection(`==${editor.getSelection()}==${footnoteMarker}`);

		this.CreateFootnoteDetail(editor, footnoteID.toString());
	}

	InitEditorInfo(editor: Editor): void
	{
		this.cursorStart = editor.getCursor('from');
		this.cursorEnd = editor.getCursor('to');
		this.selectedLineText = editor.getLine(this.cursorEnd.line);
		this.fileText = editor.getValue();
	}

	MoveCursorToEndOfWord(editor: Editor): boolean
	{
		const characterAtCursor = editor.getLine(this.cursorEnd.line)[this.cursorEnd.ch];
		const isSingleCharacterSelection = this.cursorStart.line == this.cursorEnd.line && this.cursorStart.ch == this.cursorEnd.ch;
		const isCursorInsideWord = characterAtCursor != undefined && characterAtCursor.match(/\S/) != null; // matches any non-whitespace

		if (isSingleCharacterSelection && !isCursorInsideWord)
			return true;

		if (isSingleCharacterSelection && isCursorInsideWord)
		{
			const endOfWord = this.selectedLineText.substring(this.cursorEnd.ch).search(/\s/) // matches any whitespace
			let newCursorPos;
			if (endOfWord == -1) // no whitespace at end of line
				newCursorPos = this.selectedLineText.length;
			else
				newCursorPos = this.cursorEnd.ch + endOfWord;
			editor.setCursor({line: this.cursorEnd.line, ch: newCursorPos});
			this.cursorEnd.ch = newCursorPos;
			return true;
		}
		return false;
	}

	NavigateDetailToMarker(editor: Editor, line: string): boolean
	{
		// make sure we're on a detail line
		const match = line.match(this.DetailInLine);
		if (match == null)
			return false;

		// find corresponding marker
		const matchMarker = `[^${match[1]}]`;
		for (let i = 0; i < editor.lineCount(); i++)
		{
			const scanLine = editor.getLine(i);
			if (scanLine.contains(matchMarker))
			{
				editor.setCursor({line: i, ch: scanLine.indexOf(matchMarker) + matchMarker.length});
				return true;
			}
		}
		return true;
	}

	NavigateMarkerToDetail(editor: Editor, cursor: EditorPosition, line: string): boolean
	{
		// find every marker in line
		let match;
		const allMatches = [];
		// this feels very scuffed, but it ensures that we find all valid markers without duplicates
		// maybe i'll figure out a better way to do this later :]
		while ((match = this.WordMarkers.exec(line)) != null)
			allMatches.push(match);
		while ((match = this.StandaloneMarkers.exec(line)) != null)
			allMatches.push(match);
		while ((match = this.CommentMarkers.exec(line)) != null)
			allMatches.push(match);
		
		let currentLine;
		for (let i = 0; i < allMatches.length; i++)
		{
			// find out which marker the cursor is on
			const currentMatchIndices = allMatches[i].indices[0];
			const isCursorOnMarker = cursor.ch >= currentMatchIndices[0] && cursor.ch <= currentMatchIndices[1];
			if (!isCursorOnMarker)
				continue;
			
			// find corresponding detail
			const detailToNavigateTo = `[^${allMatches[i][1]}]:`;
			for (let j = editor.lastLine(); j > 0; j--)
			{
				currentLine = editor.getLine(j);
				if (currentLine.contains(detailToNavigateTo))
				{
					editor.setCursor({line: j, ch: currentLine.length})
					return true;
				}
			}
			// no detail found, creating a new one and navigating to it
			this.CreateFootnoteDetail(editor, allMatches[i][1]);
			editor.setCursor({line: editor.lastLine(), ch: editor.getLine(editor.lastLine()).length})
			return true;
		}
		return false;
	}

	CreateFootnoteDetail(editor: Editor, footnoteID: string)
	{
		// clean up extra whitespace at end of file
		const lastLineIndex = editor.lastLine();
		let currentLine;
		let currentLineIndex;
		for (currentLineIndex = lastLineIndex; currentLineIndex >= 0; currentLineIndex--)
		{
			currentLine = editor.getLine(currentLineIndex);
			if (currentLine.length > 0)
			{
				editor.replaceRange(
					"",
					{line: currentLineIndex, ch: currentLine.length},
					{line: lastLineIndex, ch: editor.getLine(lastLineIndex).length}
				);
				break;
			}
		}
		
		// insert detail at end of file
		const footnoteDetail = `[^${footnoteID}]: `;

		const lastLine = editor.getLine(editor.lastLine());
		if (lastLine.match(this.DetailInLine) == null)
			editor.setLine(currentLineIndex, `${currentLine}\n\n${footnoteDetail}`);
		else
			editor.setLine(currentLineIndex, `${currentLine}\n${footnoteDetail}`);

	}

}