define("interact/codeeditor", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Editor = void 0;
    function setRangeText(textarea, text, begin, end) {
        // Unfortunately, the standards-track textarea.setRangeText doesn't support
        // undo/redo.
        const active = document.activeElement;
        textarea.focus();
        textarea.setSelectionRange(begin, end);
        document.execCommand("insertText", false, text);
        if (active !== textarea && active !== null) {
            if (active.focus) {
                active.focus();
            }
        }
    }
    function setRangesText(textarea, anchors, 
    // must be non-overlapping and sorted.
    edits) {
        const delta = {};
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
        const updated = {};
        for (const k in anchors) {
            updated[k] = anchors[k] + delta[k];
        }
        return updated;
    }
    /// `findLines` returns the position of the first character of each line that
    /// has some overlap with the selection.
    function findLines(text, begin, end) {
        const out = [];
        const first = text.lastIndexOf("\n", begin - 1);
        out.push(first < 0 ? 0 : first + 1);
        let line = Math.max(0, begin);
        while (true) {
            line = text.indexOf("\n", line);
            if (line < 0) {
                break;
            }
            else if (line < end) {
                out.push(line + 1);
                line = line + 1;
            }
            else {
                break;
            }
        }
        return out;
    }
    function assertEqual(given, expected) {
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
    class Editor {
        constructor(container) {
            this.lexer = null;
            // `lastLexer` is only set by `renderLines`.
            this.lastLexer = null;
            this.renderedLines = [];
            this.watch = () => { };
            this.font = "16px monospace";
            this.lineHeight = "2em"; // "22px";
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
                    }
                    else {
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
                        }
                        else {
                            // Replace the selection with a hard tab.
                            setRangeText(this.textarea, "\t", start, this.textarea.selectionEnd);
                            this.textarea.setSelectionRange(start + 1, start + 1);
                        }
                    }
                    this.rerender();
                    return;
                }
            });
            this.textarea.addEventListener("input", (_e) => {
                const e = _e;
                if (e.inputType === "insertLineBreak") {
                    const start = this.textarea.selectionStart;
                    const end = this.textarea.selectionEnd;
                    let lastNewline = this.textarea.value.lastIndexOf("\n", start - 2);
                    if (lastNewline < 0) {
                        lastNewline = 0;
                    }
                    const space = /[ \t]*/y;
                    space.lastIndex = lastNewline + 1;
                    let [indent] = space.exec(this.textarea.value);
                    const lastBefore = this.textarea.value[start - 2];
                    if (lastBefore === "{") {
                        indent += "\t";
                    }
                    setRangeText(this.textarea, indent, start, end);
                    this.textarea.setSelectionRange(start + indent.length, start + indent.length);
                }
                else {
                    if (e.data === "}") {
                        // Consider a de-indent.
                        const start = this.textarea.selectionStart - 1;
                        console.log("start:", start);
                        let lastNewLine = this.textarea.value.lastIndexOf("\n", start);
                        const preceding = this.textarea.value.substring(lastNewLine + 1, start);
                        console.log("maybe de-dent?", JSON.stringify(preceding));
                        if (preceding.endsWith("\t") && preceding.replace(/[ \t]/g, "") === "") {
                            console.log("try it");
                            setRangeText(this.textarea, e.data, start - 1, start + 1);
                            this.textarea.setSelectionRange(start, start);
                        }
                    }
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
        setLexer(lexer) {
            this.lexer = lexer;
            this.rerender();
        }
        addAnnotation(
        // from: TextPosition,
        // to: TextPosition,
        fromOffset, toOffset, style) {
            var _a;
            const div = document.createElement("div");
            const containerRect = this.backgroundAnnotationsDiv.getBoundingClientRect();
            const textNode = this.foregroundPre.childNodes[0];
            const length = ((_a = textNode === null || textNode === void 0 ? void 0 : textNode.textContent) === null || _a === void 0 ? void 0 : _a.length) || 0;
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
                if (style.className !== undefined) {
                    box.classList.add(style.className);
                }
                div.appendChild(box);
            }
            this.backgroundAnnotationsDiv.appendChild(div);
            return div;
        }
        clearAnnotation(div) {
            this.backgroundAnnotationsDiv.removeChild(div);
        }
        renderLines(text) {
            if (text.length === 0) {
                text = [""];
            }
            for (const removed of this.renderedLines.splice(text.length)) {
                removed.codeDiv.parentElement.removeChild(removed.codeDiv);
                removed.lineDiv.parentElement.removeChild(removed.lineDiv);
            }
            let lexState = [];
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
                    }
                    else {
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
        setContent(content) {
            this.textarea.value = content;
            this.rerender();
        }
        getContent() {
            return this.textarea.value;
        }
    }
    exports.Editor = Editor;
});
define("interact/main", ["require", "exports", "shiru/lexer", "shiru/library", "shiru/semantics", "interact/codeeditor"], function (require, exports, lexer_1, shiru, semantics_1, codeeditor) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
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
    const output = document.getElementById("out-alpha");
    const annotations = [];
    /// Render an error message within the editor.
    function renderError(doc, error) {
        let firstLocation = true;
        for (const message of error.message) {
            if (typeof message === "string") {
                const n = document.createElement("span");
                n.textContent = message;
                output.appendChild(n);
            }
            else {
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
    function addTypeSpan(def) {
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
            text.textContent = def.map(x => (0, semantics_1.displayType)(x.type)).join(", ");
            sub.appendChild(text);
            break;
        }
    }
    function shiruPipeline(source) {
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
        }
        else if (verify.length !== 0) {
            return {
                program,
                problems: verify.map(shiru.formatVerificationFailure),
            };
        }
        return { program, problems: [] };
    }
    function recompile() {
        const sourceFile = {
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
    function findOp(op, out) {
        if (op.tag === "op-branch") {
            findOps(op.trueBranch, out);
            findOps(op.falseBranch, out);
            for (const phi of op.destinations) {
                // This is needed for logical operators; regular `if` statements
                // will not have locations.
                out.push([phi.destination]);
            }
        }
        else if (op.tag === "op-const") {
            out.push([op.destination]);
        }
        else if (op.tag === "op-copy") {
            out.push(op.copies.map(x => x.destination));
        }
        else if (op.tag === "op-dynamic-call") {
            out.push(op.destinations);
        }
        else if (op.tag === "op-field") {
            out.push([op.destination]);
        }
        else if (op.tag === "op-foreign") {
            out.push(op.destinations);
        }
        else if (op.tag === "op-new-record") {
            out.push([op.destination]);
        }
        else if (op.tag === "op-proof") {
            findOps(op.body, out);
        }
        else if (op.tag === "op-return") {
            // Do nothing
        }
        else if (op.tag === "op-static-call") {
            out.push(op.destinations);
        }
        else if (op.tag === "op-unreachable") {
            // Do nothing
        }
        else if (op.tag === "op-proof-eq") {
            out.push([op.destination]);
        }
        else if (op.tag === "op-is-variant") {
            out.push([op.destination]);
        }
        else if (op.tag === "op-new-enum") {
            out.push([op.destination]);
        }
        else if (op.tag === "op-variant") {
            out.push([op.destination]);
        }
        else {
            const _ = op;
            throw new Error("findOp: unrecognized tag `" + op["tag"] + "`");
        }
    }
    function findOps(body, out) {
        for (const op of body.ops) {
            findOp(op, out);
        }
    }
    function findAllVariableDefinitions(program, out = []) {
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
    class WrapLexer {
        lexFragment(initialState, fragment) {
            try {
                const tokenization = (0, lexer_1.tokenize)(fragment, "text-alpha");
                let from = 0;
                const out = [];
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
            }
            catch (e) {
                return {
                    tokens: [{ token: "unknown", lexeme: fragment }],
                    next: [],
                };
            }
        }
    }
    const editor = new codeeditor.Editor(document.getElementById("editor"));
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
    };
    editor.rerender();
    let hovering = null;
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
                hovering.parentElement.classList.remove("hovering");
            }
            if (hit !== null) {
                hit.parentElement.classList.add("hovering");
            }
            hovering = hit;
        }
    });
});
//# sourceMappingURL=interact-amd.js.map