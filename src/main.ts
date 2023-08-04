import { EnhancedFootnote } from "./footnote"
import {
	App,
	Editor,
	MarkdownView,
	Plugin,
	PluginSettingTab,
	Setting
} from 'obsidian';

interface EnhancedFootnotesSettings {
	treatFootnotesAsComments: boolean;
}

const DEFAULT_SETTINGS: EnhancedFootnotesSettings = {
	treatFootnotesAsComments: true,
}

export default class EnhancedFootnotesPlugin extends Plugin {
	settings: EnhancedFootnotesSettings;
	
	private footnote;

	async onload() {
		await this.loadSettings();

		this.footnote = new EnhancedFootnote()

		this.addCommand({
			id: 'add-numbered-footnote',
			name: 'Add numbered footnote',
			hotkeys: [{modifiers: ["Mod", "Shift"], key: "m"}],
			editorCallback: (editor: Editor, view: MarkdownView) => {
				this.footnote.AddNumberedFootnote(editor)
			}
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));

	}

	onunload() {

	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}


class SampleSettingTab extends PluginSettingTab {
	plugin: EnhancedFootnotes;

	constructor(app: App, plugin: EnhancedFootnotes) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl)
			.setName('Treat footnotes as comments')
			.setDesc('When adding a footnote to a text selection, add a highlight the selected text')
			.addToggle(toggle => toggle
				.setValue(this.plugin.settings.treatFootnotesAsComments)
				.onChange(async (value) => {
					this.plugin.settings.treatFootnotesAsComments = value;
					await this.plugin.saveSettings();
				}));

	}
}
