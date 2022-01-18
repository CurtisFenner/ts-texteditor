import * as ir from "shiru/ir";
import { ErrorElement, tokenize } from "shiru/lexer";
import * as shiru from "shiru/library";
import { displayType } from "shiru/semantics";
import * as codeeditor from "./codeeditor";

const hello = `package example;

record Cons[#T] {
	var head: #T;
	var tail: List[#T];
	
	fn size(self: Cons[#T]): Int
	ensures 0 < return {
		assert self.tail is cons implies 0 < self.tail.size();
		assert 0 < self.tail.size() implies 0 < 1 + self.tail.size();
		return 1 + self.tail.size();	
	}
}

enum List[#T] {
	var nil: Unit;
	var cons: Cons[#T];
	
	fn size(self: List[#T]): Int
	ensures self is cons implies 0 < return
	ensures self is nil implies 0 == return {
		if 	self is nil {
			return 0;
		}
		return self.cons.size();
	}
}

record Main {
}
`;

const output = document.getElementById("out-alpha") as HTMLPreElement;

const annotations: HTMLDivElement[] = [];

/// Render an error message within the editor.
function renderError(doc: shiru.TextDocument, error: { message: ErrorElement[] }) {
	let firstLocation = true;
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

			let colors = {
				bg: "#FDD",
				under: "#F88",
			};

			if (!firstLocation) {
				colors = {
					bg: "#CDF",
					under: "#9AF",
				};
			}

			annotations.push(editor.addAnnotation(message.offset, message.offset + message.length, colors));
			firstLocation = false;
		}
	}
	output.appendChild(document.createElement("br"));
}

function addTypeSpan(def: ir.VariableDefinition[]) {
	const fromOffset = def[0].location.offset;
	const toOffset = fromOffset + def[0].location.length;
	const annotation = editor.addAnnotation(fromOffset, toOffset, {
		bg: "transparent",
		under: "transparent",
		className: "tall",
	});
	annotations.push(annotation);

	for (const sub of [...annotation.getElementsByTagName("div")]) {
		const text = document.createElement("span");
		text.className = "label";
		text.textContent = def.map(x => displayType(x.type)).join(", ");
		sub.appendChild(text);
		break;
	}
}

interface Err {
	message: ErrorElement[],
}

function shiruPipeline(source: shiru.SourceFile): { program?: ir.Program, problems: Err[], } {
	const parse = shiru.parseSource(source);
	if ("message" in parse) {
		return {
			problems: [parse],
		};
	}
	const program = shiru.compileASTs({ parse });
	if ("message" in program) {
		return {
			problems: [program],
		};
	}
	const verify = shiru.verifyProgram(program);
	if ("message" in verify) {
		return {
			program,
			problems: [verify],
		};
	} else if (verify.length !== 0) {
		return {
			program,
			problems: verify.map(shiru.formatVerificationFailure),
		};
	}
	return { program, problems: [] };
}

function recompile() {
	const sourceFile: shiru.SourceFile = {
		path: "text-alpha",
		content: editor.textarea.value,
	};
	const doc = new shiru.TextDocument("editor", sourceFile.content);

	const beforeCompiling = Date.now();
	const response = shiruPipeline(sourceFile);
	const afterCompiling = Date.now();
	const elapsedCompiling = afterCompiling - beforeCompiling;

	for (const annotation of annotations.splice(0)) {
		editor.clearAnnotation(annotation);
	}

	output.innerHTML = "";
	for (const problem of response.problems) {
		renderError(doc, problem);
	}
	output.appendChild(document.createTextNode("Compiled in " + elapsedCompiling.toFixed(0) + "ms"));

	if (response.program !== undefined) {
		const ds = findAllVariableDefinitions(response.program);
		for (const d of ds) {
			addTypeSpan(d);
		}
	}
}

function findOp(op: ir.Op, out: ir.VariableDefinition[][]) {
	if (op.tag === "op-branch") {
		findOps(op.trueBranch, out);
		findOps(op.falseBranch, out);
		for (const phi of op.destinations) {
			// This is needed for logical operators; regular `if` statements
			// will not have locations.
			out.push([phi.destination]);
		}
	} else if (op.tag === "op-const") {
		out.push([op.destination]);
	} else if (op.tag === "op-copy") {
		out.push(op.copies.map(x => x.destination));
	} else if (op.tag === "op-dynamic-call") {
		out.push(op.destinations);
	} else if (op.tag === "op-field") {
		out.push([op.destination]);
	} else if (op.tag === "op-foreign") {
		out.push(op.destinations);
	} else if (op.tag === "op-new-record") {
		out.push([op.destination]);
	} else if (op.tag === "op-proof") {
		findOps(op.body, out);
	} else if (op.tag === "op-return") {
		// Do nothing
	} else if (op.tag === "op-static-call") {
		out.push(op.destinations);
	} else if (op.tag === "op-unreachable") {
		// Do nothing
	} else if (op.tag === "op-proof-eq") {
		out.push([op.destination]);
	} else if (op.tag === "op-is-variant") {
		out.push([op.destination]);
	} else if (op.tag === "op-new-enum") {
		out.push([op.destination]);
	} else if (op.tag === "op-variant") {
		out.push([op.destination]);
	} else {
		const _: never = op;
		throw new Error("findOp: unrecognized tag `" + op["tag"] + "`");
	}
}

function findOps(body: ir.OpBlock, out: ir.VariableDefinition[][]) {
	for (const op of body.ops) {
		findOp(op, out);
	}
}

function findAllVariableDefinitions(program: ir.Program, out: ir.VariableDefinition[][] = []): ir.VariableDefinition[][] {
	for (const fnID in program.functions) {
		const fn = program.functions[fnID];
		for (const pre of fn.signature.preconditions) {
			findOps(pre.block, out);
		}
		for (const post of fn.signature.postconditions) {
			findOps(post.block, out);
		}
		findOps(fn.body, out);
	}

	return out;
}

class WrapLexer implements codeeditor.Lexer {
	lexFragment(initialState: string[], fragment: string): { tokens: { token: string; lexeme: string; }[]; next: string[]; } {
		try {
			const tokenization = tokenize(fragment, "text-alpha");
			let from = 0;
			const out: { token: string, lexeme: string }[] = [];
			for (const token of tokenization) {
				if (from < token.location.offset) {
					out.push({
						token: "space",
						lexeme: fragment.substring(from, token.location.offset),
					});
				}
				out.push({
					token: token.tag,
					lexeme: fragment.substring(token.location.offset, token.location.offset + token.location.length),
				});
				from = token.location.offset + token.location.length;
			}
			return {
				tokens: out,
				next: [],
			};
		} catch (e) {
			return {
				tokens: [{ token: "unknown", lexeme: fragment }],
				next: [],
			};
		}
	}
}

const editor = new codeeditor.Editor(document.getElementById("editor") as HTMLDivElement);
editor.setContent(hello);
editor.setLexer(new WrapLexer());

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

let hovering: null | Element = null;

document.addEventListener("mousemove", e => {
	const points = document.elementsFromPoint(e.clientX, e.clientY);
	let hit = null;
	for (const element of points) {
		if (element.classList.contains("tall")) {
			hit = element;
		}
	}
	if (hit !== hovering) {
		if (hovering !== null) {
			hovering.parentElement!.classList.remove("hovering");
		}
		if (hit !== null) {
			hit.parentElement!.classList.add("hovering");
		}
		hovering = hit;
	}
});
