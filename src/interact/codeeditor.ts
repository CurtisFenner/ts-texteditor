
export interface TextPosition {
	line0: number,
	char0: number,
}

interface MonarchBracketDef {
	open: string,
	close: string,
	token: string,
};

interface MonarchRule {
	regex: RegExp,
	action: MonarchAction,
}

interface MonarchAction {
	token: string,

	next?: string | "@pop",
}

export interface MonarchGrammar {
	ignoreCase?: false,

	defaultToken: string,

	brackets?: MonarchBracketDef[],

	tokenizer: MonarchTokenizer,
}

type MonarchTokenizer = Record<string, MonarchRule[]>;

export class Lexer {
	private schema: MonarchGrammar;
	private defaultState: string;

	constructor(schema: MonarchGrammar) {
		this.schema = schema;
		this.defaultState = "----";
		for (let key in schema.tokenizer) {
			this.defaultState = key;
			break;
		}
		if (this.defaultState === "----") {
			throw new Error("Lexer: schema must have at least one state");
		}
	}

	lexFragment(initialState: string[], fragment: string): {
		tokens: { token: string, lexeme: string }[],
		next: string[],
	} {
		const state = initialState.slice();
		const tokens = [];
		let cursor = 0;

		while (cursor < fragment.length) {
			if (state.length === 0) {
				state.push(this.defaultState);
			}
			const top = state[state.length - 1];
			const rules = this.schema.tokenizer[top];
			if (rules === undefined) {
				throw new Error("Lexer: no such state `" + top + "`");
			}

			let progress = false;
			for (const rule of rules) {
				const re = new RegExp(rule.regex.source, "y");
				re.lastIndex = cursor;
				const match = re.exec(fragment);
				if (match === null) {
					continue;
				} else if (match[0].length === 0) {
					continue;
				}
				tokens.push({
					token: rule.action.token,
					lexeme: match[0],
				});
				cursor += match[0].length;
				progress = true;
				const next = rule.action.next;
				if (next !== undefined) {
					if (next === "@pop") {
						state.pop();
					} else if (next === "@push") {
						state.push(top);
					} else {
						state.push(next);
					}
				}
				break;
			}
			if (!progress) {
				tokens.push({
					token: this.schema.defaultToken,
					lexeme: fragment[cursor],
				});
				cursor += 1;
			}
		}

		const reconstruct = tokens.map(x => x.lexeme).join("");
		if (reconstruct !== fragment) {
			console.error("reconstructed mismatch:");
			console.error("expected:", fragment);
			console.error("produced:", reconstruct);
			console.error(tokens);
		}

		return {
			tokens,
			next: state,
		};
	}
}

function setRangeText(
	textarea: HTMLTextAreaElement,
	text: string,
	begin: number,
	end: number,
) {
	// Unfortunately, the standards-track textarea.setRangeText doesn't support
	// undo/redo.
	const active = document.activeElement;
	textarea.focus();
	textarea.setSelectionRange(begin, end);
	document.execCommand("insertText", false, text);
	if (active !== textarea && active !== null) {
		if ((active as any).focus) {
			(active as any).focus();
		}
	}
}

interface RangeEdit {
	begin: number,
	end: number,
	replacement: string,
}

function setRangesText<T extends Record<string, number>>(
	textarea: HTMLTextAreaElement,
	anchors: T & Record<string, number>,
	// must be non-overlapping and sorted.
	edits: RangeEdit[],
): T {
	const delta: Record<string, number> = {};
	for (const k in anchors) {
		delta[k] = 0;
	}

	const value = textarea.value;
	let replacement = "";
	for (let i = 0; i < edits.length; i++) {
		if (i !== 0) {
			replacement += value.substring(edits[i - 1].end, edits[i].begin);
		}
		replacement += edits[i].replacement;

		for (const k in anchors) {
			if (anchors[k] >= edits[i].end) {
				delta[k] += edits[i].replacement.length - (edits[i].end - edits[i].begin);
			}
		}
	}

	setRangeText(textarea, replacement, edits[0].begin, edits[edits.length - 1].end);

	const updated: Record<string, number> = {};
	for (const k in anchors) {
		updated[k] = anchors[k] + delta[k];
	}

	return updated as T;
}

/// `findLines` returns the position of the first character of each line that
/// has some overlap with the selection.
function findLines(text: string, begin: number, end: number): number[] {
	const out = [];
	const first = text.lastIndexOf("\n", begin - 1);
	out.push(first < 0 ? 0 : first + 1);

	let line = Math.max(0, begin);
	while (true) {
		line = text.indexOf("\n", line);
		if (line < 0) {
			break;
		} else if (line < end) {
			out.push(line + 1);
			line = line + 1;
		} else {
			break;
		}
	}

	return out;
}

function assertEqual(given: any, expected: any) {
	if (JSON.stringify(given) !== JSON.stringify(expected)) {
		console.error("   given:", given);
		console.error("expected:", expected);
		throw new Error("assertEqual failed");
	}
}

{
	const example = "alpha\nbeta\ngamma";
	assertEqual(findLines(example, 0, 5), [0]);
	assertEqual(findLines(example, 0, 6), [0, 6]);
}

export class Editor {
	// <div class="codeeditor">:
	//   <div class="linetray">
	//     <div* class="linenumber"></div*>
	//   </div>
	//   <div class="code-scroll">
	//     <div class="background">
	//       <div class="annotations">
	//         <div* class="annotation-rect"></div*>
	//       </div>
	//       <div class="code">
	//         <div* class="line"></div*>
	//       </div>
	//       <textarea></textarea>
	//       <pre class="foreground"></pre>
	//     </div>
	//   </div>
	// </div>

	containerDiv: HTMLDivElement;
	lineTrayDiv: HTMLDivElement;
	codeScrollDiv: HTMLDivElement;
	backgroundDiv: HTMLDivElement;
	backgroundAnnotationsDiv: HTMLDivElement;
	backgroundCodeDiv: HTMLElement;
	textarea: HTMLTextAreaElement;
	foregroundPre: HTMLPreElement;

	private lexer: Lexer | null = null;
	// `lastLexer` is only set by `renderLines`.
	private lastLexer: Lexer | null = null;

	font: string;
	lineHeight: string;
	lineTrayWidth: string;

	renderedLines: {
		lineDiv: HTMLDivElement,
		codeDiv: HTMLDivElement,
		content: string,
		// The state used to render this line.
		lastState: string[],
		// The state to use to render the next line.
		nextState: string[],
	}[] = [];

	watch = () => { };

	constructor(container: HTMLDivElement) {
		this.font = "16px monospace";
		this.lineHeight = "22px";
		this.lineTrayWidth = "60px";

		container.innerHTML = "";
		container.classList.add("codeeditor");
		container.style.setProperty("--codeeditor-line-tray-width", this.lineTrayWidth);
		container.style.setProperty("--codeeditor-tab-size", "4");
		container.style.position = "relative";
		container.style.setProperty("--codeeditor-font", this.font);
		container.style.setProperty("--codeeditor-line-height", this.lineHeight);
		this.containerDiv = container;

		this.lineTrayDiv = document.createElement("div");
		this.lineTrayDiv.className = "linetray";
		this.containerDiv.appendChild(this.lineTrayDiv);

		this.codeScrollDiv = document.createElement("div");
		this.codeScrollDiv.className = "code-scroll";
		this.containerDiv.appendChild(this.codeScrollDiv);

		this.backgroundDiv = document.createElement("div");
		this.backgroundDiv.className = "background";
		this.codeScrollDiv.appendChild(this.backgroundDiv);

		this.backgroundAnnotationsDiv = document.createElement("div");
		this.backgroundAnnotationsDiv.className = "annotations";
		this.backgroundDiv.appendChild(this.backgroundAnnotationsDiv);

		this.backgroundCodeDiv = document.createElement("div");
		this.backgroundCodeDiv.className = "code";
		this.backgroundDiv.appendChild(this.backgroundCodeDiv);

		this.textarea = document.createElement("textarea");
		this.textarea.spellcheck = false;
		this.backgroundDiv.appendChild(this.textarea);

		this.foregroundPre = document.createElement("pre");
		this.backgroundDiv.appendChild(this.foregroundPre);

		this.textarea.addEventListener("keydown", e => {
			if (e.key === "Tab") {
				e.preventDefault();
				const start = this.textarea.selectionStart;
				const end = this.textarea.selectionEnd;
				const value = this.textarea.value;
				const lineBegin = Math.max(0, value.lastIndexOf("\n", start - 1));
				if (e.getModifierState("Shift")) {
					// Dedent each line.
					const lines = findLines(value, start, end);
					const edits = [];
					for (const lineStart of lines) {
						if (value[lineStart] === "\t") {
							edits.push({
								begin: lineStart,
								end: lineStart + 1,
								replacement: "",
							});
						}
					}
					const newAnchor = setRangesText(this.textarea, { selectionStart: start, selectionEnd: end }, edits);
					this.textarea.setSelectionRange(newAnchor.selectionStart, newAnchor.selectionEnd);
				} else {
					const nextNewline = value.indexOf("\n", start);
					const containsNewline = nextNewline >= 0 && nextNewline < end;
					if (containsNewline) {
						// Indent each line.
						const lines = findLines(value, start, end);
						const edits = [];
						for (const lineStart of lines) {
							edits.push({
								begin: lineStart,
								end: lineStart,
								replacement: "\t",
							});
						}
						const newAnchor = setRangesText(this.textarea, { selectionStart: start, selectionEnd: end }, edits);
						this.textarea.setSelectionRange(newAnchor.selectionStart, newAnchor.selectionEnd);
					} else {
						// Replace the selection with a hard tab.
						setRangeText(this.textarea, "\t", start, this.textarea.selectionEnd);
						this.textarea.setSelectionRange(start + 1, start + 1);
					}
				}
				this.rerender();
				return;
			}
		});

		this.textarea.addEventListener("input", (_e: Event) => {
			const e = _e as InputEvent;
			if (e.inputType === "insertLineBreak") {
				const start = this.textarea.selectionStart;
				const end = this.textarea.selectionEnd;
				let lastNewline = this.textarea.value.lastIndexOf("\n", start - 2);
				if (lastNewline < 0) {
					lastNewline = 0;
				}
				const space = /[ \t]*/y;
				space.lastIndex = lastNewline + 1;
				let [indent] = space.exec(this.textarea.value)!;
				const lastBefore = this.textarea.value[start - 2];
				if (lastBefore === "{") {
					indent += "\t";
				}
				setRangeText(this.textarea, indent, start, end);
				this.textarea.setSelectionRange(start + indent.length, start + indent.length);
			}
			this.rerender();
		});

		this.textarea.onfocus = () => {
			container.style.border = "3px double #49C";
		};
		this.textarea.onblur = (e) => {
			container.style.border = "3px solid #888";
		};

		this.codeScrollDiv.onscroll = () => {
			this.lineTrayDiv.scrollTop = this.codeScrollDiv.scrollTop;
		};

		this.containerDiv.addEventListener("mousedown", (e) => {
			this.textarea.focus();
			if (e.target !== this.textarea) {
				e.preventDefault();
			}
		});

		this.rerender();
	}

	setGrammar(grammar: MonarchGrammar) {
		this.lexer = new Lexer(grammar);
		this.rerender();
	}

	addAnnotation(
		// from: TextPosition,
		// to: TextPosition,
		fromOffset: number,
		toOffset: number,
		style: { bg: string, under: string },
	): HTMLDivElement {
		const div = document.createElement("div");

		const containerRect = this.backgroundAnnotationsDiv.getBoundingClientRect();

		const textNode = this.foregroundPre.childNodes[0];
		const length = textNode?.textContent?.length || 0;
		const range = new Range();
		range.setStart(textNode, Math.max(0, Math.min(length, fromOffset)));
		range.setEnd(textNode, Math.max(0, Math.min(length, toOffset)));
		const rectangles = range.getClientRects();
		for (const rect of rectangles) {
			const box = document.createElement("div");
			box.style.background = style.bg;
			box.style.position = "absolute";
			box.style.borderBottom = "3px solid " + style.under;
			box.style.width = rect.width.toFixed(0) + "px";
			box.style.height = rect.height.toFixed(0) + "px";
			box.style.left = (rect.left - containerRect.left).toFixed(0) + "px";
			box.style.top = (rect.top - containerRect.top).toFixed(0) + "px";
			div.appendChild(box);
		}

		this.backgroundAnnotationsDiv.appendChild(div);
		return div;
	}

	clearAnnotation(div: HTMLDivElement) {
		this.backgroundAnnotationsDiv.removeChild(div);
	}

	renderLines(text: string[]) {
		if (text.length === 0) {
			text = [""];
		}

		for (const removed of this.renderedLines.splice(text.length)) {
			removed.codeDiv.parentElement!.removeChild(removed.codeDiv);
			removed.lineDiv.parentElement!.removeChild(removed.lineDiv);
		}

		let lexState: string[] = [];
		for (let i = 0; i < text.length; i++) {
			if (this.renderedLines[i] === undefined) {
				const row = document.createElement("div");
				row.className = "line";
				row.style.position = "relative";

				const lineDiv = document.createElement("div");
				lineDiv.textContent = (i + 1).toFixed(0) + "  ";
				lineDiv.className = "line-number";
				this.lineTrayDiv.appendChild(lineDiv);

				this.backgroundCodeDiv.appendChild(row);

				this.renderedLines[i] = {
					codeDiv: row,
					lineDiv: lineDiv,
					content: "",
					lastState: [],
					nextState: [],
				};
			}

			const line = this.renderedLines[i];

			const changed = line.content !== text[i]
				|| this.lastLexer !== this.lexer
				|| JSON.stringify(line.lastState) !== JSON.stringify(lexState);
			if (changed) {
				if (this.lexer !== null) {
					line.lastState = lexState.slice();
					const lex = this.lexer.lexFragment(lexState, text[i]);
					line.codeDiv.innerHTML = "";
					for (const token of lex.tokens) {
						const span = document.createElement("span");
						span.classList.add("token", token.token.replace(/\./g, "-"));
						span.textContent = token.lexeme;
						line.codeDiv.appendChild(span);
					}
					lexState = lex.next;
					line.nextState = lexState.slice();
				} else {
					line.codeDiv.textContent = text[i];
				}
				line.content = text[i];
			}
		}

		this.lastLexer = this.lexer;
	}

	rerender() {
		this.renderLines(this.textarea.value.split("\n"));
		this.foregroundPre.textContent = this.textarea.value || " ";
		this.textarea.scrollTop = 0;
		this.watch();
	}

	setContent(content: string) {
		this.textarea.value = content;
		this.rerender();
	}

	getContent(): string {
		return this.textarea.value;
	}
}
