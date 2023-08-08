import {
	Editor,
	EditorPosition,
} from 'obsidian';

export class EnhancedFootnote {

	// regexes for matching
	private AllMarkers = /\[\^([^[\]]+)\](?!:)/dg;				// matches [^123] , [^abc] (no ':')
	private MarkerInLine = /\[\^([^[\]]+)\](?!:)/d;			// matches [^123] , [^abc] (no ':')
	private HighlitMarkerInLine = /==\[\^([^[\]]+)\](?!:)/;	// matches ==[^123], ==[^abc] (no ':')
	// private AllNumberedMarkers = /\[\^(\d+)\]/gi;				// matches [^123]
	// private AllDetailsNameOnly = /\[\^([^\[\]]+)\]:/g;			// matches [^123]: , [^abc]:
	private DetailInLine = /\[\^([^[\]]+)\]:/;					// matches [^123]: , [^abc]:
	private NumbersFromFootnotes = /(?<=\[\^)(\d+)(?=\])/g;		// matches 123 from [^123]
	// private NamesFromDootnotes = /(?<=\[\^)([^\[\]]+)(?=\])/g;	// matches 123 from [^123] , abc from [^abc]

	private cursorStart: EditorPosition;
	private cursorEnd: EditorPosition;
	private selectedLineText: string;
	private fileText: string;

	public AddNumberedFootnote(editor: Editor)
	{
		this.cursorStart = editor.getCursor('from');
		this.cursorEnd = editor.getCursor('to');
		this.selectedLineText = editor.getLine(this.cursorEnd.line);
		this.fileText = editor.getValue();

		// navigate to existing footnote if we need to
		if (this.NavigateDetailToMarker(editor, this.selectedLineText) ||
			this.NavigateMarkerToDetail(editor, this.cursorEnd, this.selectedLineText))
			return;

		// INSERT MARKER

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
		
		const characterAtCursor = editor.getLine(this.cursorEnd.line)[this.cursorEnd.ch];
		const isSingleCharacterSelection = this.cursorStart.line == this.cursorEnd.line && this.cursorStart.ch == this.cursorEnd.ch;
		const isCursorInsideWord = characterAtCursor != undefined && characterAtCursor.match(/\S/); // matches any non-whitespace
		// move cursor to end of word
		if (isSingleCharacterSelection && isCursorInsideWord)
		{
			const endOfWord = this.selectedLineText.substr(this.cursorEnd.ch).search(/\s/) // matches any whitespace
			let newCursorPos;
			if (endOfWord == -1) // no whitespace at end of line
				newCursorPos = this.selectedLineText.length;
			else
				newCursorPos = this.cursorEnd.ch + endOfWord;
			editor.setCursor({line: this.cursorEnd.line, ch: newCursorPos});
		}

		// insert marker at selection
		if (isSingleCharacterSelection)
			editor.replaceSelection(footnoteMarker);
		else
			editor.replaceSelection(`==${editor.getSelection()}==${footnoteMarker}`);

		// INSERT DETAIL

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

		// this.NavigateMarkerToDetail(editor, )
		console.log(this.cursorEnd, this.cursorStart)
	}

	NavigateDetailToMarker(editor: Editor, line: string): boolean
	{
		const match = line.match(this.DetailInLine);
		if (match == null)
			return false;

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
		const matches = line.match(this.AllMarkers);
		console.log(matches)
		if (matches == null)
			return false;


		return true;
	}

}


