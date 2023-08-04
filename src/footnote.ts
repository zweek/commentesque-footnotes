import {
	App,
	Editor,
	MarkdownView,
	Setting
} from 'obsidian';

export class EnhancedFootnote {

	// regexes for matching
	private AllMarkers = /\[\^([^\[\]]+)\](?!:)/dg;				// matches [^123] , [^abc] (no ':')
	private AllNumberedMarkers = /\[\^(\d+)\]/gi;				// matches [^123]
	private AllDetailsNameOnly = /\[\^([^\[\]]+)\]:/g;			// matches [^123]: , [^abc]:
	private DetailInLine = /\[\^([^\[\]]+)\]:/;					// matches [^123]: , [^abc]:
	private NumbersFromFootnotes = /(?<=\[\^)(\d+)(?=\])/g;		// matches 123 from [^123]
	private NamesFromDootnotes = /(?<=\[\^)([^\[\]]+)(?=\])/;	// matches 123 from [^123] , abc from [^abc]

	private cursorStart;
	private cursorEnd;
	private currentLineText;
	private fileText;

	public AddNumberedFootnote(editor: Editor) {
		this.cursorStart = editor.getCursor('from');
		this.cursorEnd = editor.getCursor('to');
		this.currentLineText = editor.getLine(this.cursorEnd.line);
		this.fileText = editor.getValue();

		// navigate to existing footnote if we need to
		if (this.NavigateFootnote())
			return;

		// INSERT MARKER

		// find out which number we should use for the footnote
		// TODO: make this re-index all the numbers
		let matches = this.fileText.match(this.NumbersFromFootnotes);
		let numbers: Array<number> = [];
		let currentMax = 1;

		if (matches != null) {
			for (let i = 0; i < matches.length; i++) {
				numbers[i] = Number(matches[i]);
				if (numbers[i] + 1 > currentMax)
					currentMax = numbers[i] + 1;
			}
		}

		// insert marker at selection
		let footnoteID = currentMax;
		let footnoteMarker = `[^${footnoteID}]`;

		let characterAtCursor = editor.getLine(this.cursorEnd.line)[this.cursorEnd.ch];
		
		let isSingleCharacterSelection = this.cursorStart.line == this.cursorEnd.line && this.cursorStart.ch == this.cursorEnd.ch;
		let isCursorInsideWord = characterAtCursor != undefined && characterAtCursor.match(/\S/); // matches any non-whitespace
		// move cursor to end of word
		if (isSingleCharacterSelection && isCursorInsideWord)
		{
			let endOfWord = this.currentLineText.substr(this.cursorEnd.ch).search(/\s/) // matches any whitespace
			let newCursorPos;
			if (endOfWord == -1) // no whitespace at end of line
				newCursorPos = this.currentLineText.length;
			else
				newCursorPos = this.cursorEnd.ch + endOfWord;
			editor.setCursor({line: this.cursorEnd.line, ch: newCursorPos});
		}

		if (isSingleCharacterSelection)
			editor.replaceSelection(footnoteMarker);
		else
			editor.replaceSelection(`==${editor.getSelection()}==${footnoteMarker}`);

		// INSERT DETAIL

		let currentLineIndex = editor.lastLine();
		let lastLineText

		// clean up extra whitespace at end of file
		console.log(this.fileText);
		for (let i = editor.lastLine(); i > 0; i--)
		{
			console.log(editor.getLine(i))
		}
		
	}

	NavigateFootnote(): boolean {
		return false
	}

}


