import { CommentesqueFootnote } from "./footnote"
import {
	Editor,
	MarkdownView,
	Plugin,
} from 'obsidian';

export default class CommentesqueFootnotesPlugin extends Plugin {
	
	private footnote: CommentesqueFootnote;

	async onload() {
		this.footnote = new CommentesqueFootnote()

		this.addCommand({
			id: 'add-numbered-footnote',
			name: 'Add numbered footnote',
			hotkeys: [{modifiers: ["Mod", "Shift"], key: "m"}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.footnote.AddNumberedFootnote(editor)
			}
		});
		
		this.addCommand({
			id: 'add-named-footnote',
			name: 'Add named footnote',
			hotkeys: [{modifiers: ["Mod", "Alt"], key: "m"}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.footnote.AddNamedFootnote(editor)
			}
		});
	}

	onunload() {

	}
}