import { ErrorElement, LexError } from "shiru/lexer";
import * as shiru from "shiru/library";
import * as codeeditor from "./codeeditor";

const hello = `package example;

record Main {
	fn main(): Int {
		return 0;
	}
}
`;

const output = document.getElementById("out-alpha") as HTMLPreElement;

const annotations: HTMLDivElement[] = [];

function renderError(doc: shiru.TextDocument, error: { message: ErrorElement[] }) {
	for (const message of error.message) {
		if (typeof message === "string") {
			const n = document.createElement("span");
			n.textContent = message;
			output.appendChild(n);
		} else {
			const m = document.createElement("span");
			m.style.fontWeight = "bold";
			m.textContent = " " + doc.getLocus(message);

			output.appendChild(m);
			output.appendChild(document.createElement("br"));
			const from = doc.locate(message.offset);
			const to = doc.locate(message.offset + message.length);
			annotations.push(editor.addAnnotation(message.offset, message.offset + message.length, {
				bg: "#FDD",
				under: "#F88",
			}));
		}
	}
}

function shiruPipeline(source: shiru.SourceFile) {
	const parse = shiru.parseSource(source);
	if ("message" in parse) {
		return parse;
	}
	const program = shiru.compileASTs({ parse });
	if ("message" in program) {
		return program;
	}
	const result = shiru.verifyProgram(program);
	if ("message" in result) {
		return result;
	}
	return result;
}

function recompile() {
	const sourceFile: shiru.SourceFile = {
		path: "text-alpha",
		content: editor.textarea.value,
	};
	const doc = new shiru.TextDocument("editor", sourceFile.content);

	const response = shiruPipeline(sourceFile);

	for (const annotation of annotations.splice(0)) {
		editor.clearAnnotation(annotation);
	}

	output.innerHTML = "";
	if ("message" in response) {
		renderError(doc, response);
	} else {
		output.textContent = JSON.stringify(response);
	}
}

const keywordRegex = new RegExp("(?:" + [
	"package",
	"import",
	"record",
	"fn",
	"return",
	"if",
	"else",
	"ensures",
	"requires",
	"forall",
	"is",
].join("|") + ")\\b");

const shiruGrammar: codeeditor.MonarchGrammar = {
	defaultToken: "invalid",

	tokenizer: {
		code: [
			{ regex: /[ \t\r]+/, action: { token: "space" } },
			{ regex: keywordRegex, action: { token: "keyword" } },
			{ regex: /[a-z_][a-zA-Z_0-9]*/, action: { token: "identifier" } },
			{ regex: /[A-Z][a-zA-Z_0-9]*/, action: { token: "identifier.type" } },
			{ regex: /#[a-zA-Z_0-9]+/, action: { token: "identifier.type" } },
			{ regex: /\/\/.*/, action: { token: "comment.line" } },
			{ regex: /[0-9]+/, action: { token: "constant" } },
			{ regex: /"/, action: { token: "string", next: "string" } },
			{ regex: /[-+*|,:.<>=;^\[\]()]+/, action: { token: "punctuation" } },
		],
		string: [
			{ regex: /[^\\"]*"/, action: { token: "string", next: "@pop" } },
			{ regex: /\\[rnt\\"]/, action: { token: "string.escape" } },
			{ regex: /[^"\\]+/, action: { token: "string" } },
		],
	},
};

const editor = new codeeditor.Editor(document.getElementById("editor") as HTMLDivElement);
editor.setContent(hello);
editor.setGrammar(shiruGrammar);

let watchFlag = 0;
editor.watch = () => {
	// Debounce recompiling to once every 10 milliseconds.
	watchFlag += 1;
	const myFlag = watchFlag;
	setTimeout(() => {
		if (watchFlag == myFlag) {
			recompile();
		}
	}, 10);
}
editor.rerender();

(window as any).shiruGrammar = shiruGrammar;
(window as any).lexer = new codeeditor.Lexer(shiruGrammar);
