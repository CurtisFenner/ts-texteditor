define("shiru/ir", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.constraintSubstitute = exports.typeRecursiveSubstitute = exports.typeSubstitute = exports.typeArgumentsMap = exports.unifyTypes = exports.equalTypes = exports.opTerminates = exports.T_ANY = exports.T_UNIT = exports.T_BYTES = exports.T_BOOLEAN = exports.T_INT = exports.locationsSpan = exports.locationSpan = exports.NONE = void 0;
    exports.NONE = {
        fileID: "unknown",
        offset: 0,
        length: 0,
    };
    function locationSpan(from, to) {
        return {
            fileID: from.fileID,
            offset: from.offset,
            length: to.offset + to.length - from.offset,
        };
    }
    exports.locationSpan = locationSpan;
    function locationsSpan(set) {
        const smallest = Math.min(...set.map(x => x.location.offset));
        const largest = Math.max(...set.map(x => x.location.offset + x.location.length));
        return {
            fileID: set[0].location.fileID,
            offset: smallest,
            length: largest - smallest,
        };
    }
    exports.locationsSpan = locationsSpan;
    ;
    exports.T_INT = { tag: "type-primitive", primitive: "Int" };
    exports.T_BOOLEAN = { tag: "type-primitive", primitive: "Boolean" };
    exports.T_BYTES = { tag: "type-primitive", primitive: "Bytes" };
    exports.T_UNIT = { tag: "type-primitive", primitive: "Unit" };
    exports.T_ANY = { tag: "type-any" };
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    ;
    function opTerminates(op) {
        return op.tag === "op-return" || op.tag === "op-unreachable";
    }
    exports.opTerminates = opTerminates;
    function equalTypes(pattern, passed) {
        if (pattern.tag === "type-variable") {
            // TODO: Switch to unification?
            return passed.tag === "type-variable" && passed.id === pattern.id;
        }
        else if (pattern.tag === "type-compound" && passed.tag === "type-compound") {
            if (pattern.base !== passed.base) {
                return false;
            }
            for (let i = 0; i < pattern.type_arguments.length; i++) {
                if (!equalTypes(pattern.type_arguments[i], passed.type_arguments[i])) {
                    return false;
                }
            }
            return true;
        }
        else if (pattern.tag === "type-primitive" && passed.tag === "type-primitive") {
            return pattern.primitive === passed.primitive;
        }
        return false;
    }
    exports.equalTypes = equalTypes;
    function typeContainsVariable(t, v, assignments) {
        if (t.tag === "type-compound") {
            for (const arg of t.type_arguments) {
                if (typeContainsVariable(arg, v, assignments)) {
                    return true;
                }
            }
            return false;
        }
        else if (t.tag === "type-primitive") {
            return false;
        }
        else if (t.tag === "type-variable") {
            if (t.id === v) {
                return true;
            }
            const assigned = assignments.get(t.id);
            if (assigned !== null && assigned !== undefined) {
                return typeContainsVariable(assigned, v, assignments);
            }
            return false;
        }
        else if (t.tag === "type-any") {
            return false;
        }
        const _ = t;
        throw new Error("typeContainsVariable: unreachable `" + t["tag"] + "`");
    }
    function unifyTypeArrayHelper(lefts, rights, assignments) {
        for (let i = 0; i < lefts.length; i++) {
            if (unifyTypePairHelper(lefts[i], rights[i], assignments) === null) {
                return null;
            }
        }
        return assignments;
    }
    function unifyTypePairHelper(left, right, assignments) {
        if (left.tag === "type-variable") {
            const mapping = assignments.get(left.id);
            if (mapping === null) {
                if (typeContainsVariable(right, left.id, assignments)) {
                    return null;
                }
                assignments.set(left.id, right);
                return assignments;
            }
            else if (mapping !== undefined) {
                return unifyTypePairHelper(mapping, right, assignments);
            }
        }
        if (right.tag === "type-variable") {
            const mapping = assignments.get(right.id);
            if (mapping === null) {
                if (typeContainsVariable(left, right.id, assignments)) {
                    return null;
                }
                assignments.set(right.id, left);
                return assignments;
            }
            else if (mapping !== undefined) {
                return unifyTypePairHelper(left, mapping, assignments);
            }
        }
        if (left.tag === "type-compound") {
            if (right.tag !== "type-compound") {
                return null;
            }
            else if (left.base !== right.base) {
                return null;
            }
            return unifyTypeArrayHelper(left.type_arguments, right.type_arguments, assignments);
        }
        else if (left.tag === "type-primitive") {
            if (right.tag !== "type-primitive") {
                return null;
            }
            return left.primitive !== right.primitive ? null : assignments;
        }
        else if (left.tag === "type-variable") {
            if (right.tag !== "type-variable") {
                return null;
            }
            return left.id !== right.id ? null : assignments;
        }
        else if (left.tag === "type-any") {
            if (right.tag !== "type-any") {
                return null;
            }
            return assignments;
        }
        const _ = left;
        throw new Error("unifyTypesHelper: unreachable `" + left["tag"] + "`");
    }
    /// RETURNS the most-general unification of the two types.
    function unifyTypes(leftVars, lefts, rightVars, rights) {
        const assignments = new Map();
        // Rename variables so that they are distinct.
        const leftRenaming = new Map();
        for (const leftVar of leftVars) {
            const id = "unify_" + leftVar + Math.random();
            assignments.set(id, null);
            leftRenaming.set(leftVar, { tag: "type-variable", id });
        }
        const rightRenaming = new Map();
        for (const rightVar of rightVars) {
            const id = "unify_" + rightVar + Math.random();
            assignments.set(id, null);
            rightRenaming.set(rightVar, { tag: "type-variable", id });
        }
        lefts = lefts.map(t => typeSubstitute(t, leftRenaming));
        rights = rights.map(t => typeSubstitute(t, rightRenaming));
        const out = unifyTypeArrayHelper(lefts, rights, assignments);
        if (out === null) {
            return null;
        }
        return {
            leftRenaming,
            rightRenaming,
            instantiations: assignments,
        };
    }
    exports.unifyTypes = unifyTypes;
    function typeArgumentsMap(parameters, args) {
        if (parameters.length !== args.length) {
            throw new Error("typeArgumentsMap: length mismatch");
        }
        const map = new Map();
        for (let i = 0; i < parameters.length; i++) {
            map.set(parameters[i], args[i]);
        }
        return map;
    }
    exports.typeArgumentsMap = typeArgumentsMap;
    function typeSubstitute(t, map) {
        if (t.tag === "type-compound") {
            return {
                tag: t.tag,
                base: t.base,
                type_arguments: t.type_arguments.map(a => typeSubstitute(a, map)),
            };
        }
        else if (t.tag === "type-primitive") {
            return t;
        }
        else if (t.tag === "type-variable") {
            const existing = map.get(t.id);
            if (existing !== undefined) {
                return existing;
            }
            return t;
        }
        else if (t.tag === "type-any") {
            return t;
        }
        const _ = t;
        throw new Error(`unhandled type tag \`${t}\`.`);
    }
    exports.typeSubstitute = typeSubstitute;
    function typeRecursiveSubstitute(t, map) {
        if (t.tag === "type-variable") {
            const e = map.get(t.id);
            if (e === undefined) {
                return t;
            }
            else if (e === null) {
                return t;
            }
            else {
                const r = typeRecursiveSubstitute(e, map);
                map.set(t.id, r);
                return r;
            }
        }
        else if (t.tag === "type-compound") {
            return {
                tag: t.tag,
                base: t.base,
                type_arguments: t.type_arguments.map(a => typeRecursiveSubstitute(a, map)),
            };
        }
        else if (t.tag === "type-primitive") {
            return t;
        }
        else if (t.tag === "type-any") {
            return t;
        }
        const _ = t;
        throw new Error(`unhandled type tag \`${t["tag"]}\`.`);
    }
    exports.typeRecursiveSubstitute = typeRecursiveSubstitute;
    function constraintSubstitute(c, map) {
        return {
            interface: c.interface,
            subjects: c.subjects.map(x => typeSubstitute(x, map)),
        };
    }
    exports.constraintSubstitute = constraintSubstitute;
});
define("shiru/lexer", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.LexError = exports.tokenize = exports.PUNCTUATION = exports.OPERATORS = exports.KEYWORDS = exports.TYPE_KEYWORDS = exports.RESERVED = void 0;
    ;
    ;
    ;
    ;
    ;
    // These keywords are reserved, but unused. Using them in a program is a syntax
    // error.
    exports.RESERVED = {
        "Never": true,
        "async": true,
        "await": true,
        "break": true,
        "enum": true,
        "for": true,
        "function": true,
        "of": true,
        "record": true,
        "resource": true,
        "resume": true,
        "service": true,
        "test": true,
        "type": true,
        "until": true,
        "while": true,
        "yield": true,
    };
    exports.TYPE_KEYWORDS = {
        "Any": true,
        "Unit": true,
        "Boolean": true,
        "Int": true,
        "String": true,
        "This": true,
    };
    exports.KEYWORDS = {
        "and": true,
        "any": true,
        "assert": true,
        "case": true,
        "class": true,
        "do": true,
        "else": true,
        "elseif": true,
        "ensures": true,
        "enum": true,
        "false": true,
        "fn": true,
        "forall": true,
        "foreign": true,
        "if": true,
        "impl": true,
        "import": true,
        "implies": true,
        "interface": true,
        "is": true,
        "isa": true,
        "match": true,
        "method": true,
        "new": true,
        "not": true,
        "or": true,
        "package": true,
        "proof": true,
        "record": true,
        "requires": true,
        "return": true,
        "this": true,
        "true": true,
        "union": true,
        "unit": true,
        "unreachable": true,
        "var": true,
        "when": true,
    };
    exports.OPERATORS = {
        // N.B.: Iteration order determines 'priority', so longer sequences MUST
        // come first.
        // N.B.: Sequences must NOT contain `//`, so that they remain comments.
        "==": true,
        "!=": true,
        "<=": true,
        ">=": true,
        "++": true,
        "+": true,
        "-": true,
        "/": true,
        "*": true,
        "%": true,
        "<": true,
        ">": true,
    };
    exports.PUNCTUATION = {
        "=": true,
        "(": true,
        ")": true,
        "{": true,
        "}": true,
        "[": true,
        "]": true,
        "|": true,
        ".": true,
        ",": true,
        ":": true,
        ";": true,
    };
    /// THROWS LexError
    function tokenize(blob, fileID) {
        let tokens = [];
        let from = 0;
        while (from < blob.length) {
            const result = parseToken(blob, from, fileID);
            if (result.token !== null) {
                tokens.push(result.token);
            }
            from += result.consumed;
        }
        tokens.push({
            tag: "eof",
            location: { fileID, offset: blob.length, length: 0 },
        });
        return tokens;
    }
    exports.tokenize = tokenize;
    /// THROWS LexError
    function parseToken(blob, from, fileID) {
        const head = blob[from];
        if (head === " " || head === "\n" || head == "\t" || head == "\r") {
            return { token: null, consumed: 1 };
        }
        else if ("a" <= head && head <= "z") {
            // Parse an identifier or a keyword.
            const breaks = findWordBreak(blob, from, fileID);
            const location = {
                fileID,
                offset: from,
                length: breaks - from,
            };
            const word = blob.substring(from, breaks);
            if (word in exports.KEYWORDS) {
                return {
                    token: {
                        tag: "keyword",
                        keyword: word,
                        location,
                    },
                    consumed: breaks - from,
                };
            }
            else if (word in exports.RESERVED) {
                throw new LexError([
                    "Found the reserved term `" + word + "` at",
                    location,
                ]);
            }
            else {
                return {
                    token: {
                        tag: "iden",
                        name: word,
                        location,
                    },
                    consumed: breaks - from,
                };
            }
        }
        else if ("A" <= head && head <= "Z") {
            // Parse a type-identifier or a type keyword.
            const breaks = findWordBreak(blob, from, fileID);
            const location = {
                fileID,
                offset: from,
                length: breaks - from,
            };
            const word = blob.substring(from, breaks);
            if (word in exports.TYPE_KEYWORDS) {
                return {
                    token: {
                        tag: "type-keyword",
                        keyword: word,
                        location,
                    },
                    consumed: breaks - from,
                };
            }
            else if (word in exports.RESERVED) {
                throw new LexError([
                    "Found the reserved term `" + word + "` at",
                    location,
                ]);
            }
            else {
                return {
                    token: {
                        tag: "type-iden",
                        name: word,
                        location,
                    },
                    consumed: breaks - from,
                };
            }
        }
        else if (head === "/" && blob[from + 1] === "/") {
            // Parse a line comment.
            let lineBreak = blob.indexOf("\n", from);
            if (lineBreak < 0) {
                lineBreak = blob.length;
            }
            return { token: null, consumed: lineBreak - from };
        }
        else if ("0" <= head && head <= "9") {
            // Parse a number literal.
            const breaks = findWordBreak(blob, from, fileID);
            const location = {
                fileID, offset: from, length: breaks - from,
            };
            const slice = blob.substr(from, breaks - from);
            if (!/^[0-9]+$/.test(blob.substr(from, breaks - from)) || slice.length > 10) {
                throw new LexError([
                    "Found a malformed integer literal at",
                    location,
                ]);
            }
            return {
                token: {
                    tag: "number-literal",
                    int: slice,
                    location,
                },
                consumed: breaks - from,
            };
        }
        else if (head === "#") {
            // Parse a type variable or keyword.
            const first = blob[from + 1];
            if (!("A" <= first && first <= "Z")) {
                const location = {
                    fileID,
                    offset: from,
                    length: 2,
                };
                throw new LexError([
                    "Expected a capital letter after `#` at",
                    location
                ]);
            }
            const breaks = findWordBreak(blob, from + 1, fileID);
            const location = {
                fileID,
                offset: from,
                length: breaks - from,
            };
            return {
                token: {
                    tag: "type-var",
                    name: blob.substring(from + 1, breaks),
                    location,
                },
                consumed: breaks - from,
            };
        }
        else if (head === "\"") {
            // Parse a string literal.
            let content = "";
            let escaped = false;
            let end = null;
            for (let i = from + 1; i < blob.length; i++) {
                const at = blob[i];
                if (at === "\n") {
                    throw new LexError([
                        "Found string literal interrupted by newline at",
                        {
                            fileID,
                            offset: from,
                            length: i - from,
                        },
                    ]);
                }
                else if (at === "\r") {
                    throw new LexError([
                        "Found string literal interrupted by carriage return at",
                        {
                            fileID,
                            offset: from,
                            length: i - from,
                        },
                    ]);
                }
                else if (escaped) {
                    if (at === "n") {
                        content += "\n";
                    }
                    else if (at === "r") {
                        content += "\r";
                    }
                    else if (at === "t") {
                        content += "\t";
                    }
                    else if (at === "\"") {
                        content += "\"";
                    }
                    else if (at === "\\") {
                        content += "\\";
                    }
                    else {
                        throw new LexError([
                            "Found invalid escape in string literal at",
                            {
                                fileID,
                                offset: i - 1,
                                length: 2,
                            },
                        ]);
                    }
                    escaped = false;
                    continue;
                }
                else if (at === "\\") {
                    escaped = true;
                }
                else if (at === "\"") {
                    end = i + 1;
                    break;
                }
                else {
                    content += at;
                }
            }
            if (end === null) {
                throw new LexError([
                    "Found unfinished string literal at",
                    {
                        fileID,
                        offset: from,
                        length: blob.length - from,
                    },
                ]);
            }
            return {
                token: {
                    tag: "string-literal",
                    value: content,
                    location: {
                        fileID,
                        offset: from,
                        length: end - from,
                    },
                },
                consumed: end - from,
            };
        }
        else {
            // Attempt to parse punctuations.
            for (let k = Math.min(blob.length - from, 2); k >= 1; k--) {
                const lexeme = blob.substr(from, k);
                if (lexeme in exports.PUNCTUATION) {
                    return {
                        token: {
                            tag: "punctuation",
                            symbol: lexeme,
                            location: {
                                fileID,
                                offset: from,
                                length: k,
                            },
                        },
                        consumed: k,
                    };
                }
                else if (lexeme in exports.OPERATORS) {
                    return {
                        token: {
                            tag: "operator",
                            operator: lexeme,
                            location: {
                                fileID,
                                offset: from,
                                length: k,
                            },
                        },
                        consumed: k,
                    };
                }
            }
        }
        const location = {
            fileID,
            offset: from,
            length: 1,
        };
        throw new LexError(["Found an unexpected symbol at", location]);
    }
    /// RETURNS the first index after from which is not a letter/number/underscore
    /// that is valid within Shiru identifiers.
    function findWordBreak(blob, from, fileID) {
        let end = blob.length;
        for (let i = from + 1; i < blob.length; i++) {
            const c = blob[i];
            const lower = "a" <= c && c <= "z";
            const upper = "A" <= c && c <= "Z";
            const digit = "0" <= c && c <= "9";
            const under = c === "_";
            if (!lower && !upper && !digit && !under) {
                end = i;
                break;
            }
        }
        const doubleUnder = blob.substring(from, end).indexOf("__", from);
        if (doubleUnder >= 0) {
            throw new LexError([
                "Found invalid double underscore in identifier at",
                {
                    fileID,
                    offset: from + doubleUnder,
                    length: 2,
                },
            ]);
        }
        return end;
    }
    class LexError {
        constructor(message) {
            this.message = message;
        }
        toString() {
            return JSON.stringify(this.message);
        }
    }
    exports.LexError = LexError;
});
define("shiru/diagnostics", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.ProofMemberUsedOutsideProofContextErr = exports.ImplMayNotHavePreconditionErr = exports.ImplMissingInterfaceMember = exports.ImplMemberDoesNotExistOnInterface = exports.OverlappingImplsErr = exports.TypeParameterCountMismatchErr = exports.EnumLiteralMissingVariantErr = exports.MultipleVariantsErr = exports.UninitializedFieldErr = exports.NoSuchVariantErr = exports.NoSuchFieldErr = exports.MemberRepeatedInCompoundLiteralErr = exports.NonCompoundInRecordLiteralErr = exports.TypesDontSatisfyConstraintErr = exports.ReturnExpressionUsedOutsideEnsuresErr = exports.RecursivePreconditionErr = exports.OperationRequiresParenthesizationErr = exports.NoSuchFnErr = exports.CallOnNonCompoundErr = exports.OperatorTypeMismatchErr = exports.TypeDoesNotProvideOperatorErr = exports.BooleanTypeExpectedErr = exports.MethodAccessOnNonCompoundErr = exports.VariantTestOnNonEnumErr = exports.FieldAccessOnNonCompoundErr = exports.ImplReturnTypeMismatch = exports.ImplParameterTypeMismatch = exports.ImplReturnCountMismatch = exports.ImplParameterCountMismatch = exports.TypeMismatchErr = exports.ValueCountMismatchErr = exports.MultiExpressionGroupedErr = exports.VariableNotDefinedErr = exports.VariableRedefinedErr = exports.TypeUsedAsConstraintErr = exports.NonTypeEntityUsedAsTypeErr = exports.NoSuchTypeVariableErr = exports.TypeVariableRedefinedErr = exports.MemberRedefinedErr = exports.InvalidThisTypeErr = exports.NamespaceAlreadyDefinedErr = exports.NoSuchEntityErr = exports.NoSuchPackageErr = exports.EntityRedefinedErr = exports.SemanticError = void 0;
    function pluralize(n, singular, plural = singular + "s") {
        if (n === 1) {
            return singular;
        }
        return plural;
    }
    function nth(n) {
        if (n % 100 == 11) {
            return n + "th";
        }
        else if (n % 100 == 12) {
            return n + "th";
        }
        else if (n % 100 == 13) {
            return n + "th";
        }
        else if (n % 10 == 1) {
            return n + "st";
        }
        else if (n % 10 == 2) {
            return n + "nd";
        }
        else if (n % 10 == 3) {
            return n + "rd";
        }
        return n + "th";
    }
    class SemanticError {
        constructor(message) {
            this.message = message;
        }
        toString() {
            return JSON.stringify(this.message);
        }
    }
    exports.SemanticError = SemanticError;
    class EntityRedefinedErr extends SemanticError {
        constructor(args) {
            super([
                "Entity `" + args.name + "` was defined for a second time at",
                args.secondBinding,
                "The first definition was at",
                args.firstBinding,
            ]);
        }
    }
    exports.EntityRedefinedErr = EntityRedefinedErr;
    class NoSuchPackageErr extends SemanticError {
        constructor(args) {
            super([
                "Package `" + args.packageName + "` has not been defined, but it was reference at",
                args.reference,
            ]);
        }
    }
    exports.NoSuchPackageErr = NoSuchPackageErr;
    class NoSuchEntityErr extends SemanticError {
        constructor(args) {
            super([
                "Entity `" + args.entityName + "` has not been defined, but it was referenced at",
                args.reference,
            ]);
        }
    }
    exports.NoSuchEntityErr = NoSuchEntityErr;
    class NamespaceAlreadyDefinedErr extends SemanticError {
        constructor(args) {
            super([
                "The namespace `" + args.namespace + "` was defined for a second time at",
                args.secondBinding,
                "The first definition was at",
                args.firstBinding,
            ]);
        }
    }
    exports.NamespaceAlreadyDefinedErr = NamespaceAlreadyDefinedErr;
    class InvalidThisTypeErr extends SemanticError {
        constructor(args) {
            super([
                "The keyword `This` cannot be used at", args.referenced
            ]);
        }
    }
    exports.InvalidThisTypeErr = InvalidThisTypeErr;
    class MemberRedefinedErr extends SemanticError {
        constructor(args) {
            super([
                "The member `" + args.memberName + "` was defined for a second time at",
                args.secondBinding,
                "The first definition of `" + args.memberName + "` was at",
                args.firstBinding,
            ]);
        }
    }
    exports.MemberRedefinedErr = MemberRedefinedErr;
    class TypeVariableRedefinedErr extends SemanticError {
        constructor(args) {
            super([
                "The type variable `#" + args.typeVariableName + "` was defined for a second time at",
                args.secondBinding,
                "The first definition was at",
                args.firstBinding,
            ]);
        }
    }
    exports.TypeVariableRedefinedErr = TypeVariableRedefinedErr;
    class NoSuchTypeVariableErr extends SemanticError {
        constructor(args) {
            super([
                "Type variable `#" + args.typeVariableName + "` has not been defined, but it was referenced at",
                args.location,
            ]);
        }
    }
    exports.NoSuchTypeVariableErr = NoSuchTypeVariableErr;
    class NonTypeEntityUsedAsTypeErr extends SemanticError {
        constructor(args) {
            super([
                "The entity `" + args.entity + "` cannot be used a type as was attempted at",
                args.useLocation,
                "because it was defined as a " + args.entityTag + " at",
                args.entityBinding,
            ]);
        }
    }
    exports.NonTypeEntityUsedAsTypeErr = NonTypeEntityUsedAsTypeErr;
    class TypeUsedAsConstraintErr extends SemanticError {
        constructor(args) {
            super([
                args.name === undefined
                    ? "A " + args.kind + " type "
                    : "The " + args.kind + " type `" + args.name + "` ",
                "cannot be used as a constraint like it is at",
                args.typeLocation,
            ]);
        }
    }
    exports.TypeUsedAsConstraintErr = TypeUsedAsConstraintErr;
    class VariableRedefinedErr extends SemanticError {
        constructor(args) {
            super([
                "The variable `" + args.name + "` was defined for a second time at",
                args.secondLocation,
                "The first definition was at",
                args.firstLocation,
            ]);
        }
    }
    exports.VariableRedefinedErr = VariableRedefinedErr;
    class VariableNotDefinedErr extends SemanticError {
        constructor(args) {
            super([
                "The variable `" + args.name + "` has not been defined, but it was referenced at",
                args.referencedAt,
            ]);
        }
    }
    exports.VariableNotDefinedErr = VariableNotDefinedErr;
    class MultiExpressionGroupedErr extends SemanticError {
        constructor(args) {
            const by = {
                parens: "parenthesization",
                field: "a field access",
                method: "a method access",
                if: "an `if` condition",
                is: "an `is` test",
                op: "a `" + args.op + "` operation",
                contract: "a `" + args.op + "` contract",
                "field-init": "a field initialization",
            };
            super([
                "An expression has " + args.valueCount + " values and so cannot be grouped ",
                "by " + by[args.grouping] + " at",
                args.location,
            ]);
        }
    }
    exports.MultiExpressionGroupedErr = MultiExpressionGroupedErr;
    class ValueCountMismatchErr extends SemanticError {
        constructor(args) {
            super([
                "An expression has " + args.actualCount + " " + pluralize(args.actualCount, "value") + " at",
                args.actualLocation,
                "but " + args.expectedCount + " " + pluralize(args.expectedCount, "value was", "values were") + " expected at",
                args.expectedLocation,
            ]);
        }
    }
    exports.ValueCountMismatchErr = ValueCountMismatchErr;
    class TypeMismatchErr extends SemanticError {
        constructor(args) {
            const value = args.givenIndex && args.givenIndex.count !== 1
                ? `${nth(args.givenIndex.count + 1)} value (of ${args.givenIndex.count})`
                : "value";
            super([
                "A " + value + " with type `" + args.givenType + "` at",
                args.givenLocation,
                "cannot be converted to the type `" + args.expectedType + "` as expected at",
                args.expectedLocation,
            ]);
        }
    }
    exports.TypeMismatchErr = TypeMismatchErr;
    class ImplParameterCountMismatch extends SemanticError {
        constructor(args) {
            super([
                "The impl member `" + args.member + "` has ",
                args.implCount + " " + pluralize(args.implCount, "parameter") + " at",
                args.implLocation,
                "However, `" + args.impl + "` needs " + args.interfaceCount + ", as defined at",
                args.interfaceLocation,
            ]);
        }
    }
    exports.ImplParameterCountMismatch = ImplParameterCountMismatch;
    class ImplReturnCountMismatch extends SemanticError {
        constructor(args) {
            super([
                "The impl member `" + args.member + "` has ",
                args.implCount + " " + pluralize(args.implCount, "return") + " at",
                args.implLocation,
                "However, `" + args.impl + "` needs " + args.interfaceCount + ", as defined at",
                args.interfaceLocation,
            ]);
        }
    }
    exports.ImplReturnCountMismatch = ImplReturnCountMismatch;
    class ImplParameterTypeMismatch extends SemanticError {
        constructor(args) {
            super([
                "The type `" + args.implType + "` ",
                "of the " + nth(args.parameterIndex0 + 1) + " parameter ",
                "of the impl member `" + args.memberName + "` at",
                args.implLocation,
                "does not match the type `" + args.interfaceType + "` ",
                "as required of a `" + args.impl + "` by the interface member defined at",
                args.interfaceLocation,
            ]);
        }
    }
    exports.ImplParameterTypeMismatch = ImplParameterTypeMismatch;
    class ImplReturnTypeMismatch extends SemanticError {
        constructor(args) {
            super([
                "The type `" + args.implType + "` ",
                "of the " + nth(args.returnIndex0 + 1) + " return ",
                "of the impl member `" + args.memberName + "` at",
                args.implLocation,
                "does not match the required type `" + args.interfaceType + "` ",
                "as required of a `" + args.impl + "` by the interface member defined at",
                args.interfaceLocation,
            ]);
        }
    }
    exports.ImplReturnTypeMismatch = ImplReturnTypeMismatch;
    class FieldAccessOnNonCompoundErr extends SemanticError {
        constructor(args) {
            super([
                "The type `" + args.accessedType + "` is not a compound type so a field access is illegal at",
                args.accessedLocation,
            ]);
        }
    }
    exports.FieldAccessOnNonCompoundErr = FieldAccessOnNonCompoundErr;
    class VariantTestOnNonEnumErr extends SemanticError {
        constructor(args) {
            super([
                "The type `" + args.testedType + "` is not an enum type, ",
                "so the `is` test is illegal at",
                args.testLocation,
            ]);
        }
    }
    exports.VariantTestOnNonEnumErr = VariantTestOnNonEnumErr;
    class MethodAccessOnNonCompoundErr extends SemanticError {
        constructor(args) {
            super([
                "The type `" + args.accessedType + "` is not a compound type, so a method access is illegal at",
                args.accessedLocation,
            ]);
        }
    }
    exports.MethodAccessOnNonCompoundErr = MethodAccessOnNonCompoundErr;
    class BooleanTypeExpectedErr extends SemanticError {
        constructor(args) {
            if (args.reason === "if") {
                super([
                    "A condition expression with type `" + args.givenType + "` at",
                    args.location,
                    "cannot be converted to the type `Boolean` as required of ",
                    "`if` conditions."
                ]);
            }
            else if (args.reason === "contract") {
                super([
                    "A contract expression with type `" + args.givenType + "` at",
                    args.location,
                    "cannot be converted to the type `Boolean` as required of ",
                    "`" + args.contract + "` conditions."
                ]);
            }
            else {
                super([
                    "An expression with type `" + args.givenType + "` at",
                    args.location,
                    "cannot be converted to the type `Boolean` as required ",
                    "by the `" + args.op + "` operator at",
                    args.opLocation,
                ]);
            }
        }
    }
    exports.BooleanTypeExpectedErr = BooleanTypeExpectedErr;
    class TypeDoesNotProvideOperatorErr extends SemanticError {
        constructor({ lhsType, operator, operatorLocation }) {
            super([
                "The type `" + lhsType + "` does not have an operator `" + operator + "`,"
                    + " so an operation is illegal at",
                operatorLocation,
            ]);
        }
    }
    exports.TypeDoesNotProvideOperatorErr = TypeDoesNotProvideOperatorErr;
    class OperatorTypeMismatchErr extends SemanticError {
        constructor(args) {
            super([
                "The operator `" + args.operator + "`"
                    + " with type `" + args.lhsType
                    + "` on the left side expects a value with type `"
                    + args.expectedRhsType + "` on the right side, but one of type `"
                    + args.givenRhsType + "` was given at",
                args.rhsLocation
            ]);
        }
    }
    exports.OperatorTypeMismatchErr = OperatorTypeMismatchErr;
    class CallOnNonCompoundErr extends SemanticError {
        constructor(args) {
            super([
                "The type `" + args.baseType + "` does not have function members,"
                    + " so a function call is illegal at",
                args.location,
            ]);
        }
    }
    exports.CallOnNonCompoundErr = CallOnNonCompoundErr;
    class NoSuchFnErr extends SemanticError {
        constructor(args) {
            super([
                "The type `" + args.baseType + "` ",
                "does not have a function member named `" + args.methodName + "` ",
                "so the function call is illegal at",
                args.methodNameLocation,
            ]);
        }
    }
    exports.NoSuchFnErr = NoSuchFnErr;
    class OperationRequiresParenthesizationErr extends SemanticError {
        constructor(args) {
            super([
                "The operators `" + args.op1.str + "` and `" + args.op2.str + "` at",
                args.op1.location,
                "and at",
                args.op2.location,
                "have ambiguous precedence, and require parentheses to specify "
                    + "precedence."
            ]);
        }
    }
    exports.OperationRequiresParenthesizationErr = OperationRequiresParenthesizationErr;
    class RecursivePreconditionErr extends SemanticError {
        constructor(args) {
            super([
                "The function `" + args.fn + "` was recursively invoked in a"
                    + " `requires` clause at",
                args.callsite,
                "Try moving this reference to an `ensures` clause.",
            ]);
        }
    }
    exports.RecursivePreconditionErr = RecursivePreconditionErr;
    class ReturnExpressionUsedOutsideEnsuresErr extends SemanticError {
        constructor(args) {
            super([
                "A `return` expression cannot be used outside an `ensures`"
                    + " clause like it is at",
                args.returnLocation,
            ]);
        }
    }
    exports.ReturnExpressionUsedOutsideEnsuresErr = ReturnExpressionUsedOutsideEnsuresErr;
    class TypesDontSatisfyConstraintErr extends SemanticError {
        constructor(args) {
            const arr = [
                "There is no impl for `" + args.neededConstraint + "` at",
                args.neededLocation,
            ];
            if (args.constraintLocation !== null) {
                arr.push("This impl is required by the constraint at", args.constraintLocation);
            }
            super(arr);
        }
    }
    exports.TypesDontSatisfyConstraintErr = TypesDontSatisfyConstraintErr;
    class NonCompoundInRecordLiteralErr extends SemanticError {
        constructor(args) {
            super([
                "The type `" + args.t + "` is not a record type, and"
                    + " cannot be used in a record-literal expression like it is at",
                args.location,
            ]);
        }
    }
    exports.NonCompoundInRecordLiteralErr = NonCompoundInRecordLiteralErr;
    class MemberRepeatedInCompoundLiteralErr extends SemanticError {
        constructor(args) {
            super([
                "The " + args.kind + " `" + args.fieldName + "` was initialized a second time at",
                args.secondLocation,
                "The first initialization was at",
                args.firstLocation,
            ]);
        }
    }
    exports.MemberRepeatedInCompoundLiteralErr = MemberRepeatedInCompoundLiteralErr;
    class NoSuchFieldErr extends SemanticError {
        constructor(args) {
            super([
                "The record type `" + args.recordType
                    + "` does not have a field called `" + args.fieldName
                    + "`, so the " + args.kind + " is illegal at",
                args.location,
            ]);
        }
    }
    exports.NoSuchFieldErr = NoSuchFieldErr;
    class NoSuchVariantErr extends SemanticError {
        constructor(args) {
            super([
                "The enum type `" + args.enumType + "` ",
                "does not have a variant called `" + args.variantName + "`, ",
                "so the " + args.kind + " is illegal at",
                args.location,
            ]);
        }
    }
    exports.NoSuchVariantErr = NoSuchVariantErr;
    class UninitializedFieldErr extends SemanticError {
        constructor(args) {
            super([
                "The initialization of type `" + args.recordType + "` ",
                "is missing field `" + args.missingFieldName + "` at",
                args.initializerLocation,
                "The field `" + args.missingFieldName + "` is defined at",
                args.definedLocation,
            ]);
        }
    }
    exports.UninitializedFieldErr = UninitializedFieldErr;
    class MultipleVariantsErr extends SemanticError {
        constructor(args) {
            super([
                "The initialization of enum type `" + args.enumType + "` ",
                "includes a second variant `" + args.secondVariant + "` at",
                args.secondLocation,
                "The first variant `" + args.firstVariant + "` is included at",
                args.firstLocation,
            ]);
        }
    }
    exports.MultipleVariantsErr = MultipleVariantsErr;
    class EnumLiteralMissingVariantErr extends SemanticError {
        constructor(args) {
            super([
                "The initialization of enum type `" + args.enumType + "` ",
                "is missing a variant at",
                args.location,
            ]);
        }
    }
    exports.EnumLiteralMissingVariantErr = EnumLiteralMissingVariantErr;
    class TypeParameterCountMismatchErr extends SemanticError {
        constructor(args) {
            super([
                "The " + args.entityType + " `" + args.entityName + "` was given ",
                args.givenCount + " ",
                pluralize(args.givenCount, "type parameter") + " at",
                args.givenLocation,
                "but " + args.expectedCount + " ",
                pluralize(args.expectedCount, "type parameter was ", "type parameters were "),
                "expected at",
                args.expectedLocation,
            ]);
        }
    }
    exports.TypeParameterCountMismatchErr = TypeParameterCountMismatchErr;
    class OverlappingImplsErr extends SemanticError {
        constructor(args) {
            super([
                "The impl `" + args.secondImpl + "` given at",
                args.secondLocation,
                "conflicts with the impl `" + args.firstImpl + "` given at",
                args.firstLocation,
            ]);
        }
    }
    exports.OverlappingImplsErr = OverlappingImplsErr;
    class ImplMemberDoesNotExistOnInterface extends SemanticError {
        constructor(args) {
            super([
                "The impl `" + args.impl + "` ",
                "defines a member `" + args.member + "` at",
                args.memberLocation,
                "However, the interface `" + args.interface + "` defined at",
                args.interfaceLocation,
                "does not have a member named `" + args.member + "`.",
            ]);
        }
    }
    exports.ImplMemberDoesNotExistOnInterface = ImplMemberDoesNotExistOnInterface;
    class ImplMissingInterfaceMember extends SemanticError {
        constructor(args) {
            super([
                "The impl `" + args.impl + "` ",
                "is missing member `" + args.member + "` at",
                args.implLocation,
                "However, the interface `" + args.interface + "` requires a `" + args.member + "` member at",
                args.memberLocation,
            ]);
        }
    }
    exports.ImplMissingInterfaceMember = ImplMissingInterfaceMember;
    class ImplMayNotHavePreconditionErr extends SemanticError {
        constructor(args) {
            super([
                "The member `" + args.memberName + "` of impl `",
                args.impl + "` declares an additional precondition at",
                args.preconditionLocation,
                "However, impls may not state additional preconditions; ",
                "preconditions on the interface are automatically applied.",
            ]);
        }
    }
    exports.ImplMayNotHavePreconditionErr = ImplMayNotHavePreconditionErr;
    class ProofMemberUsedOutsideProofContextErr extends SemanticError {
        constructor(args) {
            super([
                "The operation `" + args.operation + "` ",
                "cannot be used outside a proof context as it is at",
                args.location,
            ]);
        }
    }
    exports.ProofMemberUsedOutsideProofContextErr = ProofMemberUsedOutsideProofContextErr;
});
define("shiru/parser", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.FailParser = exports.choice = exports.ChoiceParser = exports.RecordParser = exports.PeekParser = exports.RepeatParser = exports.TokenParser = exports.ConstParser = exports.EndOfStreamParser = exports.MapParser = exports.Parser = void 0;
    ;
    /// Parser represents a parser from a stream of `Token`s to a particular
    /// `Result` AST.
    class Parser {
        map(f) {
            return new MapParser(this, f);
        }
        required(f) {
            return new ChoiceParser(() => [this, new FailParser(f)]);
        }
        otherwise(q) {
            return new ChoiceParser(() => [this, new ConstParser(q)]);
        }
    }
    exports.Parser = Parser;
    class MapParser extends Parser {
        constructor(parser, f) {
            super();
            this.parser = parser;
            this.f = f;
        }
        parse(stream, from, debugContext) {
            const result = this.parser.parse(stream, from, debugContext);
            if (result && "object" in result) {
                const mapped = this.f(result.object, stream, from);
                return { object: mapped, rest: result.rest };
            }
            else {
                return result;
            }
        }
    }
    exports.MapParser = MapParser;
    class EndOfStreamParser extends Parser {
        parse(stream, from) {
            if (from === stream.length) {
                return { object: {}, rest: stream.length };
            }
            return null;
        }
    }
    exports.EndOfStreamParser = EndOfStreamParser;
    class ConstParser extends Parser {
        constructor(value) {
            super();
            this.value = value;
        }
        parse(stream, from) {
            return { object: this.value, rest: from };
        }
    }
    exports.ConstParser = ConstParser;
    class TokenParser extends Parser {
        constructor(f) {
            super();
            this.f = f;
        }
        parse(stream, from) {
            if (from >= stream.length) {
                return null;
            }
            const front = stream[from];
            const value = this.f(front);
            if (value === null)
                return null;
            return { object: value, rest: from + 1 };
        }
    }
    exports.TokenParser = TokenParser;
    class RepeatParser extends Parser {
        constructor(element, min, max) {
            super();
            this.element = element;
            this.min = min;
            this.max = max;
        }
        parse(stream, from, debugContext) {
            const list = [];
            while (this.max === undefined || list.length < this.max) {
                const result = this.element.parse(stream, from, debugContext);
                if (result === null) {
                    break;
                }
                else {
                    list.push(result.object);
                    if (result.rest <= from) {
                        throw new Error("Encountered zero-token element in RepeatParser `" + JSON.stringify(result) + "`");
                    }
                    from = result.rest;
                }
            }
            if (this.min !== undefined && list.length < this.min) {
                return null;
            }
            return { object: list, rest: from };
        }
    }
    exports.RepeatParser = RepeatParser;
    ;
    /// PeekParser applies a subparser to the stream, but does not consume any
    /// tokens.
    class PeekParser extends Parser {
        constructor(subparser) {
            super();
            this.subparser = subparser;
        }
        parse(stream, from, debugContext) {
            const peek = this.subparser.parse(stream, from, debugContext);
            if (peek === null) {
                return null;
            }
            return {
                object: peek.object,
                rest: from,
            };
        }
    }
    exports.PeekParser = PeekParser;
    class RecordParser extends Parser {
        constructor(description) {
            super();
            this.mem = null;
            this.description = description;
        }
        parse(stream, from, debugContext) {
            // Each RecordParser opens a new debug context.
            // TODO: Link the debug context to the parent context.
            debugContext = {};
            let mem = this.mem;
            if (mem === null) {
                mem = this.description();
                this.mem = mem;
            }
            let record = {};
            for (let p in mem) {
                let firstToken = stream[from];
                const parser = mem[p];
                let result = parser.parse(stream, from, debugContext);
                if (result === null) {
                    return null;
                }
                if (p[0] !== "_") {
                    record[p] = result.object;
                }
                from = result.rest;
                const followingToken = stream[from];
                debugContext[p] = { first: firstToken, following: followingToken };
            }
            return { object: record, rest: from };
        }
    }
    exports.RecordParser = RecordParser;
    /// ChoiceParser implements *ordered* choice. The first constituent parser that
    /// accepts the input results in a parse.
    class ChoiceParser extends Parser {
        constructor(parsers) {
            super();
            this.parsers = parsers;
        }
        parse(stream, from, debugContext) {
            for (let parser of this.parsers()) {
                let result = parser.parse(stream, from, debugContext);
                if (result === null) {
                    continue;
                }
                return result;
            }
            return null;
        }
    }
    exports.ChoiceParser = ChoiceParser;
    /// choice is a convenience function for getting terse inference.
    function choice(grammar, ...keys) {
        return new ChoiceParser(() => {
            const g = grammar();
            return keys.map(k => g[k]);
        });
    }
    exports.choice = choice;
    class FailParser extends Parser {
        constructor(f) {
            super();
            this.f = f;
        }
        parse(stream, from, debugContext) {
            throw this.f(stream, from, debugContext);
        }
    }
    exports.FailParser = FailParser;
});
define("shiru/grammar", ["require", "exports", "shiru/lexer", "shiru/parser"], function (require, exports, lexer_1, parser_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.grammar = exports.parseSource = exports.ParseError = void 0;
    function keywordParser(keyword) {
        return new parser_1.TokenParser((t) => {
            if (t.tag === "keyword") {
                if (t.keyword === keyword) {
                    return t;
                }
            }
            return null;
        });
    }
    function tokenParser(tag) {
        return new parser_1.TokenParser((t) => {
            if (t.tag === tag) {
                return t;
            }
            return null;
        });
    }
    function punctuationParser(symbol) {
        return new parser_1.TokenParser((t) => {
            if (t.tag === "punctuation" && t.symbol === symbol) {
                return t;
            }
            return null;
        });
    }
    const eofParser = new parser_1.TokenParser(t => t.tag === "eof" ? t.location : null);
    /// `TrailingCommaParser` is a combinator that parses a comma-separated sequence
    /// of elements, with an optional trailing comma.
    class TrailingCommaParser extends parser_1.Parser {
        constructor(element) {
            super();
            this.element = element;
        }
        parse(stream, from, debugContext) {
            let list = [];
            while (true) {
                const element = this.element.parse(stream, from, debugContext);
                if (element === null) {
                    return { object: list, rest: from };
                }
                list.push(element.object);
                from = element.rest;
                const comma = punctuation.comma.parse(stream, from, debugContext);
                if (comma === null) {
                    return { object: list, rest: from };
                }
                from = comma.rest;
            }
        }
    }
    /// `CommaParser` is a combinator that parses a comma-separated sequence of
    /// elements.
    class CommaParser extends parser_1.Parser {
        constructor(element, expected, min = 0) {
            super();
            this.element = element;
            this.expected = expected;
            this.min = min;
        }
        parse(stream, from, debugContext) {
            let out = [];
            while (true) {
                const object = this.element.parse(stream, from, debugContext);
                if (object === null) {
                    if (out.length < this.min) {
                        return null;
                    }
                    else if (out.length === 0) {
                        return { object: [], rest: from };
                    }
                    throw new ParseError([this.expected, stream[from].location]);
                }
                else {
                    out.push(object.object);
                    from = object.rest;
                }
                // Parse a comma.
                const comma = punctuation.comma.parse(stream, from, debugContext);
                if (comma === null) {
                    if (out.length < this.min) {
                        return null;
                    }
                    return {
                        object: out,
                        rest: from,
                    };
                }
                else {
                    from = comma.rest;
                }
            }
        }
    }
    class StructParser extends parser_1.Parser {
        constructor(spec) {
            super();
            this.parser = new parser_1.RecordParser(spec);
        }
        parse(stream, from, debugContext) {
            const firstToken = stream[from].location;
            const result = this.parser.parse(stream, from, debugContext);
            if (result === null || "message" in result) {
                return result;
            }
            const lastToken = stream[result.rest - 1].location;
            const location = {
                fileID: firstToken.fileID,
                offset: firstToken.offset,
                length: lastToken.offset + lastToken.length - firstToken.offset,
            };
            return {
                object: { ...result.object, location },
                rest: result.rest,
            };
        }
    }
    function requireAtLeastOne(thing) {
        return (array, tokens, from) => {
            if (array.length === 0) {
                throw new ParseError([
                    "Expected at least one " + thing + " at",
                    tokens[from].location,
                ]);
            }
            return array;
        };
    }
    function parseProblem(...message) {
        return (stream, from, context) => {
            const out = [];
            for (let e of message) {
                if (typeof e === "function") {
                    const x = e(stream, from, context);
                    if (Array.isArray(x)) {
                        out.push(...x);
                    }
                    else {
                        out.push(x);
                    }
                }
                else {
                    out.push(e);
                }
            }
            return new ParseError(out);
        };
    }
    class ParseError {
        constructor(message) {
            this.message = message;
        }
        toString() {
            return JSON.stringify(this.message);
        }
    }
    exports.ParseError = ParseError;
    function atReference(name) {
        return (stream, from, props) => {
            const token = props[name].first;
            if (token === null) {
                throw new Error("null first in atReference");
            }
            else {
                return token.location;
            }
        };
    }
    function atHead(stream, from) {
        const token = stream[from];
        if (token === undefined) {
            throw new Error("out of bounds");
        }
        else {
            return token.location;
        }
    }
    /// THROWS `LexError`
    /// THROWS `ParseError`
    function parseSource(blob, fileID) {
        const tokens = (0, lexer_1.tokenize)(blob, fileID);
        const result = exports.grammar.Source.parse(tokens, 0, {});
        // N.B.: The end-of parser in Source ensures no tokens are left afterwards.
        return result.object;
    }
    exports.parseSource = parseSource;
    const tokens = {
        packageIden: tokenParser("iden"),
        typeIden: tokenParser("type-iden"),
        iden: tokenParser("iden"),
        typeVarIden: tokenParser("type-var"),
        typeParameterConstraintMethodSubject: new parser_1.TokenParser((token) => {
            if (token.tag === "type-var") {
                return token;
            }
            else if (token.tag === "type-keyword" && token.keyword === "This") {
                return token;
            }
            return null;
        }),
        typeKeyword: tokenParser("type-keyword"),
        operator: tokenParser("operator"),
        stringLiteral: tokenParser("string-literal"),
        numberLiteral: tokenParser("number-literal"),
        booleanLiteral: new parser_1.TokenParser((token) => {
            if (token.tag !== "keyword") {
                return null;
            }
            else if (token.keyword !== "true" && token.keyword !== "false") {
                return null;
            }
            return token;
        }),
        logicalOperator: new parser_1.TokenParser((token) => {
            if (token.tag !== "keyword") {
                return null;
            }
            else if (token.keyword !== "and" && token.keyword !== "or" && token.keyword !== "implies") {
                return null;
            }
            return token;
        }),
        returnKeyword: keywordParser("return"),
    };
    const keywords = {
        assert: keywordParser("assert"),
        class: keywordParser("class"),
        else: keywordParser("else"),
        ensures: keywordParser("ensures"),
        enum: keywordParser("enum"),
        fn: keywordParser("fn"),
        if: keywordParser("if"),
        impl: keywordParser("impl"),
        import: keywordParser("import"),
        is: keywordParser("is"),
        interface: keywordParser("interface"),
        package: keywordParser("package"),
        proof: keywordParser("proof"),
        record: keywordParser("record"),
        requires: keywordParser("requires"),
        return: keywordParser("return"),
        unreachable: keywordParser("unreachable"),
        var: keywordParser("var"),
    };
    const punctuation = {
        semicolon: punctuationParser(";"),
        comma: punctuationParser(","),
        colon: punctuationParser(":"),
        dot: punctuationParser("."),
        equal: punctuationParser("="),
        pipe: punctuationParser("|"),
        curlyOpen: punctuationParser("{"),
        curlyClose: punctuationParser("}"),
        roundOpen: punctuationParser("("),
        roundClose: punctuationParser(")"),
        squareOpen: punctuationParser("["),
        squareClose: punctuationParser("]"),
    };
    exports.grammar = {
        AssertSt: new StructParser(() => ({
            _assert: keywords.assert,
            tag: new parser_1.ConstParser("assert"),
            expression: exports.grammar.Expression
                .required(parseProblem("Expected an expression at", atHead, "after `assert`")),
            _semicolon: punctuation.semicolon
                .required(parseProblem("Expected a `;` after assert condition at", atHead)),
        })),
        Block: new parser_1.RecordParser(() => ({
            _open: punctuation.curlyOpen,
            statements: new parser_1.RepeatParser(exports.grammar.Statement),
            closing: punctuation.curlyClose
                .required(parseProblem("Expected a `}` at", atHead, "to complete a block started at", atReference("_open")))
                .map(x => x.location),
        })),
        TypeNamed: new StructParser(() => ({
            packageQualification: exports.grammar.PackageQualification
                .otherwise(null),
            entity: tokens.typeIden,
            tag: new parser_1.ConstParser("named"),
            arguments: exports.grammar.TypeArguments.map(x => x.arguments).otherwise([]),
        })),
        Definition: (0, parser_1.choice)(() => exports.grammar, "RecordDefinition", "EnumDefinition", "ImplDefinition", "InterfaceDefinition"),
        ElseClause: new parser_1.RecordParser(() => ({
            _else: keywords.else,
            body: exports.grammar.Block
                .required(parseProblem("Expected a block after `else` at", atHead)),
        })),
        ElseIfClause: new parser_1.RecordParser(() => ({
            _else: keywords.else,
            _if: keywords.if,
            condition: exports.grammar.Expression
                .required(parseProblem("Expected an expression after `if` at", atHead)),
            body: exports.grammar.Block
                .required(parseProblem("Expected a block after condition at", atHead)),
        })),
        EnsuresClause: new parser_1.RecordParser(() => ({
            _ensures: keywords.ensures,
            expression: exports.grammar.Expression
                .required(parseProblem("Expected an expression after `ensures` at", atHead)),
        })),
        EnumDefinition: new StructParser(() => ({
            _enum: keywords.enum,
            tag: new parser_1.ConstParser("enum-definition"),
            entityName: tokens.typeIden
                .required(parseProblem("Expected a type name after `enum` at", atHead)),
            typeParameters: exports.grammar.TypeParameters
                .otherwise({ parameters: [], constraints: [] }),
            _open: punctuation.curlyOpen
                .required(parseProblem("Expected a `{` to begin enum body at", atHead)),
            variants: new parser_1.RepeatParser(exports.grammar.Field),
            fns: new parser_1.RepeatParser(exports.grammar.Fn),
            _close: punctuation.curlyClose
                .required(parseProblem("Expected a `}` at", atHead, "to complete an enum definition beginning at", atReference("_open"))),
        })),
        Expression: new StructParser(() => ({
            left: exports.grammar.ExpressionOperand,
            operations: new parser_1.RepeatParser(exports.grammar.ExpressionOperation),
        })),
        ExpressionAccess: (0, parser_1.choice)(() => exports.grammar, "ExpressionAccessMethod", "ExpressionAccessField"),
        ExpressionAccessField: new StructParser(() => ({
            _dot: punctuation.dot,
            fieldName: tokens.iden,
            tag: new parser_1.ConstParser("field"),
        })),
        ExpressionAccessMethod: new StructParser(() => ({
            _dot: punctuation.dot,
            methodName: tokens.iden
                .required(parseProblem("Expected a field or method name after a `.` at", atHead)),
            _open: punctuation.roundOpen,
            tag: new parser_1.ConstParser("method"),
            args: new CommaParser(exports.grammar.Expression, "Expected another method argument at"),
            _close: punctuation.roundClose
                .required(parseProblem("Expected a `)` at", atHead, "to complete a method call beginning at", atReference("_open"))),
        })),
        ExpressionAtom: new parser_1.ChoiceParser(() => [
            exports.grammar.ExpressionParenthesized,
            tokens.stringLiteral,
            tokens.numberLiteral,
            tokens.booleanLiteral,
            tokens.returnKeyword,
            tokens.iden,
            exports.grammar.ExpressionTypeCall,
            exports.grammar.ExpressionRecordLiteral,
            exports.grammar.ExpressionConstraintCall,
        ]),
        ExpressionConstraint: new StructParser(() => ({
            _open: punctuation.roundOpen,
            subject: exports.grammar.Type,
            _is: keywords.is,
            constraint: exports.grammar.TypeNamed
                .required(parseProblem("Expected a constraint after `is` at", atHead)),
            _close: punctuation.roundClose
                .required(parseProblem("Expected a `)`", atHead, "to complete constraint group at", atReference("_open"))),
        })),
        ExpressionConstraintCall: new StructParser(() => ({
            constraint: exports.grammar.ExpressionConstraint,
            tag: new parser_1.ConstParser("constraint-call"),
            _dot: punctuation.dot,
            methodName: tokens.iden
                .required(parseProblem("Expected a function name after `.` in a constraint-call expression at", atHead)),
            _open: punctuation.roundOpen
                .required(parseProblem("Expected a `(` after a function name in a call expression at", atHead)),
            arguments: new CommaParser(exports.grammar.Expression, "Expected another argument at"),
            _close: punctuation.roundClose
                .required(parseProblem("Expected a `)` at", atHead, "to complete a function call beginning at", atReference("_open"))),
        })),
        ExpressionTypeCall: new StructParser(() => ({
            t: exports.grammar.Type,
            tag: new parser_1.ConstParser("type-call"),
            _dot: punctuation.dot,
            methodName: tokens.iden
                .required(parseProblem("Expected a function name after `.` in a type-call expression at", atHead)),
            _open: punctuation.roundOpen
                .required(parseProblem("Expected a `(` after a function name in a call expression at", atHead)),
            arguments: new CommaParser(exports.grammar.Expression, "Expected another argument at"),
            _close: punctuation.roundClose
                .required(parseProblem("Expected a `)` at", atHead, "to complete a function call beginning at", atReference("_open"))),
        })),
        ExpressionRecordLiteral: new StructParser(() => ({
            t: exports.grammar.Type,
            _open: punctuation.curlyOpen,
            tag: new parser_1.ConstParser("record-literal"),
            initializations: new TrailingCommaParser(exports.grammar.ExpressionRecordFieldInit),
            _close: punctuation.curlyClose
                .required(parseProblem("Expected a `}` at", atHead, "to complete a record literal beginning at", atReference("_open"))),
        })),
        ExpressionRecordFieldInit: new parser_1.RecordParser(() => ({
            fieldName: tokens.iden,
            _eq: punctuation.equal
                .required(parseProblem("Expected an `=` after a field name in a new-expression at", atHead)),
            value: exports.grammar.Expression
                .required(parseProblem("Expected an expression after `=` in a new-expression argument list at", atHead)),
        })),
        ExpressionOperand: new StructParser(() => ({
            atom: exports.grammar.ExpressionAtom,
            accesses: new parser_1.RepeatParser(exports.grammar.ExpressionAccess),
            suffixIs: exports.grammar.ExpressionSuffixIs.otherwise(null),
        })),
        ExpressionOperation: (0, parser_1.choice)(() => exports.grammar, "ExpressionOperationBinary", "ExpressionOperationLogical"),
        ExpressionOperationBinary: new parser_1.RecordParser(() => ({
            tag: new parser_1.ConstParser("binary"),
            operator: tokens.operator,
            right: exports.grammar.ExpressionOperand
                .required(parseProblem("Expected an operand at", atHead, "after the binary operator at", atReference("operator")))
        })),
        ExpressionOperationLogical: new parser_1.RecordParser(() => ({
            tag: new parser_1.ConstParser("logical"),
            operator: tokens.logicalOperator,
            right: exports.grammar.ExpressionOperand,
        })),
        ExpressionSuffixIs: new StructParser(() => ({
            tag: new parser_1.ConstParser("is"),
            operator: keywords.is,
            variant: tokens.iden,
        })),
        ExpressionParenthesized: new StructParser(() => ({
            _open: punctuation.roundOpen,
            tag: new parser_1.ConstParser("paren"),
            expression: exports.grammar.Expression,
            _close: punctuation.roundClose
                .required(parseProblem("Expected a `)` at", atHead, "to complete a grouping that began at", atReference("_open"))),
        })),
        Field: new StructParser(() => ({
            _var: keywords.var,
            name: tokens.iden
                .required(parseProblem("Expected a field name after `var` at", atHead)),
            _colon: punctuation.colon
                .required(parseProblem("Expected a `;` after variable name at", atHead)),
            t: exports.grammar.Type
                .required(parseProblem("Expected a type after `:` at", atHead)),
            _semicolon: punctuation.semicolon
                .required(parseProblem("Expected a `;` after field type at", atHead)),
        })),
        Fn: new parser_1.RecordParser(() => ({
            signature: exports.grammar.FnSignature,
            body: exports.grammar.Block
                .required(parseProblem("Expected a `{` to begin a function body at", atHead))
        })),
        FnParameter: new parser_1.RecordParser(() => ({
            name: tokens.iden,
            _colon: punctuation.colon,
            t: exports.grammar.Type,
        })),
        FnParameters: new StructParser(() => ({
            _open: punctuation.roundOpen,
            list: new CommaParser(exports.grammar.FnParameter, "Expected another function parameter after `,` at"),
            _close: punctuation.roundClose
                .required(parseProblem("Expected a `)` at", atHead, "to complete the parameter list started at", atReference("_open"))),
        })),
        FnSignature: new StructParser(() => ({
            proof: keywords.proof.otherwise(false),
            _fn: keywords.fn,
            name: tokens.iden
                .required(parseProblem("Expected a function name after `fn` at", atHead)),
            parameters: exports.grammar.FnParameters
                .required(parseProblem("Expected a `(` to begin function parameters at", atHead)),
            _colon: punctuation.colon
                .required(parseProblem("Expected a `:` after function parameters at", atHead)),
            returns: new CommaParser(exports.grammar.Type, "Expected a return type at")
                .map(requireAtLeastOne("return type")),
            requires: new parser_1.RepeatParser(exports.grammar.RequiresClause),
            ensures: new parser_1.RepeatParser(exports.grammar.EnsuresClause),
        })),
        IfSt: new parser_1.RecordParser(() => ({
            _if: keywords.if,
            tag: new parser_1.ConstParser("if"),
            condition: exports.grammar.Expression
                .required(parseProblem("Expected a condition after `if` at", atHead)),
            body: exports.grammar.Block
                .required(parseProblem("Expected a block after if condition at", atHead)),
            elseIfClauses: new parser_1.RepeatParser(exports.grammar.ElseIfClause),
            elseClause: exports.grammar.ElseClause.otherwise(null),
        })),
        InterfaceMember: new parser_1.RecordParser(() => ({
            signature: exports.grammar.FnSignature,
            _semicolon: punctuation.semicolon
                .required(parseProblem("Expected a `;` to complete the interface member at", atHead)),
        })),
        InterfaceDefinition: new parser_1.RecordParser(() => ({
            _interface: keywords.interface,
            tag: new parser_1.ConstParser("interface-definition"),
            entityName: tokens.typeIden,
            typeParameters: new parser_1.ChoiceParser(() => [exports.grammar.TypeParametersOnlyConstraints, exports.grammar.TypeParameters])
                .otherwise({ parameters: [], constraints: [] }),
            _open: punctuation.curlyOpen,
            members: new parser_1.RepeatParser(exports.grammar.InterfaceMember),
            _close: punctuation.curlyClose
                .required(parseProblem("Expected a `}` at", atHead, "to complete an interface definition beginning at", atReference("_open"))),
        })),
        ImplDefinition: new StructParser(() => ({
            impl: keywords.impl,
            tag: new parser_1.ConstParser("impl-definition"),
            typeParameters: exports.grammar.TypeParameters
                .otherwise({ parameters: [], constraints: [] }),
            base: exports.grammar.TypeNamed
                .required(parseProblem("Expected a compound type after `impl` at", atHead)),
            _is: keywords.is
                .required(parseProblem("Expected `is` after compound type in `impl` definition at", atHead)),
            constraint: exports.grammar.TypeNamed
                .required(parseProblem("Expected a constraint after `is` in `impl` definition at", atHead)),
            _open: punctuation.curlyOpen
                .required(parseProblem("Expected a `{` after constraint in `impl` definition at", atHead)),
            fns: new parser_1.RepeatParser(exports.grammar.Fn),
            _close: punctuation.curlyClose
                .required(parseProblem("Expected a `}` after `impl` defition function members at", atHead)),
        })),
        Import: new parser_1.RecordParser(() => ({
            _import: keywords.import,
            imported: (0, parser_1.choice)(() => exports.grammar, "ImportOfObject", "ImportOfPackage")
                .required(parseProblem("Expected an entity or package to import after `import` at", atHead)),
            _semicolon: punctuation.semicolon
                .required(parseProblem("Expected a `;` to end the import at", atHead)),
        })),
        ImportOfObject: new StructParser(() => ({
            tag: new parser_1.ConstParser("of-object"),
            packageName: tokens.packageIden,
            _dot: punctuation.dot,
            objectName: tokens.typeIden
                .required(parseProblem("Expected an object name to import after `:` at", atHead)),
        })),
        ImportOfPackage: new StructParser(() => ({
            tag: new parser_1.ConstParser("of-package"),
            packageName: tokens.packageIden,
        })),
        PackageDef: new parser_1.RecordParser(() => ({
            _package: keywords.package,
            packageName: tokens.packageIden
                .required(parseProblem("Expected a package name after `package` at", atHead)),
            _semicolon: punctuation.semicolon
                .required(parseProblem("Expected a `;` to end the package declaration at", atHead)),
        })),
        PackageQualification: new StructParser(() => ({
            package: tokens.iden,
            _dot: punctuation.dot
                .required(parseProblem("Expected a `.` after a package name at", atHead)),
        })),
        RecordDefinition: new StructParser(() => ({
            _record: keywords.record,
            tag: new parser_1.ConstParser("record-definition"),
            entityName: tokens.typeIden
                .required(parseProblem("Expected a type name after `record` at", atHead)),
            typeParameters: exports.grammar.TypeParameters
                .otherwise({ parameters: [], constraints: [] }),
            _open: punctuation.curlyOpen
                .required(parseProblem("Expected a `{` to begin record body at", atHead)),
            fields: new parser_1.RepeatParser(exports.grammar.Field),
            fns: new parser_1.RepeatParser(exports.grammar.Fn),
            _close: punctuation.curlyClose
                .required(parseProblem("Expected a `}` at", atHead, "to complete a record definition beginning at", atReference("_open"))),
        })),
        RequiresClause: new parser_1.RecordParser(() => ({
            _requires: keywords.requires,
            expression: exports.grammar.Expression
                .required(parseProblem("Expected an expression after `requires` at", atHead)),
        })),
        ReturnSt: new StructParser(() => ({
            _return: keywords.return,
            tag: new parser_1.ConstParser("return"),
            values: new CommaParser(exports.grammar.Expression, "Expected an expression at", 1)
                .required(parseProblem("Expected at least one value after `return` at", atHead)),
            _semicolon: punctuation.semicolon
                .required(parseProblem("Expected a `;` to complete a return statement at", atHead)),
        })),
        Source: new parser_1.RecordParser(() => ({
            package: exports.grammar.PackageDef
                .required(parseProblem("Expected a package declaration to begin the source file at", atHead)),
            imports: new parser_1.RepeatParser(exports.grammar.Import),
            definitions: new parser_1.RepeatParser(exports.grammar.Definition),
            _eof: eofParser
                .required(parseProblem("Expected another definition at", atHead)),
        })),
        Statement: (0, parser_1.choice)(() => exports.grammar, "VarSt", "ReturnSt", "IfSt", "AssertSt", "UnreachableSt"),
        Type: new parser_1.ChoiceParser(() => [exports.grammar.TypeNamed, tokens.typeKeyword, tokens.typeVarIden]),
        TypeArguments: new parser_1.RecordParser(() => ({
            _open: punctuation.squareOpen,
            arguments: new CommaParser(exports.grammar.Type, "Expected another type argument at")
                .map(requireAtLeastOne("type argument")),
            _close: punctuation.squareClose
                .required(parseProblem("Expected a `]` at", atHead, "to complete type arguments started at", atReference("_open"))),
        })),
        TypeConstraint: new StructParser(() => ({
            methodSubject: tokens.typeParameterConstraintMethodSubject,
            _is: keywords.is
                .required(parseProblem("Expected `is` after type constraint method subject at", atHead)),
            constraint: exports.grammar.TypeNamed
                .required(parseProblem("Expected a constraint to be named after `is` at", atHead)),
        })),
        TypeConstraints: new parser_1.RecordParser(() => ({
            _pipe: punctuation.pipe,
            constraints: new CommaParser(exports.grammar.TypeConstraint, "Expected a type constraint at", 1)
                .required(parseProblem("Expected at least one type constraint at", atHead)),
        })),
        TypeParametersOnlyConstraints: new parser_1.RecordParser(() => ({
            _open: punctuation.squareOpen,
            _peekNonTypeVar: new parser_1.PeekParser(tokens.typeKeyword),
            constraints: new CommaParser(exports.grammar.TypeConstraint, "Expected a type constraint at", 1)
                .required(parseProblem("Expected at least one type constraint at", atHead)),
            parameters: new parser_1.ConstParser([]),
            _close: punctuation.squareClose
                .required(parseProblem("Expected a `]` at", atHead, "to complete type parameters started at", atReference("_open"))),
        })),
        TypeParameters: new parser_1.RecordParser(() => ({
            _open: punctuation.squareOpen,
            parameters: new CommaParser(tokens.typeVarIden, "Expected a type variable at", 1)
                .required(parseProblem("Expected a type variable at", atHead)),
            constraints: exports.grammar.TypeConstraints.map(x => x.constraints)
                .otherwise([]),
            _close: punctuation.squareClose
                .required(parseProblem("Expected a `]` at", atHead, "to complete type parameters started at", atReference("_open"))),
        })),
        UnreachableSt: new StructParser(() => ({
            _unreachable: keywords.unreachable,
            tag: new parser_1.ConstParser("unreachable"),
            _semicolon: punctuation.semicolon
                .required(parseProblem("Expected a `;` after `unreachable` at", atHead)),
        })),
        VarSt: new StructParser(() => ({
            variables: new CommaParser(exports.grammar.VarDecl, "Expected another `var` variable declaration at", 1),
            tag: new parser_1.ConstParser("var"),
            "_eq": punctuation.equal
                .required(parseProblem("Expected a `=` after variable declarations at", atHead)),
            initialization: new CommaParser(exports.grammar.Expression, "Expected another expression expression at", 1)
                .required(parseProblem("Expected an initialization expression after `=` in a variable declaration at", atHead)),
            "_semicolon": punctuation.semicolon
                .required(parseProblem("Expected a `;` after variable initialization at", atHead)),
        })),
        VarDecl: new StructParser(() => ({
            _var: keywordParser("var"),
            variable: tokens.iden
                .required(parseProblem("Expected a variable name after `var` in a variable declaration at", atHead)),
            _colon: punctuation.colon
                .required(parseProblem("Expected a `:` after a variable name in a variable declaration at", atHead)),
            t: exports.grammar.Type
                .required(parseProblem("Expected a type after `:` in a variable declaration at", atHead)),
        })),
    };
});
define("shiru/interpreter", ["require", "exports", "shiru/ir"], function (require, exports, ir) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.printOp = exports.printBlockContents = exports.printFn = exports.printProgram = exports.RuntimeErr = exports.interpret = void 0;
    /// `makeVTableProducer` scans the "search" fields of the context, and produces
    /// a `VTableProducer` that only consumes the "runtime" fields of the context.j
    /// The returned producer can thus be cached, avoiding the expensive search
    /// process, for subsequent calls which have different runtime contexts but the
    /// same search context.
    function makeVTableProducer(
    // N.B.: Only uses "search" fields.
    context, constraint) {
        const locals = context.local.get(constraint.interface);
        if (locals !== undefined) {
            for (let i = 0; i < locals.length; i++) {
                const ti = i;
                const local = locals[ti];
                const matched = matchTypes([], local.provides.subjects, constraint.subjects);
                if (matched !== null) {
                    return (runtimeCtx, callsite) => {
                        return runtimeCtx.local.get(constraint.interface)[ti].vtable;
                    };
                }
            }
        }
        const globals = context.global.get(constraint.interface);
        if (globals !== undefined) {
            for (const k in globals) {
                const global = globals[k];
                const matched = matchTypes(global.for_any, global.provides.subjects, constraint.subjects);
                if (matched !== null) {
                    const entrySchema = {};
                    for (const s in global.entries) {
                        const entry = global.entries[s];
                        entrySchema[s] = {
                            implementation: entry.implementation,
                            closureConstraints: entry.constraint_parameters.map(x => {
                                if (typeof x === "number") {
                                    return x;
                                }
                                return makeVTableProducer(context, {
                                    interface: x.interface,
                                    subjects: x.subjects.map(t => ir.typeSubstitute(t, matched)),
                                });
                            }),
                        };
                    }
                    return (runtimeCtx, callsite) => {
                        const entries = {};
                        for (const s in entrySchema) {
                            const schema = entrySchema[s];
                            entries[s] = {
                                implementation: schema.implementation,
                                closureConstraints: schema.closureConstraints.map(x => {
                                    if (typeof x === "number") {
                                        return callsite[x];
                                    }
                                    else {
                                        return x(runtimeCtx, callsite);
                                    }
                                }),
                            };
                        }
                        return {
                            tag: "dictionary",
                            entries,
                        };
                    };
                }
            }
        }
        throw new Error("Could not find an implementation of `"
            + JSON.stringify(constraint) + "`");
    }
    function matchTypeSingle(variables, pattern, subject) {
        if (pattern.tag === "type-variable") {
            const existing = variables.get(pattern.id);
            if (existing !== undefined) {
                if (existing === null || ir.equalTypes(existing, subject)) {
                    variables.set(pattern.id, subject);
                    return true;
                }
                return false;
            }
            else {
                // Literally references a type-variable, which must match the subject.
                if (subject.tag !== "type-variable") {
                    return false;
                }
                return pattern.id === subject.id;
            }
        }
        else if (pattern.tag === "type-compound" && subject.tag === "type-compound") {
            if (pattern.base !== subject.base) {
                return false;
            }
            if (pattern.type_arguments.length !== subject.type_arguments.length) {
                throw new Error(`Arity of type \`${pattern.base}\` is inconsistent.`);
            }
            for (let i = 0; i < pattern.type_arguments.length; i++) {
                if (!matchTypeSingle(variables, pattern.type_arguments[i], subject.type_arguments[i])) {
                    return false;
                }
            }
            return true;
        }
        else if (pattern.tag === "type-primitive" && subject.tag === "type-primitive") {
            return pattern.primitive === subject.primitive;
        }
        else {
            return false;
        }
    }
    /// `matchTypes` compares a `subject` to a particular `pattern`, returning a
    /// possible instantiation of the variables named in `forAny` such that the
    /// subject is equal to the instantiated pattern, or `null` if there is no such
    /// instantiation.
    function matchTypes(forAny, pattern, subject) {
        if (pattern.length !== subject.length) {
            throw new Error("invalid");
        }
        let mapping = new Map();
        for (let t of forAny) {
            mapping.set(t, null);
        }
        for (let i = 0; i < pattern.length; i++) {
            if (!matchTypeSingle(mapping, pattern[i], subject[i])) {
                return null;
            }
        }
        for (let [k, v] of mapping) {
            if (!v) {
                // All variables must be referenced in the pattern.
                console.error("mapping:", mapping);
                console.error("Illegal pattern in matchTypes:", pattern);
                throw new Error("pattern variable `" + k + "` is not referenced in pattern.");
            }
        }
        return mapping;
    }
    function isTruthy(value) {
        if (value.sort !== "boolean") {
            throw new Error("bad value sort for isTruthy `" + value.sort + "`");
        }
        return value.boolean;
    }
    class Frame {
        constructor() {
            this.stack = [];
            this.variables = new Map();
        }
        define(definition, value) {
            const slot = this.stack.length;
            this.stack.push({
                name: definition.variable,
                t: definition.type,
                value,
                previous: this.variables.get(definition.variable)
            });
            this.variables.set(definition.variable, slot);
        }
        load(name) {
            const v = this.variables.get(name);
            if (v === undefined) {
                throw new Error("variable `" + name + "` is not defined");
            }
            return this.stack[v].value;
        }
        stackSize() {
            return this.stack.length;
        }
        pop(slice) {
            const removed = this.stack.splice(slice);
            for (let i = removed.length - 1; i >= 0; i--) {
                const e = removed[i];
                if (e.previous === undefined) {
                    this.variables.delete(e.name);
                }
                else {
                    this.variables.set(e.name, e.previous);
                }
            }
        }
    }
    function interpret(fn, args, program, foreign) {
        const constraintContext = {
            global: new Map(),
            local: new Map(),
        };
        for (const k in program.globalVTableFactories) {
            const factory = program.globalVTableFactories[k];
            let group = constraintContext.global.get(factory.provides.interface);
            if (group === undefined) {
                group = {};
                constraintContext.global.set(factory.provides.interface, group);
            }
            group[k] = factory;
        }
        const context = {
            program,
            foreign,
            constraintContext,
        };
        const iter = interpretCall(fn, args, [], context);
        while (true) {
            const x = iter.next();
            if (x.done) {
                return x.value;
            }
        }
    }
    exports.interpret = interpret;
    /// Execute a Shiru program until termination, returning the result from the
    /// given `entry` function.
    function* interpretCall(fnName, args, vtables, context) {
        if (!context.program.functions[fnName]) {
            throw new Error("The program has no function named `" + fnName + "`");
        }
        const fn = context.program.functions[fnName];
        if (fn.signature.constraint_parameters.length !== vtables.length) {
            throw new Error("interpretCall: Wrong number of constraint parameters");
        }
        const newContext = {
            ...context,
            constraintContext: {
                global: context.constraintContext.global,
                local: new Map(),
            },
        };
        for (let i = 0; i < vtables.length; i++) {
            const vtable = vtables[i];
            const constraint = fn.signature.constraint_parameters[i];
            let group = newContext.constraintContext.local.get(constraint.interface);
            if (group === undefined) {
                group = [];
                newContext.constraintContext.local.set(constraint.interface, group);
            }
            group.push({
                vtable,
                provides: constraint,
            });
        }
        const frame = new Frame();
        for (let i = 0; i < args.length; i++) {
            frame.define(fn.signature.parameters[i], args[i]);
        }
        const result = yield* interpretBlock(fn.body, frame, newContext);
        if (result === null) {
            throw new Error("Function `" + fnName + "` failed to return a result");
        }
        return result;
    }
    function* interpretBlock(block, frame, context, callback) {
        const initialStack = frame.stackSize();
        for (let op of block.ops) {
            const result = yield* interpretOp(op, frame, context);
            if (result !== null) {
                return result;
            }
        }
        if (callback !== undefined) {
            callback();
        }
        frame.pop(initialStack);
        return null;
    }
    function* interpretOp(op, frame, context) {
        yield {};
        if (op.tag === "op-return") {
            return op.sources.map(variable => frame.load(variable));
        }
        else if (op.tag === "op-const") {
            let value;
            if (op.type === "Boolean") {
                value = { sort: "boolean", boolean: op.boolean };
            }
            else if (op.type === "Int") {
                value = { sort: "int", int: BigInt(op.int) };
            }
            else if (op.type === "Bytes") {
                value = { sort: "bytes", bytes: op.bytes };
            }
            else {
                const _ = op;
                throw new Error("interpretOp: unhandled op-const value");
            }
            frame.define(op.destination, value);
            return null;
        }
        else if (op.tag === "op-copy") {
            for (const copy of op.copies) {
                const sourceValue = frame.load(copy.source);
                frame.define(copy.destination, sourceValue);
            }
            return null;
        }
        else if (op.tag === "op-static-call") {
            const args = op.arguments.map(variable => frame.load(variable));
            const constraintArgs = [];
            const signature = context.program.functions[op.function].signature;
            const instantiation = ir.typeArgumentsMap(signature.type_parameters, op.type_arguments);
            for (let constraintTemplate of signature.constraint_parameters) {
                const subjects = constraintTemplate.subjects.map(t => ir.typeSubstitute(t, instantiation));
                const constraint = {
                    interface: constraintTemplate.interface,
                    subjects,
                };
                const vtableProducer = makeVTableProducer(context.constraintContext, constraint);
                const vtable = vtableProducer(context.constraintContext, []);
                constraintArgs.push(vtable);
            }
            const result = yield* interpretCall(op.function, args, constraintArgs, context);
            for (let i = 0; i < result.length; i++) {
                frame.define(op.destinations[i], result[i]);
            }
            return null;
        }
        else if (op.tag === "op-foreign") {
            const args = op.arguments.map(source => frame.load(source));
            const f = context.foreign[op.operation];
            if (f === undefined) {
                throw new Error("interpretOp: no implementation for `" + op.operation + "`");
            }
            const result = f(args);
            for (let i = 0; i < op.destinations.length; i++) {
                frame.define(op.destinations[i], result[i]);
            }
            return null;
        }
        else if (op.tag === "op-branch") {
            const conditionValue = frame.load(op.condition);
            const condition = isTruthy(conditionValue);
            const branch = condition ? op.trueBranch : op.falseBranch;
            const result = yield* interpretBlock(branch, frame, context);
            return result;
        }
        else if (op.tag === "op-dynamic-call") {
            const args = op.arguments.map(arg => frame.load(arg));
            const vtableProducer = makeVTableProducer(context.constraintContext, op.constraint);
            const int = context.program.interfaces[op.constraint.interface];
            const signature = int.signatures[op.signature_id];
            const interfaceMap = ir.typeArgumentsMap(int.type_parameters, op.constraint.subjects);
            const signatureMap = ir.typeArgumentsMap(signature.type_parameters, op.signature_type_arguments);
            const substitutionMap = new Map([...interfaceMap.entries(), ...signatureMap.entries()]);
            const callsite = [];
            for (const genericConstraint of signature.constraint_parameters) {
                const neededConstraint = ir.constraintSubstitute(genericConstraint, substitutionMap);
                const argumentProducer = makeVTableProducer(context.constraintContext, neededConstraint);
                const callsiteVTable = argumentProducer(context.constraintContext, []);
                callsite.push(callsiteVTable);
            }
            const vtable = vtableProducer(context.constraintContext, callsite);
            const spec = vtable.entries[op.signature_id];
            const constraintArgs = spec.closureConstraints;
            const result = yield* interpretCall(spec.implementation, args, constraintArgs, context);
            for (let i = 0; i < result.length; i++) {
                frame.define(op.destinations[i], result[i]);
            }
            return null;
        }
        else if (op.tag === "op-proof") {
            // Do nothing.
            return null;
        }
        else if (op.tag === "op-proof-eq") {
            throw new Error("unexpected op-proof-eq");
        }
        else if (op.tag === "op-new-record") {
            const recordValue = {
                sort: "record",
                fields: {},
            };
            for (let f in op.fields) {
                recordValue.fields[f] = frame.load(op.fields[f]);
            }
            frame.define(op.destination, recordValue);
            return null;
        }
        else if (op.tag === "op-new-enum") {
            const enumValue = {
                sort: "enum",
                field: {},
            };
            enumValue.field[op.variant] = frame.load(op.variantValue);
            frame.define(op.destination, enumValue);
            return null;
        }
        else if (op.tag === "op-field") {
            const recordValue = frame.load(op.object);
            if (recordValue.sort !== "record") {
                throw new Error("bad value sort for field access");
            }
            frame.define(op.destination, recordValue.fields[op.field]);
            return null;
        }
        else if (op.tag === "op-variant") {
            const compoundValue = frame.load(op.object);
            if (compoundValue.sort !== "enum") {
                throw new Error("bad value sort for variant access");
            }
            const variant = compoundValue.field[op.variant];
            if (variant === undefined) {
                throw new RuntimeErr([
                    "Retrieve uninitialized variant at",
                    op.diagnostic_location || " (unknown location)",
                ]);
            }
            frame.define(op.destination, variant);
            return null;
        }
        else if (op.tag === "op-unreachable") {
            throw new RuntimeErr([
                "Hit unreachable op at",
                op.diagnostic_location || " (unknown location)",
            ]);
        }
        else if (op.tag === "op-is-variant") {
            const base = frame.load(op.base);
            if (base.sort !== "enum") {
                throw new Error("bad value sort for is-variant");
            }
            const contains = op.variant in base.field;
            frame.define(op.destination, { sort: "boolean", boolean: contains });
            return null;
        }
        const _ = op;
        throw new Error("interpretOp: unhandled op tag `" + op["tag"] + "`");
    }
    class RuntimeErr {
        constructor(message) {
            this.message = message;
        }
    }
    exports.RuntimeErr = RuntimeErr;
    function showType(t) {
        if (t.tag === "type-compound") {
            const generics = "[" + t.type_arguments.map(x => showType(x)).join(", ") + "]";
            return t.base + generics;
        }
        else if (t.tag === "type-primitive") {
            return t.primitive;
        }
        else if (t.tag === "type-variable") {
            return "#" + t.id;
        }
        else if (t.tag === "type-any") {
            return "Any";
        }
        const _ = t;
        throw new Error("showType: unknown tag `" + t["tag"] + "`");
    }
    function printProgram(program, lines) {
        for (let fnName in program.functions) {
            printFn(program, fnName, lines);
        }
    }
    exports.printProgram = printProgram;
    function printFn(program, fnName, lines) {
        const fn = program.functions[fnName];
        const context = { typeVariables: [] };
        for (let i = 0; i < fn.signature.type_parameters.length; i++) {
            context.typeVariables[i] = "T" + i;
        }
        const parameters = [];
        for (const parameter of fn.signature.parameters) {
            parameters.push(parameter.variable + ": " + showType(parameter.type));
        }
        const typeParameters = context.typeVariables.map(x => "#" + x).join(", ");
        lines.push("fn " + fnName + "[" + typeParameters + "](" + parameters.join(", ") + ")");
        for (const pre of fn.signature.preconditions) {
            lines.push("precondition (" + pre.precondition + ") {");
            printBlockContents(pre.block, "", context, lines);
            lines.push("}");
        }
        for (const post of fn.signature.postconditions) {
            lines.push("postcondition ("
                + post.returnedValues.map(printVariable).join(", ")
                + " -> " + post.postcondition + ") {");
            printBlockContents(post.block, "", context, lines);
            lines.push("}");
        }
        lines.push("body {");
        printBlockContents(fn.body, "", context, lines);
        lines.push("}");
        lines.push("");
    }
    exports.printFn = printFn;
    function printBlockContents(block, indent, context, lines) {
        for (let op of block.ops) {
            printOp(op, indent + "\t", context, lines);
        }
    }
    exports.printBlockContents = printBlockContents;
    function printVariable(variable) {
        return "var " + variable.variable + ": " + showType(variable.type);
    }
    function printOp(op, indent, context, lines) {
        if (op.tag === "op-branch") {
            const cond = op.condition;
            lines.push(indent + "if " + cond + " {");
            printBlockContents(op.trueBranch, indent, context, lines);
            lines.push(indent + "}");
            for (const phi of op.destinations) {
                lines.push(indent + "\t" + phi.destination.variable + " := " + phi.trueSource.variable);
            }
            lines.push(indent + "else {");
            printBlockContents(op.falseBranch, indent, context, lines);
            lines.push(indent + "}");
            for (const phi of op.destinations) {
                lines.push(indent + "\t" + phi.destination.variable + " := " + phi.falseSource.variable);
            }
            // TODO: Format destinations?
            return;
        }
        else if (op.tag === "op-return") {
            lines.push(indent + "return " + op.sources.join(", ") + ";");
            return;
        }
        else if (op.tag === "op-const") {
            const lhs = printVariable(op.destination);
            if (op.type === "Int") {
                lines.push(indent + lhs + " = " + op.int + ";");
            }
            else if (op.type === "Boolean") {
                lines.push(indent + lhs + " = " + op.boolean + ";");
            }
            else if (op.type === "Bytes") {
                lines.push(indent + lhs + " = " + JSON.stringify(op.bytes) + ";");
            }
            else {
                const _ = op;
                throw new Error("printOp: unrecognized const type");
            }
            return;
        }
        else if (op.tag === "op-copy") {
            const lhs = op.copies.map(x => printVariable(x.destination));
            const rhs = op.copies.map(x => x.source);
            lines.push(indent + lhs.join(", ") + " = " + rhs.join(", ") + ";");
            return;
        }
        else if (op.tag === "op-foreign") {
            const lhs = op.destinations.map(printVariable).join(", ");
            const rhs = op.operation + "(" + op.arguments.join(", ") + ");";
            lines.push(indent + lhs + " = " + rhs);
            return;
        }
        else if (op.tag === "op-unreachable") {
            lines.push(indent + "unreachable; // " + op.diagnostic_kind);
            return;
        }
        else if (op.tag === "op-static-call") {
            const targs = op.type_arguments.map(x => showType(x));
            const lhs = op.destinations.map(x => printVariable).join(", ");
            const rhs = op.function + "[" + targs.join(", ") + "](" + op.arguments.join(", ") + ");";
            lines.push(indent + lhs + " = " + rhs);
            return;
        }
        else if (op.tag === "op-proof") {
            lines.push(indent + "proof {");
            printBlockContents(op.body, indent, context, lines);
            lines.push(indent + "}");
            return;
        }
        else if (op.tag === "op-dynamic-call") {
            const f = op.constraint + "." + op.signature_id;
            const targs = op.signature_type_arguments.map(x => showType(x));
            const lhs = op.destinations.map(x => printVariable(x)).join(", ");
            const rhs = f + "[" + targs.join(", ") + "](" + op.arguments.join(", ") + ")";
            lines.push(indent + lhs + " = " + rhs + ";");
            return;
        }
        else if (op.tag === "op-field") {
            const lhs = printVariable(op.destination);
            const rhs = op.object + "." + op.field;
            lines.push(indent + lhs + " = " + rhs + ";");
            return;
        }
        else if (op.tag === "op-new-record") {
            const lhs = printVariable(op.destination);
            const args = [];
            for (let k in op.fields) {
                args.push(k + " = " + op.fields[k]);
            }
            const recordType = showType(op.destination.type);
            const recordLiteral = recordType + "{" + args.join(", ") + "}";
            lines.push(indent + lhs + " = " + recordLiteral + ";");
            return;
        }
        else if (op.tag === "op-new-enum") {
            const lhs = printVariable(op.destination);
            const enumType = showType(op.destination.type);
            const arg = op.variant + " = " + op.variantValue;
            const enumLiteral = enumType + "{" + arg + "}";
            lines.push(indent + lhs + " = " + enumLiteral + ";");
            return;
        }
        else if (op.tag === "op-is-variant") {
            const lhs = printVariable(op.destination);
            lines.push(indent + lhs + " = " + op.base + " is " + op.variant + ";");
            return;
        }
        else if (op.tag === "op-variant") {
            const lhs = printVariable(op.destination);
            lines.push(indent + lhs + " = " + op.object + "." + op.variant + ";");
            return;
        }
        else if (op.tag === "op-proof-eq") {
            const lhs = printVariable(op.destination);
            lines.push(indent + lhs + " = " + op.left + " proof== " + op.right + ";");
            return;
        }
        const _ = op;
        lines.push(indent + "??? " + op["tag"] + " ???");
    }
    exports.printOp = printOp;
});
define("shiru/data", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DisjointSet = exports.DefaultMap = exports.TrieMap = void 0;
    /// TrieMap implements a map where keys are arrays.
    /// This is implemented using a "trie" of ES6 Map objects.
    class TrieMap {
        constructor() {
            // Unfortunately, more accurate typing of this very elaborate.
            this.map = new Map();
            this.value = undefined;
        }
        get(key, from) {
            from = from || 0;
            if (key.length === from) {
                return this.value;
            }
            else {
                const head = key[from];
                const child = this.map.get(head);
                if (child) {
                    return child.get(key, from + 1);
                }
                else {
                    return undefined;
                }
            }
        }
        put(key, v, from) {
            from = from || 0;
            if (key.length === from) {
                this.value = v;
            }
            else {
                const head = key[from];
                let child = this.map.get(head);
                if (!child) {
                    child = new TrieMap;
                    this.map.set(key[from], child);
                }
                child.put(key, v, from + 1);
            }
        }
        /// Iterate over [K[], V] pairs in this map.
        /// N.B.: The key array is retained and mutated by this generator, so it
        // should not be retained or modified by the caller.
        *[Symbol.iterator](progress = []) {
            if (this.value !== undefined) {
                yield [progress, this.value];
            }
            for (let [key, tree] of this.map) {
                progress.push(key);
                yield* tree[Symbol.iterator](progress);
                progress.pop();
            }
        }
    }
    exports.TrieMap = TrieMap;
    class DefaultMap {
        constructor(defaulter) {
            this.defaulter = defaulter;
            this.map = new Map();
        }
        get(key) {
            if (this.map.has(key)) {
                return this.map.get(key);
            }
            else {
                const v = this.defaulter(key);
                this.map.set(key, v);
                return v;
            }
        }
        *[Symbol.iterator]() {
            yield* this.map[Symbol.iterator]();
        }
    }
    exports.DefaultMap = DefaultMap;
    ;
    /// DisjointSet implements the "disjoint set" (a.k.a. "union find") data-
    /// structure, which tracks the set of components in an undirected graph between
    /// a set of integers {0, 1, 2, ... n} as edges are added.
    /// This implementation is augmented with information about "keys" so that
    /// queries can find a path between two nodes in the same component.
    class DisjointSet {
        constructor() {
            this.parents = new Map();
            this.ranks = new Map();
            this.outgoingEdges = new Map();
        }
        reset() {
            for (const [k, _] of this.parents) {
                this.parents.set(k, k);
                this.ranks.set(k, 0);
                this.outgoingEdges.set(k, []);
            }
        }
        init(e) {
            if (!this.parents.has(e)) {
                this.parents.set(e, e);
                this.ranks.set(e, 0);
                this.outgoingEdges.set(e, []);
            }
        }
        /// representative returns a "representative" element of the given object's
        /// equivalence class, such that two elements are members of the same
        /// equivalence class if and only if their representatives are the same.
        representative(e) {
            this.init(e);
            while (true) {
                const parent = this.parents.get(e);
                if (parent === e) {
                    break;
                }
                const grandparent = this.parents.get(parent);
                this.parents.set(e, grandparent);
                e = grandparent;
            }
            return e;
        }
        /// compareEqual returns whether or not the two objects are members of the
        /// same equivalence class.
        compareEqual(a, b) {
            return this.representative(a) === this.representative(b);
        }
        /// explainEquality returns a sequences of keys linking the two values in
        /// the same component.
        explainEquality(a, b) {
            var _a;
            // Perform BFS on the outgoing edges graph.
            const q = [{ n: a, parent: null }];
            for (let i = 0; i < q.length; i++) {
                const top = q[i];
                if (top.n === b) {
                    let keys = [];
                    let c = top;
                    while (c.parent) {
                        keys.push(c.key);
                        c = c.parent;
                    }
                    return keys;
                }
                for (const e of this.outgoingEdges.get(top.n)) {
                    // The outgoingEdges graph is strictly a tree, so we can avoid
                    // using a set for visited edges by simply skipping edges that
                    // go directly backward.
                    const isBackEdge = e.next === ((_a = top.parent) === null || _a === void 0 ? void 0 : _a.n);
                    if (!isBackEdge) {
                        q.push({
                            n: e.next,
                            parent: top,
                            key: e.key,
                        });
                    }
                }
            }
            throw new Error(`objects ${String(a)} and ${String(b)} are in different components`);
        }
        /// union updates this datastructure to join the equivalence classes of
        /// objects a and b.
        /// RETURNS false when the objects were already members of the same
        ///         equivalence class.
        union(a, b, key) {
            this.init(a);
            this.init(b);
            const ra = this.representative(a);
            const rb = this.representative(b);
            if (ra == rb) {
                return false;
            }
            this.outgoingEdges.get(a).push({ next: b, key: key });
            this.outgoingEdges.get(b).push({ next: a, key: key });
            let child;
            let parent;
            if (this.ranks.get(ra) < this.ranks.get(rb)) {
                child = ra;
                parent = rb;
            }
            else {
                child = rb;
                parent = ra;
            }
            this.parents.set(child, parent);
            if (this.ranks.get(child) === this.ranks.get(parent)) {
                this.ranks.set(parent, this.ranks.get(parent) + 1);
            }
            return true;
        }
        /// RETURNS the set of equivalence classes managed by this data structure.
        components() {
            let components = new Map();
            for (const [e, parent] of this.parents) {
                if (e === parent) {
                    components.set(e, []);
                }
            }
            for (const [e, _] of this.parents) {
                components.get(this.representative(e)).push(e);
            }
            return [...components.values()];
        }
    }
    exports.DisjointSet = DisjointSet;
});
define("shiru/semantics", ["require", "exports", "shiru/ir", "shiru/diagnostics", "shiru/data"], function (require, exports, ir, diagnostics, data_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.compileSources = exports.displayTypeScope = exports.displayConstraint = exports.displayType = void 0;
    /// `ProgramContext` is built up over time to include the "signature"
    /// information needed to check references of one entity by another.
    class ProgramContext {
        constructor() {
            /// `canonicalByQualifiedName` is map from package name to entity name to
            /// canonical name.
            this.canonicalByQualifiedName = {};
            /// `entitiesByCanonical` identifies information of the entity with the
            /// given "canonical" name.of the entity.
            this.entitiesByCanonical = {};
            this.foreignSignatures = {};
            this.sourceContexts = {};
            /// `uncheckedTypes` and `uncheckedConstraints` are initially `[]`, and
            /// become `null` once  enough members have been collected to check that
            /// type arguments implement the required constraints.
            this.uncheckedTypes = [];
            this.uncheckedConstraints = [];
        }
        *namedEntities() {
            for (const key in this.entitiesByCanonical) {
                yield [key, this.entitiesByCanonical[key]];
            }
        }
        getDataEntity(id) {
            const entity = this.entitiesByCanonical[id];
            if (entity === undefined || entity.tag !== "enum" && entity.tag !== "record") {
                throw new Error("getDataEntity: bad id");
            }
            return entity;
        }
        getNamedEntity(canonicalName) {
            const entity = this.entitiesByCanonical[canonicalName];
            if (entity === undefined) {
                return null;
            }
            return entity;
        }
        defineEntity(canonicalName, entity) {
            if (canonicalName in this.entitiesByCanonical) {
                throw new Error("ProgramContext.defineEntity: entity already exists");
            }
            this.entitiesByCanonical[canonicalName] = entity;
        }
        getRecord(recordID) {
            const entity = this.entitiesByCanonical[recordID];
            if (entity === undefined || entity.tag !== "record") {
                throw new Error("ICE: unexpected non-record ID `" + recordID + "`");
            }
            return entity;
        }
        getInterface(interfaceID) {
            const entity = this.entitiesByCanonical[interfaceID];
            if (entity === undefined || entity.tag !== "interface") {
                throw new Error("ICE: unexpected non-interface ID `" + interfaceID + "`");
            }
            return entity;
        }
    }
    function collectInterfaceRecordEntity(programContext, pack, packageName, sourceID, definition) {
        const entityName = definition.entityName.name;
        const bindingLocation = definition.entityName.location;
        if (pack[entityName] !== undefined) {
            const firstCanonical = pack[entityName];
            const firstBinding = programContext.getNamedEntity(firstCanonical);
            throw new diagnostics.EntityRedefinedErr({
                name: `${packageName}.${entityName}`,
                firstBinding: firstBinding.bindingLocation,
                secondBinding: bindingLocation,
            });
        }
        const canonicalName = packageName + "." + entityName;
        let entity;
        if (definition.tag === "record-definition") {
            const thisType = {
                tag: "type-compound",
                base: canonicalName,
                type_arguments: definition.typeParameters.parameters.map(t => ({
                    tag: "type-variable",
                    id: t.name,
                })),
            };
            entity = {
                tag: "record",
                ast: definition,
                bindingLocation,
                sourceID,
                typeScope: {
                    thisType,
                    constraints: [],
                    typeVariables: new Map(),
                    typeVariableList: [],
                },
                // These are filled in by `collectMembers`.
                fields: {},
                fns: {},
                implsByInterface: new data_1.DefaultMap(() => []),
            };
        }
        else if (definition.tag === "enum-definition") {
            const thisType = {
                tag: "type-compound",
                base: canonicalName,
                type_arguments: definition.typeParameters.parameters.map(t => ({
                    tag: "type-variable",
                    id: t.name,
                })),
            };
            entity = {
                tag: "enum",
                ast: definition,
                bindingLocation,
                sourceID,
                typeScope: {
                    thisType,
                    constraints: [],
                    typeVariables: new Map(),
                    typeVariableList: [],
                },
                // These are filled in by `collectMembers`.
                variants: {},
                fns: {},
                implsByInterface: new data_1.DefaultMap(() => []),
            };
        }
        else {
            const thisType = "This";
            entity = {
                tag: "interface",
                ast: definition,
                bindingLocation,
                sourceID,
                // The "first" type-parameter is `This` rather than a named
                // `#T` type-variable.
                typeScope: {
                    thisType: {
                        tag: "type-variable",
                        id: thisType,
                    },
                    constraints: [],
                    typeVariables: new Map(),
                    typeVariableList: [thisType],
                },
                // These are filled in by `collectMembers`.
                fns: {},
            };
        }
        programContext.defineEntity(canonicalName, entity);
        pack[entityName] = canonicalName;
    }
    // Collects the set of entities defined across all given sources.
    function collectAllEntities(sources) {
        const programContext = new ProgramContext();
        programContext.foreignSignatures = getBasicForeign();
        for (const sourceID in sources) {
            const source = sources[sourceID];
            const packageName = source.package.packageName.name;
            const pack = programContext.canonicalByQualifiedName[packageName] || {};
            programContext.canonicalByQualifiedName[packageName] = pack;
            for (let definition of source.definitions) {
                if (definition.tag === "impl-definition") {
                    // These are instead collected in `resolveSourceContext`.
                }
                else {
                    collectInterfaceRecordEntity(programContext, pack, packageName, sourceID, definition);
                }
            }
        }
        return programContext;
    }
    /// RETURNS the canonicalized version of the given entity name within the given
    /// source context.
    function resolveEntity(t, sourceContext) {
        if (t.packageQualification !== null) {
            const namespaceQualifier = t.packageQualification.package.name;
            const namespace = sourceContext.namespaces[namespaceQualifier];
            if (!namespace) {
                throw new diagnostics.NoSuchPackageErr({
                    packageName: namespaceQualifier,
                    reference: t.packageQualification.location,
                });
            }
            const entitiesInNamespace = sourceContext.programContext.canonicalByQualifiedName[namespaceQualifier];
            const canonicalName = entitiesInNamespace[t.entity.name];
            if (!canonicalName) {
                throw new diagnostics.NoSuchEntityErr({
                    entityName: namespace.packageName + "." + t.entity.name,
                    reference: t.entity.location,
                });
            }
            return canonicalName;
        }
        else {
            const bound = sourceContext.entityAliases[t.entity.name];
            if (!bound) {
                throw new diagnostics.NoSuchEntityErr({
                    entityName: t.entity.name,
                    reference: t.entity.location,
                });
            }
            return bound.canonicalName;
        }
    }
    function compileConstraint(
    // TODO: Use a `grammar.TypeConstraint` instead.
    c, methodSubject, sourceContext, scope, checkConstraints, 
    /// The location of the constraint, including the method subject.
    constraintLocation) {
        const programContext = sourceContext.programContext;
        if (programContext.uncheckedConstraints !== null) {
            if (checkConstraints === "skip") {
                programContext.uncheckedConstraints.push({
                    c,
                    methodSubject,
                    sourceContext,
                    scope,
                    constraintLocation,
                });
                checkConstraints = "skip-internal";
            }
        }
        else if (checkConstraints !== "check") {
            throw new Error("compileConstraint: invalid `checkConstraints` argument.");
        }
        // Resolve the entity.
        const canonicalName = resolveEntity(c, sourceContext);
        const interfaceEntity = programContext.getNamedEntity(canonicalName);
        if (interfaceEntity.tag !== "interface") {
            throw new diagnostics.TypeUsedAsConstraintErr({
                name: canonicalName,
                kind: interfaceEntity.tag,
                typeLocation: c.location,
            });
        }
        const argumentSubjects = c.arguments.map(a => compileType(a, scope, sourceContext, checkConstraints));
        if (checkConstraints === "check") {
            const expectedLocations = [];
            for (let [_, binding] of interfaceEntity.typeScope.typeVariables) {
                expectedLocations.push({
                    location: binding.bindingLocation,
                });
            }
            if (c.arguments.length !== expectedLocations.length) {
                throw new diagnostics.TypeParameterCountMismatchErr({
                    entityType: "interface",
                    entityName: canonicalName,
                    expectedCount: expectedLocations.length,
                    expectedLocation: ir.locationsSpan(expectedLocations),
                    givenCount: c.arguments.length,
                    givenLocation: c.location,
                });
            }
            const allArguments = [methodSubject, ...argumentSubjects];
            if (interfaceEntity.typeScope.typeVariableList[0] !== interfaceEntity.typeScope.thisType.id) {
                throw new Error("ICE: First InterfaceEntity type parameter must be `this` type");
            }
            const instantiation = ir.typeArgumentsMap(interfaceEntity.typeScope.typeVariableList, allArguments);
            const thisType = interfaceEntity.typeScope.thisType;
            if (thisType === null) {
                throw new Error("compileConstraint: InterfaceEntity thisType must be a type variable.");
            }
            for (const requirementBinding of interfaceEntity.typeScope.constraints) {
                const genericConstraint = requirementBinding.constraint;
                const instantiated = ir.constraintSubstitute(genericConstraint, instantiation);
                checkConstraintSatisfied(instantiated, scope, sourceContext, {
                    constraintDeclaredAt: requirementBinding.location,
                    neededAt: constraintLocation,
                });
            }
        }
        return {
            interface: canonicalName,
            subjects: [methodSubject, ...argumentSubjects],
        };
    }
    function allEqualTypes(a, b) {
        if (a.length !== b.length) {
            throw new Error("length mismatch");
        }
        for (let i = 0; i < a.length; i++) {
            if (!ir.equalTypes(a[i], b[i])) {
                return false;
            }
        }
        return true;
    }
    function checkConstraintSatisfied(requiredConstraint, typeScope, sourceContext, { constraintDeclaredAt, neededAt }) {
        const programContext = sourceContext.programContext;
        const methodSubject = requiredConstraint.subjects[0];
        if (methodSubject === undefined) {
            throw new Error("ICE: Constraint requires at least one subject.");
        }
        else if (methodSubject.tag === "type-compound") {
            const baseEntity = programContext.getDataEntity(methodSubject.base);
            const implCandidates = baseEntity.implsByInterface.get(requiredConstraint.interface);
            for (const impl of implCandidates) {
                // Check whether `impl.constraint` may be instantiated by replacing
                // `impl.typeScope`'s variables to become `requiredConstraint`.
                const unifier = ir.unifyTypes(impl.typeScope.typeVariableList, impl.constraint.subjects, [], requiredConstraint.subjects);
                if (unifier !== null) {
                    // This instantiation was possible.
                    return;
                }
            }
            // No implementation was found in the record entity.
        }
        else if (methodSubject.tag === "type-variable") {
            // Consult the typeScope.
            for (const { constraint } of typeScope.constraints) {
                if (allEqualTypes(constraint.subjects, requiredConstraint.subjects)) {
                    return;
                }
            }
            // No implementation was found in the type scope.
        }
        else if (methodSubject.tag === "type-primitive") {
            // TODO: Defer to the "built in" set of constraints (Eq, etc).
        }
        else if (methodSubject.tag === "type-any") {
            // TODO: Emit a custom message indicating that a cast is required.
        }
        else {
            const _ = methodSubject;
            throw new Error("checkConstraintSatisfied: Unhandled methodSubject tag `" + methodSubject["tag"] + "`");
        }
        throw new diagnostics.TypesDontSatisfyConstraintErr({
            neededConstraint: displayConstraint(requiredConstraint),
            neededLocation: neededAt,
            constraintLocation: constraintDeclaredAt,
        });
    }
    /// `compileType` transforms an AST type into an IR type.
    /// When `checkConstraints` is `"check"`, type arguments must satisfy the
    /// constraints indicated by the base type. However, this cannot be `"skip"`
    /// until `ProgramContext.hasCollectedMembers` becomes `true`.
    function compileType(t, scope, sourceContext, checkConstraints) {
        if (sourceContext.programContext.uncheckedTypes !== null) {
            if (checkConstraints === "skip") {
                sourceContext.programContext.uncheckedTypes.push({
                    t, scope, sourceContext
                });
                checkConstraints = "skip-internal";
            }
        }
        else if (checkConstraints !== "check") {
            throw new Error("compileType: invalid `checkConstraints` argument");
        }
        if (t.tag === "type-keyword") {
            if (t.keyword === "This") {
                if (scope.thisType === null) {
                    throw new diagnostics.InvalidThisTypeErr({
                        referenced: t.location,
                    });
                }
                return scope.thisType;
            }
            else if (t.keyword === "String") {
                return {
                    tag: "type-primitive",
                    primitive: "Bytes",
                };
            }
            else if (t.keyword === "Any") {
                return ir.T_ANY;
            }
            else {
                return {
                    tag: "type-primitive",
                    primitive: t.keyword,
                };
            }
        }
        else if (t.tag === "named") {
            // Resolve the entity.
            const canonicalName = resolveEntity(t, sourceContext);
            const entity = sourceContext.programContext.getNamedEntity(canonicalName);
            if (entity.tag === "interface") {
                throw new diagnostics.NonTypeEntityUsedAsTypeErr({
                    entity: canonicalName,
                    entityTag: entity.tag,
                    useLocation: t.entity.location,
                    entityBinding: entity.bindingLocation,
                });
            }
            const typeArguments = t.arguments.map(a => compileType(a, scope, sourceContext, checkConstraints));
            if (checkConstraints === "check") {
                const expectedTypeParameterCount = entity.typeScope.typeVariableList.length;
                if (typeArguments.length !== expectedTypeParameterCount) {
                    const typeVariableLocations = [];
                    for (let [_, binding] of entity.typeScope.typeVariables) {
                        typeVariableLocations.push({
                            location: binding.bindingLocation,
                        });
                    }
                    throw new diagnostics.TypeParameterCountMismatchErr({
                        entityType: "record",
                        entityName: t.entity.name,
                        expectedCount: expectedTypeParameterCount,
                        expectedLocation: ir.locationsSpan(typeVariableLocations),
                        givenCount: t.arguments.length,
                        givenLocation: t.location,
                    });
                }
                const instantiation = ir.typeArgumentsMap(entity.typeScope.typeVariableList, typeArguments);
                for (let requirementBinding of entity.typeScope.constraints) {
                    const instantiated = ir.constraintSubstitute(requirementBinding.constraint, instantiation);
                    checkConstraintSatisfied(instantiated, scope, sourceContext, {
                        constraintDeclaredAt: requirementBinding.location,
                        neededAt: t.location,
                    });
                }
            }
            return {
                tag: "type-compound",
                base: canonicalName,
                type_arguments: typeArguments,
            };
        }
        else if (t.tag === "type-var") {
            const id = scope.typeVariables.get(t.name);
            if (id === undefined) {
                throw new diagnostics.NoSuchTypeVariableErr({
                    typeVariableName: t.name,
                    location: t.location,
                });
            }
            return id.variable;
        }
        const _ = t;
        throw new Error("compileType: unhandled tag `" + t["tag"] + "`");
    }
    /// `resolveImport` MODIFIES the given `sourceContext` to include the
    /// entity or namespace introduced by the given import.
    function resolveImport(imported, sourcePackage, sourceContext, programContext) {
        if (imported.tag === "of-object") {
            const packageName = imported.packageName.name;
            const packageEntities = programContext.canonicalByQualifiedName[packageName];
            if (packageEntities === undefined) {
                throw new diagnostics.NoSuchPackageErr({
                    packageName,
                    reference: imported.packageName.location,
                });
            }
            const entityName = imported.objectName.name;
            const canonicalName = packageEntities[entityName];
            if (canonicalName === undefined) {
                throw new diagnostics.NoSuchEntityErr({
                    entityName: `${packageName}.${entityName}`,
                    reference: imported.location,
                });
            }
            if (sourceContext.entityAliases[entityName] !== undefined) {
                throw new diagnostics.EntityRedefinedErr({
                    name: entityName,
                    firstBinding: sourceContext.entityAliases[entityName].bindingLocation,
                    secondBinding: imported.objectName.location,
                });
            }
            sourceContext.entityAliases[entityName] = {
                canonicalName,
                bindingLocation: imported.objectName.location,
            };
        }
        else if (imported.tag === "of-package") {
            const packageName = imported.packageName.name;
            if (packageName === sourcePackage.packageName.name) {
                throw new diagnostics.NamespaceAlreadyDefinedErr({
                    namespace: packageName,
                    firstBinding: sourcePackage.packageName.location,
                    secondBinding: imported.packageName.location,
                });
            }
            else if (sourceContext.namespaces[packageName] !== undefined) {
                throw new diagnostics.NamespaceAlreadyDefinedErr({
                    namespace: packageName,
                    firstBinding: sourceContext.namespaces[packageName].bindingLocation,
                    secondBinding: imported.packageName.location,
                });
            }
            sourceContext.namespaces[packageName] = {
                packageName,
                bindingLocation: imported.packageName.location,
            };
        }
    }
    function resolveSourceContext(sourceID, source, programContext) {
        const packageName = source.package.packageName.name;
        const pack = programContext.canonicalByQualifiedName[packageName];
        const sourceContext = {
            entityAliases: {},
            namespaces: {},
            implASTs: [],
            programContext,
        };
        for (const definition of source.definitions) {
            if (definition.tag === "impl-definition") {
                // impls will only be processed after all available types have been
                // resolved.
                sourceContext.implASTs.push(definition);
            }
        }
        // Bring all entities defined within this package into scope.
        for (let entityName in pack) {
            const canonicalName = pack[entityName];
            const binding = programContext.getNamedEntity(canonicalName);
            sourceContext.entityAliases[entityName] = {
                canonicalName,
                bindingLocation: binding.bindingLocation,
            };
        }
        // Bring all imports into scope.
        for (const { imported } of source.imports) {
            resolveImport(imported, source.package, sourceContext, programContext);
        }
        programContext.sourceContexts[sourceID] = sourceContext;
    }
    function collectTypeScope(sourceContext, typeScope, typeParameters) {
        for (const parameter of typeParameters.parameters) {
            const id = parameter.name;
            const existingBinding = typeScope.typeVariables.get(id);
            if (existingBinding !== undefined) {
                throw new diagnostics.TypeVariableRedefinedErr({
                    typeVariableName: parameter.name,
                    firstBinding: existingBinding.bindingLocation,
                    secondBinding: parameter.location,
                });
            }
            typeScope.typeVariables.set(id, {
                variable: { tag: "type-variable", id },
                bindingLocation: parameter.location,
            });
            typeScope.typeVariableList.push(parameter.name);
        }
        for (let c of typeParameters.constraints) {
            const methodSubject = compileType(c.methodSubject, typeScope, sourceContext, "skip");
            const constraint = compileConstraint(c.constraint, methodSubject, sourceContext, typeScope, "skip", c.location);
            typeScope.constraints.push({
                constraint,
                location: c.location,
            });
        }
    }
    /// Collects enough information to determine which types satisfy which
    /// interfaces, so that types collected in `collectMembers` can be ensured to be
    /// valid.
    function resolveAvailableTypes(programContext, entity) {
        if (entity.tag === "record") {
            collectTypeScope(programContext.sourceContexts[entity.sourceID], entity.typeScope, entity.ast.typeParameters);
            return;
        }
        else if (entity.tag === "enum") {
            collectTypeScope(programContext.sourceContexts[entity.sourceID], entity.typeScope, entity.ast.typeParameters);
            return;
        }
        else if (entity.tag === "interface") {
            collectTypeScope(programContext.sourceContexts[entity.sourceID], entity.typeScope, entity.ast.typeParameters);
            return;
        }
        const _ = entity;
        throw new Error("collectTypeScopesAndConstraints: unhandled tag `" + entity["tag"] + "`");
    }
    function resolveMemberFn(canonicalName, fn, entityTypeScope, sourceContext) {
        const parameterTypes = fn.signature.parameters.list.map(p => ({
            t: compileType(p.t, entityTypeScope, sourceContext, "check"),
            nameLocation: p.name.location,
            typeLocation: p.t.location,
        }));
        const returnTypes = fn.signature.returns.map(r => ({
            t: compileType(r, entityTypeScope, sourceContext, "check"),
            nameLocation: r.location,
            typeLocation: r.location,
        }));
        return {
            tag: "fn-binding",
            id: canonicalName,
            nameLocation: fn.signature.name.location,
            parameters: parameterTypes,
            parametersLocation: fn.signature.parameters.location,
            returns: returnTypes,
            ast: fn,
            entityTypeVariables: entityTypeScope.typeVariableList,
            signatureTypeVariables: [],
        };
    }
    function resolveRecordMemberSignatures(entity, sourceContext, entityName) {
        // Collect the defined fields.
        for (let field of entity.ast.fields) {
            const fieldName = field.name.name;
            const existingField = entity.fields[fieldName];
            if (existingField !== undefined) {
                throw new diagnostics.MemberRedefinedErr({
                    memberName: fieldName,
                    firstBinding: existingField.nameLocation,
                    secondBinding: field.name.location,
                });
            }
            const fieldType = compileType(field.t, entity.typeScope, sourceContext, "check");
            entity.fields[fieldName] = {
                nameLocation: field.name.location,
                t: fieldType,
                typeLocation: field.t.location,
            };
        }
        // Collect the defined methods.
        for (let fn of entity.ast.fns) {
            const fnName = fn.signature.name.name;
            const existingField = entity.fields[fnName];
            if (existingField !== undefined) {
                throw new diagnostics.MemberRedefinedErr({
                    memberName: fnName,
                    firstBinding: existingField.nameLocation,
                    secondBinding: fn.signature.name.location,
                });
            }
            const existingFn = entity.fns[fnName];
            if (existingFn !== undefined) {
                throw new diagnostics.MemberRedefinedErr({
                    memberName: fnName,
                    firstBinding: existingFn.nameLocation,
                    secondBinding: fn.signature.name.location,
                });
            }
            const canonicalName = canonicalFunctionName(entityName, fnName);
            entity.fns[fnName] = resolveMemberFn(canonicalName, fn, entity.typeScope, sourceContext);
        }
    }
    function resolveEnumMemberSignatures(entity, sourceContext, entityName) {
        // Collect the defined variants.
        for (const variant of entity.ast.variants) {
            const variantName = variant.name.name;
            const existingVariant = entity.variants[variantName];
            if (existingVariant !== undefined) {
                throw new diagnostics.MemberRedefinedErr({
                    memberName: variantName,
                    firstBinding: existingVariant.nameLocation,
                    secondBinding: variant.name.location,
                });
            }
            const variantType = compileType(variant.t, entity.typeScope, sourceContext, "check");
            entity.variants[variantName] = {
                nameLocation: variant.name.location,
                t: variantType,
                typeLocation: variant.t.location,
            };
        }
        // Collect the defined methods.
        for (const fn of entity.ast.fns) {
            const fnName = fn.signature.name.name;
            const existingVariant = entity.variants[fnName];
            if (existingVariant !== undefined) {
                throw new diagnostics.MemberRedefinedErr({
                    memberName: fnName,
                    firstBinding: existingVariant.nameLocation,
                    secondBinding: fn.signature.name.location,
                });
            }
            const existingFn = entity.fns[fnName];
            if (existingFn !== undefined) {
                throw new diagnostics.MemberRedefinedErr({
                    memberName: fnName,
                    firstBinding: existingFn.nameLocation,
                    secondBinding: fn.signature.name.location,
                });
            }
            const canonicalName = canonicalFunctionName(entityName, fnName);
            entity.fns[fnName] = resolveMemberFn(canonicalName, fn, entity.typeScope, sourceContext);
        }
    }
    function resolveInterfaceMemberSignatures(entity, sourceContext) {
        // Collect the defined methods.
        for (const member of entity.ast.members) {
            const fnName = member.signature.name.name;
            const existingFn = entity.fns[fnName];
            if (existingFn !== undefined) {
                throw new diagnostics.MemberRedefinedErr({
                    memberName: fnName,
                    firstBinding: existingFn.nameLocation,
                    secondBinding: member.signature.name.location,
                });
            }
            const parameterTypes = member.signature.parameters.list.map(p => ({
                t: compileType(p.t, entity.typeScope, sourceContext, "check"),
                nameLocation: p.name.location,
                typeLocation: p.t.location,
            }));
            const returnTypes = member.signature.returns.map(r => ({
                t: compileType(r, entity.typeScope, sourceContext, "check"),
                nameLocation: r.location,
                typeLocation: r.location,
            }));
            entity.fns[fnName] = {
                tag: "vtable-binding",
                signature_id: fnName,
                nameLocation: member.signature.name.location,
                parameters: parameterTypes,
                parametersLocation: member.signature.parameters.location,
                returns: returnTypes,
                ast: member,
                interfaceTypeVariables: entity.typeScope.typeVariableList,
                signatureTypeVariables: [],
            };
        }
    }
    /// Collects the "signatures" such that references to this entity within the
    /// bodies of other entities can be type-checked.
    /// Constraints must have already been collected in all entities using
    /// `collectTypeScopesAndConstraints` prior to invoking `collectMembers`.
    /// NOTE that this does NOT include compiling "requires" and "ensures" clauses,
    /// which are compiled alongside function bodies in a later pass.
    function resolveMemberSignatures(programContext, entityName, entity) {
        const sourceContext = programContext.sourceContexts[entity.sourceID];
        if (entity.tag === "record") {
            resolveRecordMemberSignatures(entity, sourceContext, entityName);
            return;
        }
        else if (entity.tag === "enum") {
            resolveEnumMemberSignatures(entity, sourceContext, entityName);
            return;
        }
        else if (entity.tag === "interface") {
            resolveInterfaceMemberSignatures(entity, sourceContext);
            return;
        }
        const _ = entity;
        throw new Error("collectMembers: unhandled tag `" + entity["tag"] + "`");
    }
    function canonicalFunctionName(entityName, memberName) {
        return entityName + "." + memberName;
    }
    class VariableStack {
        constructor() {
            this.variables = {};
            this.variableStack = [];
            this.blocks = [];
            this.nextUnique = 1;
        }
        uniqueID(hint) {
            if (hint.indexOf("'") >= 0) {
                throw new Error("hint must not contain `'`");
            }
            const id = hint + "'" + this.nextUnique;
            this.nextUnique += 1;
            return id;
        }
        defineLocal(local, t, location, initialValue) {
            const existing = this.variables[local];
            if (existing !== undefined) {
                throw new diagnostics.VariableRedefinedErr({
                    name: local,
                    firstLocation: existing.bindingLocation,
                    secondLocation: location,
                });
            }
            this.variables[local] = {
                bindingLocation: location,
                t,
                currentValue: initialValue,
                block: this.blocks.length,
            };
            this.variableStack.push(local);
        }
        /// THROWS SemanticError when a variable of this name is not in scope.
        resolve(local) {
            const def = this.variables[local.name];
            if (def === undefined) {
                throw new diagnostics.VariableNotDefinedErr({
                    name: local.name,
                    referencedAt: local.location,
                });
            }
            return {
                localName: local.name,
                bindingLocation: def.bindingLocation,
                t: def.t,
                currentValue: def.currentValue,
            };
        }
        /// `openBlock(proofBlock)` opens a new scope. Variables added after this
        /// call will be deleted when a corresponding `closeBlock()` call is made.
        /// If `proofBlock` is `true`, `isInProofBlock()` will return `true` until
        /// the corresponding `closeBlock()` call is made.
        openBlock(proofBlock) {
            this.blocks.push({
                stackStart: this.variableStack.length,
                assignments: {},
                isProofBlock: proofBlock || this.isInProofBlock(),
            });
        }
        /// `isInProofBlock()` returns `true` when a currently open block passed
        /// `true` as the parameter to `openBlock`.
        isInProofBlock() {
            const top = this.blocks[this.blocks.length - 1];
            return top !== undefined && top.isProofBlock;
        }
        updateLocal(local, newValue) {
            const variable = this.variables[local];
            if (variable.block < this.blocks.length) {
                const currentBlock = this.blocks[this.blocks.length - 1];
                if (currentBlock.assignments[local] === undefined) {
                    currentBlock.assignments[local] = {
                        originalValue: variable.currentValue,
                        latestValue: newValue,
                    };
                }
                else {
                    currentBlock.assignments[local].latestValue = newValue;
                }
            }
            variable.currentValue = newValue;
        }
        /// RETURNS the assignments made to Shiru local variables that live longer
        /// than this block.
        closeBlock() {
            const block = this.blocks.pop();
            if (block === undefined)
                throw new Error("block is not open");
            const removed = this.variableStack.splice(block.stackStart);
            for (const r of removed) {
                delete this.variables[r];
            }
            const assignments = {};
            for (const k in block.assignments) {
                // Revert the variable to its assignment before the block, but return
                // the current assignment (for branching).
                const status = block.assignments[k];
                this.variables[k].currentValue = status.originalValue;
                assignments[k] = status.latestValue;
            }
            return assignments;
        }
    }
    function compileCall(ops, stack, args, fn, 
    /// An assignment for all the signatureTypeVariables and
    /// entityTypeVariables/interfaceTypeVariables.
    typeArgumentMapping, location, constraint) {
        const argValues = [];
        for (const tuple of args) {
            for (let i = 0; i < tuple.values.length; i++) {
                argValues.push({ tuple, i });
            }
        }
        if (argValues.length !== fn.parameters.length) {
            throw new diagnostics.ValueCountMismatchErr({
                actualCount: argValues.length,
                actualLocation: ir.locationsSpan(args),
                expectedCount: fn.parameters.length,
                expectedLocation: fn.parametersLocation,
            });
        }
        const argumentSources = [];
        for (let i = 0; i < argValues.length; i++) {
            const value = argValues[i];
            const valueType = value.tuple.values[value.i].type;
            const templateType = fn.parameters[i].t;
            const expectedType = ir.typeSubstitute(templateType, typeArgumentMapping);
            if (!ir.equalTypes(expectedType, valueType)) {
                throw new diagnostics.TypeMismatchErr({
                    givenType: displayType(valueType),
                    givenLocation: value.tuple.location,
                    givenIndex: {
                        index0: value.i,
                        count: value.tuple.values.length,
                    },
                    expectedType: displayType(expectedType),
                    expectedLocation: fn.parameters[i].nameLocation,
                });
            }
            argumentSources.push(value.tuple.values[value.i].variable);
        }
        const destinations = [];
        for (let i = 0; i < fn.returns.length; i++) {
            const templateType = fn.returns[i].t;
            const returnType = ir.typeSubstitute(templateType, typeArgumentMapping);
            const destination = stack.uniqueID("fncall" + i);
            destinations.push({
                variable: destination,
                type: returnType,
                location,
            });
        }
        if (fn.tag === "fn-binding") {
            const typeArgumentList = [];
            for (const typeParameter of fn.entityTypeVariables) {
                typeArgumentList.push(typeArgumentMapping.get(typeParameter));
            }
            for (const typeParameter of fn.signatureTypeVariables) {
                typeArgumentList.push(typeArgumentMapping.get(typeParameter));
            }
            ops.push({
                tag: "op-static-call",
                function: fn.id,
                arguments: argumentSources,
                type_arguments: typeArgumentList,
                destinations: destinations,
                diagnostic_callsite: location,
            });
            if (constraint !== null) {
                throw new Error("compileCall: expected `null` constraint for fn-binding");
            }
        }
        else {
            if (constraint === null) {
                throw new Error("compileCall: expected non-null constraint for vtable-binding");
            }
            const typeArgumentList = [];
            for (const typeParameter of fn.signatureTypeVariables) {
                typeArgumentList.push(typeArgumentMapping.get(typeParameter));
            }
            ops.push({
                tag: "op-dynamic-call",
                constraint,
                signature_id: fn.signature_id,
                arguments: argumentSources,
                signature_type_arguments: typeArgumentList,
                destinations,
                diagnostic_callsite: location,
            });
        }
        return {
            values: destinations,
            location: location,
        };
    }
    function compileTypeCallExpression(e, ops, stack, typeScope, context) {
        const baseType = compileType(e.t, typeScope, context.sourceContext, "check");
        if (baseType.tag !== "type-compound") {
            throw new diagnostics.CallOnNonCompoundErr({
                baseType: displayType(baseType),
                location: e.t.location,
            });
        }
        const base = context.sourceContext.programContext.getDataEntity(baseType.base);
        const fn = base.fns[e.methodName.name];
        if (fn === undefined) {
            throw new diagnostics.NoSuchFnErr({
                baseType: displayType(baseType),
                methodName: e.methodName.name,
                methodNameLocation: e.methodName.location,
            });
        }
        const args = [];
        for (const arg of e.arguments) {
            args.push(compileExpression(arg, ops, stack, typeScope, context));
        }
        const typeArgumentMapping = new Map();
        if (fn.signatureTypeVariables.length !== 0) {
            throw new Error("TODO: Handle member-scoped type arguments.");
        }
        for (let i = 0; i < baseType.type_arguments.length; i++) {
            typeArgumentMapping.set(fn.entityTypeVariables[i], baseType.type_arguments[i]);
        }
        return compileCall(ops, stack, args, fn, typeArgumentMapping, e.location, null);
    }
    function compileConstraintCallExpression(e, ops, stack, typeScope, context) {
        const subject = compileType(e.constraint.subject, typeScope, context.sourceContext, "check");
        const constraint = compileConstraint(e.constraint.constraint, subject, context.sourceContext, typeScope, "check", e.constraint.location);
        checkConstraintSatisfied(constraint, typeScope, context.sourceContext, {
            neededAt: e.constraint.location,
            constraintDeclaredAt: null,
        });
        const int = context.sourceContext.programContext.getInterface(constraint.interface);
        const fn = int.fns[e.methodName.name];
        if (fn === undefined) {
            throw new diagnostics.NoSuchFnErr({
                baseType: displayConstraint(constraint),
                methodName: e.methodName.name,
                methodNameLocation: e.methodName.location,
            });
        }
        const args = [];
        for (const arg of e.arguments) {
            args.push(compileExpression(arg, ops, stack, typeScope, context));
        }
        const typeArgumentMapping = new Map();
        for (let i = 0; i < constraint.subjects.length; i++) {
            typeArgumentMapping.set(fn.interfaceTypeVariables[i], constraint.subjects[i]);
        }
        if (fn.signatureTypeVariables.length !== 0) {
            throw new Error("TODO: Handle member scoped dynamic type arguments");
        }
        return compileCall(ops, stack, args, fn, typeArgumentMapping, e.location, constraint);
    }
    function compileEnumLiteral(baseEntity, baseType, initializations, ops, stack, location) {
        const variants = {};
        let first = null;
        for (let provided in initializations) {
            const initialization = initializations[provided];
            if (first !== null) {
                throw new diagnostics.MultipleVariantsErr({
                    enumType: displayType(baseType),
                    firstVariant: first.name,
                    firstLocation: first.location,
                    secondVariant: provided,
                    secondLocation: initialization.fieldLocation,
                });
            }
            first = { name: provided, location: initialization.fieldLocation };
            variants[provided] = initialization.values[0].variable;
        }
        if (first === null) {
            throw new diagnostics.EnumLiteralMissingVariantErr({
                enumType: displayType(baseType),
                location,
            });
        }
        const destination = {
            variable: stack.uniqueID("enum" + baseType.base),
            type: baseType,
            location,
        };
        ops.push({
            tag: "op-new-enum",
            enum: baseType.base,
            destination,
            variant: first.name,
            variantValue: variants[first.name],
        });
        return {
            values: [destination],
            location,
        };
    }
    function compileRecordLiteral(baseEntity, baseType, initializations, ops, stack, location) {
        const fields = {};
        for (let required in baseEntity.fields) {
            if (initializations[required] === undefined) {
                throw new diagnostics.UninitializedFieldErr({
                    recordType: displayType(baseType),
                    missingFieldName: required,
                    definedLocation: baseEntity.fields[required].nameLocation,
                    initializerLocation: location,
                });
            }
            fields[required] = initializations[required].values[0].variable;
        }
        const destination = {
            variable: stack.uniqueID("record" + baseType.base),
            type: baseType,
            location,
        };
        ops.push({
            tag: "op-new-record",
            record: baseType.base,
            destination: destination,
            fields,
        });
        return {
            values: [destination],
            location,
        };
    }
    function compileCompoundLiteral(e, ops, stack, typeScope, context) {
        const t = compileType(e.t, typeScope, context.sourceContext, "check");
        if (t.tag !== "type-compound") {
            throw new diagnostics.NonCompoundInRecordLiteralErr({
                t: displayType(t),
                location: e.t.location,
            });
        }
        const programContext = context.sourceContext.programContext;
        const baseEntity = programContext.getDataEntity(t.base);
        const instantiation = ir.typeArgumentsMap(baseEntity.typeScope.typeVariableList, t.type_arguments);
        const initializations = {};
        for (let initAST of e.initializations) {
            const fieldName = initAST.fieldName.name;
            if (initializations[fieldName] !== undefined) {
                throw new diagnostics.MemberRepeatedInCompoundLiteralErr({
                    kind: baseEntity.tag === "enum" ? "variant" : "field",
                    fieldName,
                    firstLocation: initializations[fieldName].fieldLocation,
                    secondLocation: initAST.fieldName.location,
                });
            }
            const fieldDefinition = baseEntity.tag === "record"
                ? baseEntity.fields[fieldName]
                : baseEntity.variants[fieldName];
            if (fieldDefinition === undefined) {
                if (baseEntity.tag === "record") {
                    throw new diagnostics.NoSuchFieldErr({
                        kind: "initialization",
                        recordType: displayType(t),
                        fieldName,
                        location: initAST.fieldName.location,
                    });
                }
                else {
                    throw new diagnostics.NoSuchVariantErr({
                        kind: "initialization",
                        enumType: displayType(t),
                        variantName: fieldName,
                        location: initAST.fieldName.location,
                    });
                }
            }
            const value = compileExpression(initAST.value, ops, stack, typeScope, context);
            if (value.values.length !== 1) {
                throw new diagnostics.MultiExpressionGroupedErr({
                    location: value.location,
                    valueCount: value.values.length,
                    grouping: "field-init",
                });
            }
            const givenType = value.values[0].type;
            const expectedType = ir.typeSubstitute(fieldDefinition.t, instantiation);
            if (!ir.equalTypes(expectedType, givenType)) {
                throw new diagnostics.TypeMismatchErr({
                    givenType: displayType(givenType),
                    givenLocation: value.location,
                    expectedType: displayType(expectedType),
                    expectedLocation: fieldDefinition.typeLocation,
                });
            }
            initializations[fieldName] = {
                ...value,
                fieldLocation: initAST.fieldName.location,
            };
        }
        if (baseEntity.tag === "record") {
            return compileRecordLiteral(baseEntity, t, initializations, ops, stack, e.location);
        }
        else {
            return compileEnumLiteral(baseEntity, t, initializations, ops, stack, e.location);
        }
    }
    function compileExpressionAtom(e, ops, stack, typeScope, context) {
        if (e.tag === "iden") {
            const v = stack.resolve(e);
            const destination = {
                variable: stack.uniqueID("var"),
                type: v.t,
                location: e.location,
            };
            ops.push({
                tag: "op-copy",
                copies: [
                    {
                        source: v.currentValue,
                        destination,
                    }
                ],
            });
            return {
                values: [{
                        type: v.t,
                        variable: destination.variable,
                        location: e.location,
                    }],
                location: e.location,
            };
        }
        else if (e.tag === "paren") {
            const component = compileExpression(e.expression, ops, stack, typeScope, context);
            if (component.values.length !== 1) {
                throw new diagnostics.MultiExpressionGroupedErr({
                    valueCount: component.values.length,
                    location: e.location,
                    grouping: "parens",
                });
            }
            return component;
        }
        else if (e.tag === "number-literal") {
            const destination = {
                variable: stack.uniqueID("number"),
                type: ir.T_INT,
                location: e.location,
            };
            ops.push({
                tag: "op-const",
                destination,
                type: "Int",
                int: e.int,
            });
            return { values: [destination], location: e.location };
        }
        else if (e.tag === "type-call") {
            return compileTypeCallExpression(e, ops, stack, typeScope, context);
        }
        else if (e.tag === "constraint-call") {
            return compileConstraintCallExpression(e, ops, stack, typeScope, context);
        }
        else if (e.tag === "keyword") {
            if (e.keyword === "false" || e.keyword === "true") {
                const destination = {
                    variable: stack.uniqueID("boolean"),
                    type: ir.T_BOOLEAN,
                    location: e.location,
                };
                ops.push({
                    tag: "op-const",
                    destination,
                    type: "Boolean",
                    boolean: e.keyword === "true",
                });
                return { values: [destination], location: e.location };
            }
            else if (e.keyword === "return") {
                if (context.ensuresReturnExpression === null) {
                    throw new diagnostics.ReturnExpressionUsedOutsideEnsuresErr({
                        returnLocation: e.location,
                    });
                }
                const destinations = [];
                const copies = [];
                for (const source of context.ensuresReturnExpression.values) {
                    const destination = {
                        variable: stack.uniqueID("return"),
                        type: source.type,
                        location: e.location,
                    };
                    copies.push({
                        source: source.variable,
                        destination,
                    });
                    destinations.push(destination);
                }
                ops.push({
                    tag: "op-copy",
                    copies,
                });
                return {
                    values: destinations,
                    location: e.location,
                };
            }
            else {
                const _ = e.keyword;
                throw new Error("compileExpressionAtom: keyword `" + e["keyword"] + "`");
            }
        }
        else if (e.tag === "record-literal") {
            return compileCompoundLiteral(e, ops, stack, typeScope, context);
        }
        else if (e.tag === "string-literal") {
            const destination = {
                variable: stack.uniqueID("string"),
                type: ir.T_BYTES,
                location: e.location,
            };
            ops.push({
                tag: "op-const",
                destination,
                type: "Bytes",
                bytes: e.value,
            });
            return { values: [destination], location: e.location };
        }
        const _ = e;
        throw new Error("compileExpressionAtom: Unhandled tag `" + e["tag"] + "`");
    }
    function compileFieldAccess(base, access, baseLocation, ops, stack, context) {
        if (base.type.tag !== "type-compound") {
            throw new diagnostics.FieldAccessOnNonCompoundErr({
                accessedType: displayType(base.type),
                accessedLocation: access.fieldName.location,
            });
        }
        const programContext = context.sourceContext.programContext;
        const baseEntity = programContext.getDataEntity(base.type.base);
        const instantiation = ir.typeArgumentsMap(baseEntity.typeScope.typeVariableList, base.type.type_arguments);
        const fieldDeclaration = baseEntity.tag === "enum"
            ? baseEntity.variants[access.fieldName.name]
            : baseEntity.fields[access.fieldName.name];
        if (fieldDeclaration === undefined) {
            if (baseEntity.tag === "enum") {
                throw new diagnostics.NoSuchVariantErr({
                    enumType: displayType(base.type),
                    variantName: access.fieldName.name,
                    location: access.fieldName.location,
                    kind: "variant access",
                });
            }
            else {
                throw new diagnostics.NoSuchFieldErr({
                    recordType: displayType(base.type),
                    fieldName: access.fieldName.name,
                    location: access.fieldName.location,
                    kind: "access",
                });
            }
        }
        const fieldType = ir.typeSubstitute(fieldDeclaration.t, instantiation);
        const location = ir.locationSpan(baseLocation, access.fieldName.location);
        const destination = {
            variable: stack.uniqueID("field"),
            type: fieldType,
            location,
        };
        if (baseEntity.tag === "enum") {
            ops.push({
                tag: "op-variant",
                object: base.variable,
                variant: access.fieldName.name,
                destination,
                diagnostic_location: access.fieldName.location,
            });
        }
        else {
            ops.push({
                tag: "op-field",
                object: base.variable,
                field: access.fieldName.name,
                destination,
            });
        }
        return {
            values: [destination],
            location,
        };
    }
    function compileSuffixIs(base, suffixIs, baseLocation, ops, stack, context) {
        if (base.type.tag !== "type-compound") {
            throw new diagnostics.VariantTestOnNonEnumErr({
                testedType: displayType(base.type),
                testLocation: suffixIs.location,
            });
        }
        const programContext = context.sourceContext.programContext;
        const baseEntity = programContext.getDataEntity(base.type.base);
        if (baseEntity.tag !== "enum") {
            throw new diagnostics.VariantTestOnNonEnumErr({
                testedType: displayType(base.type),
                testLocation: suffixIs.location,
            });
        }
        const variantDefinition = baseEntity.variants[suffixIs.variant.name];
        if (variantDefinition === undefined) {
            throw new diagnostics.NoSuchVariantErr({
                kind: "is test",
                enumType: displayType(base.type),
                variantName: suffixIs.variant.name,
                location: suffixIs.variant.location,
            });
        }
        const location = ir.locationSpan(baseLocation, suffixIs.location);
        const destination = {
            variable: stack.uniqueID("is_" + suffixIs.variant.name),
            type: ir.T_BOOLEAN,
            location,
        };
        ops.push({
            tag: "op-is-variant",
            base: base.variable,
            variant: suffixIs.variant.name,
            destination,
        });
        return { values: [destination], location };
    }
    function compileOperand(e, ops, stack, typeScope, context) {
        let value = compileExpressionAtom(e.atom, ops, stack, typeScope, context);
        for (const access of e.accesses) {
            if (value.values.length !== 1) {
                throw new diagnostics.MultiExpressionGroupedErr({
                    location: value.location,
                    valueCount: value.values.length,
                    grouping: access.tag,
                });
            }
            const base = value.values[0];
            if (access.tag === "field") {
                value = compileFieldAccess(base, access, value.location, ops, stack, context);
            }
            else if (access.tag === "method") {
                if (base.type.tag !== "type-compound") {
                    // TODO: Support method calls on type parameters.
                    throw new diagnostics.MethodAccessOnNonCompoundErr({
                        accessedType: displayType(base.type),
                        accessedLocation: access.methodName.location,
                    });
                }
                const programContext = context.sourceContext.programContext;
                const baseEntity = programContext.getDataEntity(base.type.base);
                const fn = baseEntity.fns[access.methodName.name];
                if (fn === undefined) {
                    throw new diagnostics.NoSuchFnErr({
                        baseType: displayType(base.type),
                        methodName: access.methodName.name,
                        methodNameLocation: access.methodName.location,
                    });
                }
                const location = ir.locationSpan(value.location, access.location);
                const args = [value];
                for (const arg of access.args) {
                    args.push(compileExpression(arg, ops, stack, typeScope, context));
                }
                const typeArgumentMapping = new Map();
                for (let i = 0; i < fn.entityTypeVariables.length; i++) {
                    typeArgumentMapping.set(fn.entityTypeVariables[i], base.type.type_arguments[i]);
                }
                if (fn.signatureTypeVariables.length !== 0) {
                    throw new Error("TODO: Handle member-scoped type arguments.");
                }
                value = compileCall(ops, stack, args, fn, typeArgumentMapping, location, null);
            }
            else {
                const _ = access;
                throw new Error("unhandled access tag `" + access["tag"] + "` in compileOperand");
            }
        }
        if (e.suffixIs) {
            if (value.values.length !== 1) {
                throw new diagnostics.MultiExpressionGroupedErr({
                    location: value.location,
                    valueCount: value.values.length,
                    grouping: "is",
                });
            }
            const base = value.values[0];
            value = compileSuffixIs(base, e.suffixIs, value.location, ops, stack, context);
        }
        return value;
    }
    const operatorPrecedence = {
        precedences: {
            "implies": 10,
            "and": 10,
            "or": 10,
            "==": 20,
            "<": 20,
            ">": 20,
            "<=": 20,
            ">=": 20,
            "!=": 20,
            "_default": 30,
        },
        associativities: {
            implies: "right",
            and: "left",
            or: "left",
            "<": "left",
            "<=": { group: "<" },
            ">": "left",
            ">=": { group: ">=" },
        },
    };
    function checkTreeCompatible(subtree, parent) {
        if (subtree.tag === "leaf") {
            // An operand is valid as a child of any operation.
            return;
        }
        else if (subtree.join.precedence < parent.precedence) {
            throw new Error("checkTreeCompatible: unreachable");
        }
        else if (subtree.join.precedence > parent.precedence) {
            // A child with strictly greater precedence is valid.
            return;
        }
        else if (subtree.join.associates !== parent.associates) {
            // A child with equal precedence but different associativity is invalid.
            throw new diagnostics.OperationRequiresParenthesizationErr({
                op1: {
                    str: subtree.join.opToken.tag === "keyword"
                        ? subtree.join.opToken.keyword
                        : subtree.join.opToken.operator,
                    location: subtree.join.opToken.location,
                },
                op2: {
                    str: parent.opToken.tag === "keyword"
                        ? parent.opToken.keyword
                        : parent.opToken.operator,
                    location: parent.opToken.location,
                },
                reason: "unordered",
            });
        }
        else if (parent.associativity === "none") {
            throw new diagnostics.OperationRequiresParenthesizationErr({
                op1: {
                    str: subtree.join.opToken.tag === "keyword"
                        ? subtree.join.opToken.keyword
                        : subtree.join.opToken.operator,
                    location: subtree.join.opToken.location,
                },
                op2: {
                    str: parent.opToken.tag === "keyword"
                        ? parent.opToken.keyword
                        : parent.opToken.operator,
                    location: parent.opToken.location,
                },
                reason: "non-associative",
            });
        }
    }
    function applyOrderOfOperations(operators, operands) {
        if (operators.length !== operands.length - 1) {
            throw new Error();
        }
        let joins = [];
        for (let i = 0; i < operators.length; i++) {
            const operator = operators[i];
            const opStr = operator.tag === "keyword" ? operator.keyword : operator.operator;
            let precedence = operatorPrecedence.precedences[opStr];
            if (precedence === undefined) {
                precedence = operatorPrecedence.precedences._default;
            }
            let associativity = { group: opStr };
            let associates = opStr;
            while (typeof associativity !== "string") {
                associates = associativity.group;
                associativity = operatorPrecedence.associativities[associativity.group] || "none";
            }
            joins.push({
                index: i,
                opToken: operator,
                associativity, precedence, associates,
            });
        }
        joins.sort((a, b) => {
            if (a.precedence !== b.precedence) {
                return b.precedence - a.precedence;
            }
            else if (a.associativity !== b.associativity) {
                return a.associativity.localeCompare(b.associativity);
            }
            else if (a.associativity === "right") {
                return b.index - a.index;
            }
            else {
                return b.index - a.index;
            }
        });
        const branches = [];
        for (let i = 0; i < operands.length; i++) {
            branches.push({
                tag: "leaf",
                left: i,
                right: i,
                operand: operands[i],
                location: operands[i].location,
            });
        }
        let branch = branches[0];
        for (let join of joins) {
            const toLeft = join.index;
            const toRight = join.index + 1;
            const left = branches[toLeft];
            const right = branches[toRight];
            branch = {
                tag: "branch",
                join,
                leftBranch: left, rightBranch: right,
                left: left.left,
                right: right.right,
                location: ir.locationSpan(left.location, right.location),
            };
            checkTreeCompatible(left, join);
            checkTreeCompatible(right, join);
            branches[branch.left] = branch;
            branches[branch.right] = branch;
        }
        return branch;
    }
    function expectOneBooleanForContract(values, typeScope, context, contract) {
        if (values.values.length !== 1) {
            throw new diagnostics.MultiExpressionGroupedErr({
                location: values.location,
                valueCount: values.values.length,
                grouping: "op",
                op: contract,
            });
        }
        const value = values.values[0];
        if (!ir.equalTypes(ir.T_BOOLEAN, value.type)) {
            throw new diagnostics.BooleanTypeExpectedErr({
                givenType: displayType(value.type),
                location: values.location,
                reason: "contract",
                contract: contract,
            });
        }
        return value;
    }
    function expectOneBooleanForLogical(values, typeScope, context, op) {
        if (values.values.length !== 1) {
            throw new diagnostics.MultiExpressionGroupedErr({
                location: values.location,
                valueCount: values.values.length,
                grouping: "op",
                op: op.opStr,
            });
        }
        const value = values.values[0];
        if (!ir.equalTypes(ir.T_BOOLEAN, value.type)) {
            throw new diagnostics.BooleanTypeExpectedErr({
                givenType: displayType(value.type),
                location: values.location,
                reason: "logical-op",
                op: op.opStr,
                opLocation: op.location,
            });
        }
        return value;
    }
    /// compileLogicalExpressionTree compiles a binary operation like
    /// `implies` or `and`.
    function compileLogicalExpressionTree(tree, ops, stack, typeScope, context) {
        const left = compileExpressionTree(tree.leftBranch, ops, stack, typeScope, context);
        // Compile a logical binary operation.
        const opStr = tree.join.opToken.keyword;
        const leftValue = expectOneBooleanForLogical(left, typeScope, context, {
            opStr: tree.join.opToken.keyword,
            location: tree.join.opToken.location,
        });
        const destination = {
            variable: stack.uniqueID("logical"),
            type: ir.T_BOOLEAN,
            location: tree.location,
        };
        const trueOps = [];
        const falseOps = [];
        let trueSource;
        let falseSource;
        if (opStr === "or") {
            trueSource = { tag: "variable", variable: leftValue.variable };
            stack.openBlock(false);
            const right = compileExpressionTree(tree.rightBranch, falseOps, stack, typeScope, context);
            const rightValue = expectOneBooleanForLogical(right, typeScope, context, {
                opStr: "or",
                location: tree.join.opToken.location,
            });
            falseSource = { tag: "variable", variable: rightValue.variable };
            for (const _ in stack.closeBlock()) {
                throw new Error("ICE: unexpected local assignment in logical");
            }
        }
        else if (opStr === "and") {
            falseSource = { tag: "variable", variable: leftValue.variable };
            stack.openBlock(false);
            const right = compileExpressionTree(tree.rightBranch, trueOps, stack, typeScope, context);
            const rightValue = expectOneBooleanForLogical(right, typeScope, context, {
                opStr: "and",
                location: tree.join.opToken.location,
            });
            trueSource = { tag: "variable", variable: rightValue.variable };
            for (const _ in stack.closeBlock()) {
                throw new Error("ICE: unexpected local assignment in logical");
            }
        }
        else if (opStr === "implies") {
            const trueConst = {
                variable: stack.uniqueID("falseimplies"),
                type: ir.T_BOOLEAN,
                location: ir.NONE,
            };
            falseOps.push({
                tag: "op-const",
                type: "Boolean",
                boolean: true,
                destination: trueConst,
            });
            falseSource = { tag: "variable", variable: trueConst.variable };
            stack.openBlock(false);
            const right = compileExpressionTree(tree.rightBranch, trueOps, stack, typeScope, context);
            const rightValue = expectOneBooleanForLogical(right, typeScope, context, {
                opStr: "implies",
                location: tree.join.opToken.location,
            });
            trueSource = { tag: "variable", variable: rightValue.variable };
            for (const _ in stack.closeBlock()) {
                throw new Error("ICE: unexpected local assignment in logical");
            }
        }
        else {
            const _ = opStr;
            throw new Error("Unhandled logical operator `" + opStr + "`");
        }
        const branch = {
            tag: "op-branch",
            condition: leftValue.variable,
            trueBranch: { ops: trueOps },
            falseBranch: { ops: falseOps },
            destinations: [
                {
                    destination,
                    trueSource,
                    falseSource,
                },
            ],
        };
        ops.push(branch);
        return { values: [destination], location: tree.location };
    }
    /// Throws `MultiExpressionGroupedErr` if `lhs` does not have exactly 1 value.
    function resolveArithmeticOperator(value, operator) {
        const opStr = operator.operator;
        if (ir.equalTypes(ir.T_INT, value.type)) {
            if (opStr === "+") {
                return { tag: "foreign-op", foreignID: "Int+", wrap: null };
            }
            else if (opStr === "-") {
                return { tag: "foreign-op", foreignID: "Int-", wrap: null };
            }
            else if (opStr === "==") {
                return { tag: "foreign-op", foreignID: "Int==", wrap: null };
            }
            else if (opStr === "!=") {
                return { tag: "foreign-op", foreignID: "Int==", wrap: "negate" };
            }
            else if (opStr === "<") {
                return { tag: "foreign-op", foreignID: "Int<", wrap: null };
            }
        }
        if (ir.equalTypes(ir.T_BOOLEAN, value.type)) {
            if (opStr === "==") {
                return { tag: "foreign-op", foreignID: "Boolean==", wrap: null };
            }
            else if (opStr === "!=") {
                return { tag: "foreign-op", foreignID: "Boolean==", wrap: null };
            }
        }
        if (opStr === "==") {
            return { tag: "proof-equal-op", wrap: null };
        }
        else if (opStr === "!=") {
            return { tag: "proof-equal-op", wrap: "negate" };
        }
        throw new diagnostics.TypeDoesNotProvideOperatorErr({
            lhsType: displayType(value.type),
            operator: opStr,
            operatorLocation: operator.location,
        });
    }
    function compileArithmeticExpressionTree(leftBranch, rightBranch, opToken, location, ops, stack, typeScope, context) {
        // Compile an arithmetic operation.
        const left = compileExpressionTree(leftBranch, ops, stack, typeScope, context);
        const right = compileExpressionTree(rightBranch, ops, stack, typeScope, context);
        const opStr = opToken.operator;
        if (left.values.length !== 1) {
            throw new diagnostics.MultiExpressionGroupedErr({
                location: left.location,
                valueCount: left.values.length,
                grouping: "op",
                op: opStr,
            });
        }
        else if (right.values.length !== 1) {
            throw new diagnostics.MultiExpressionGroupedErr({
                location: right.location,
                valueCount: right.values.length,
                grouping: "op",
                op: opStr,
            });
        }
        const resolvedOperator = resolveArithmeticOperator(left.values[0], opToken);
        let signatureReturnType;
        let expectedLhsType;
        let expectedRhsType;
        if (resolvedOperator.tag === "foreign-op") {
            const signature = context.sourceContext.programContext.foreignSignatures[resolvedOperator.foreignID];
            if (signature === undefined) {
                throw new Error("resolveArithmeticOperator produced a bad foreign signature (`" + resolvedOperator
                    + "`) for `" + displayType(left.values[0].type)
                    + "` `" + opStr + "`");
            }
            else if (signature.parameters.length !== 2) {
                throw new Error("Foreign signature `" + resolvedOperator + "` cannot be used as"
                    + "an operator since it doesn't take exactly 2 parameters");
            }
            else if (signature.return_types.length !== 1) {
                throw new Error("Foreign signature `" + resolvedOperator
                    + "` cannot be used as an operator since it produces "
                    + signature.return_types.length + " values");
            }
            expectedLhsType = signature.parameters[0].type;
            expectedRhsType = signature.parameters[1].type;
            signatureReturnType = signature.return_types[0];
        }
        else if (resolvedOperator.tag === "proof-equal-op") {
            expectedLhsType = left.values[0].type;
            expectedRhsType = expectedLhsType;
            signatureReturnType = ir.T_BOOLEAN;
            if (!stack.isInProofBlock()) {
                throw new diagnostics.ProofMemberUsedOutsideProofContextErr({
                    operation: opToken.operator,
                    location: opToken.location,
                });
            }
        }
        else {
            const _ = resolvedOperator;
            throw new Error("compileArithmeticExpressionTree: unhandled operator type");
        }
        if (!ir.equalTypes(expectedRhsType, right.values[0].type)) {
            throw new diagnostics.OperatorTypeMismatchErr({
                lhsType: displayType(left.values[0].type),
                operator: opStr,
                givenRhsType: displayType(right.values[0].type),
                expectedRhsType: displayType(expectedRhsType),
                rhsLocation: right.location,
            });
        }
        let operatorResult = {
            variable: stack.uniqueID("arithmetic"),
            type: signatureReturnType,
            location,
        };
        if (resolvedOperator.tag === "foreign-op") {
            ops.push({
                tag: "op-foreign",
                operation: resolvedOperator.foreignID,
                arguments: [left.values[0].variable, right.values[0].variable],
                destinations: [operatorResult],
            });
        }
        else if (resolvedOperator.tag === "proof-equal-op") {
            ops.push({
                tag: "op-proof-eq",
                left: left.values[0].variable,
                right: right.values[0].variable,
                destination: operatorResult,
            });
        }
        else {
            const _ = resolvedOperator;
            throw new Error("TODO");
        }
        if (resolvedOperator.wrap === "negate") {
            const negatedResult = {
                variable: stack.uniqueID("negatearithmetic"),
                type: ir.T_BOOLEAN,
                location,
            };
            const booleanConstant = {
                variable: stack.uniqueID("negatearithmetic"),
                type: ir.T_BOOLEAN,
                location,
            };
            ops.push({
                tag: "op-branch",
                condition: operatorResult.variable,
                trueBranch: {
                    ops: [
                        {
                            tag: "op-const",
                            destination: booleanConstant,
                            type: "Boolean",
                            boolean: false,
                        },
                    ],
                },
                falseBranch: {
                    ops: [
                        {
                            tag: "op-const",
                            destination: booleanConstant,
                            type: "Boolean",
                            boolean: true,
                        },
                    ],
                },
                destinations: [
                    {
                        destination: negatedResult,
                        trueSource: { tag: "variable", variable: booleanConstant.variable },
                        falseSource: { tag: "variable", variable: booleanConstant.variable },
                    },
                ],
            });
            operatorResult = negatedResult;
        }
        return {
            values: [operatorResult],
            location,
        };
    }
    function compileExpressionTree(tree, ops, stack, typeScope, context) {
        if (tree.tag === "leaf") {
            return compileOperand(tree.operand, ops, stack, typeScope, context);
        }
        else if (tree.join.opToken.tag === "keyword") {
            return compileLogicalExpressionTree(tree, ops, stack, typeScope, context);
        }
        else {
            return compileArithmeticExpressionTree(tree.leftBranch, tree.rightBranch, tree.join.opToken, tree.location, ops, stack, typeScope, context);
        }
    }
    function compileExpression(e, ops, stack, typeScope, context) {
        const operands = [e.left, ...e.operations.map(x => x.right)];
        const operators = e.operations.map(x => x.operator);
        const tree = applyOrderOfOperations(operators, operands);
        return compileExpressionTree(tree, ops, stack, typeScope, context);
    }
    /// `displayType` formats the given IR `Type` as a string of (fully qualified)
    /// Shiru code.
    function displayType(t) {
        if (t.tag === "type-compound") {
            const base = t.base;
            const args = t.type_arguments.map(displayType);
            if (args.length === 0) {
                return base;
            }
            else {
                return base + "[" + args.join(", ") + "]";
            }
        }
        else if (t.tag === "type-primitive") {
            // TODO: Text vs String vs Bytes?
            return t.primitive;
        }
        else if (t.tag == "type-variable") {
            return "#" + t.id;
        }
        else if (t.tag === "type-any") {
            return "Any";
        }
        else {
            const _ = t;
            throw new Error("displayType: unhandled tag `" + t["tag"] + "`");
        }
    }
    exports.displayType = displayType;
    /// `displayConstraint` formats the given IR constraint as a string, potentially
    /// formatted for the given `SourceContext` (considering import aliases and
    /// such).
    function displayConstraint(c) {
        const base = c.interface;
        if (c.subjects.length === 0) {
            throw new Error("ICE: Invalid constraint `" + base + "`");
        }
        const lhs = displayType(c.subjects[0]);
        const rhs = c.subjects.slice(1).map(t => displayType(t));
        if (rhs.length === 0) {
            return `${lhs} is ${base}`;
        }
        else {
            return `${lhs} is ${base}[${rhs.join(", ")}]`;
        }
    }
    exports.displayConstraint = displayConstraint;
    function displayTypeScope(c, opt) {
        if (c.typeVariableList.length === 0) {
            return "";
        }
        else {
            return "[" + c.typeVariableList.map(x => "#" + x).join(", ") + "]" +
                (opt.space ? " " : "");
        }
    }
    exports.displayTypeScope = displayTypeScope;
    function compileVarSt(statement, ops, stack, typeScope, context) {
        const values = [];
        for (const e of statement.initialization) {
            const tuple = compileExpression(e, ops, stack, typeScope, context);
            for (let i = 0; i < tuple.values.length; i++) {
                values.push({ tuple, i });
            }
        }
        if (values.length !== statement.variables.length) {
            throw new diagnostics.ValueCountMismatchErr({
                actualCount: values.length,
                actualLocation: ir.locationsSpan(statement.initialization),
                expectedCount: statement.variables.length,
                expectedLocation: ir.locationsSpan(statement.variables),
            });
        }
        for (let i = 0; i < statement.variables.length; i++) {
            const v = statement.variables[i];
            const t = compileType(v.t, typeScope, context.sourceContext, "check");
            const pair = values[i];
            const value = pair.tuple.values[pair.i];
            if (!ir.equalTypes(value.type, t)) {
                throw new diagnostics.TypeMismatchErr({
                    givenType: displayType(value.type),
                    givenLocation: pair.tuple.location,
                    givenIndex: { index0: pair.i, count: pair.tuple.values.length },
                    expectedType: displayType(t),
                    expectedLocation: v.t.location,
                });
            }
            stack.defineLocal(v.variable.name, t, v.variable.location, value.variable);
        }
    }
    function compileAssertSt(statement, ops, stack, typeScope, context) {
        const proof = {
            tag: "op-proof",
            body: {
                ops: [],
            },
        };
        // Compile the asserted expression in a proof context.
        stack.openBlock(true);
        const conditionTuple = compileExpression(statement.expression, proof.body.ops, stack, typeScope, context);
        stack.closeBlock();
        const asserted = expectOneBooleanForContract(conditionTuple, typeScope, context, "assert");
        proof.body.ops.push({
            tag: "op-branch",
            condition: asserted.variable,
            trueBranch: { ops: [] },
            falseBranch: {
                ops: [
                    {
                        tag: "op-unreachable",
                        diagnostic_kind: "contract",
                        diagnostic_location: statement.location,
                    },
                ],
            },
            destinations: [],
        });
        ops.push(proof);
    }
    function compileReturnSt(statement, ops, stack, typeScope, context) {
        const values = [];
        for (const e of statement.values) {
            const tuple = compileExpression(e, ops, stack, typeScope, context);
            for (let i = 0; i < tuple.values.length; i++) {
                values.push({ tuple, i });
            }
        }
        if (values.length === 0) {
            throw new Error("ICE: return must take at least 1 value");
        }
        if (values.length !== context.returnsTo.length) {
            const signatureReturn = ir.locationsSpan(context.returnsTo);
            throw new diagnostics.ValueCountMismatchErr({
                actualCount: values.length,
                actualLocation: ir.locationsSpan(statement.values),
                expectedCount: context.returnsTo.length,
                expectedLocation: signatureReturn,
            });
        }
        let op = {
            tag: "op-return",
            sources: [],
            diagnostic_return_site: statement.location,
        };
        for (let i = 0; i < values.length; i++) {
            const v = values[i];
            const source = v.tuple.values[v.i];
            op.sources.push(source.variable);
            const destination = context.returnsTo[i];
            if (!ir.equalTypes(source.type, destination.t)) {
                throw new diagnostics.TypeMismatchErr({
                    givenType: displayType(source.type),
                    givenLocation: v.tuple.location,
                    givenIndex: { index0: v.i, count: v.tuple.values.length },
                    expectedType: displayType(destination.t),
                    expectedLocation: destination.location,
                });
            }
        }
        ops.push(op);
    }
    function compileIfClause(clause, rest, restIndex, elseClause, ops, stack, typeScope, context) {
        const condition = compileExpression(clause.condition, ops, stack, typeScope, context);
        if (condition.values.length !== 1) {
            throw new diagnostics.MultiExpressionGroupedErr({
                location: clause.condition.location,
                valueCount: condition.values.length,
                grouping: "if",
            });
        }
        const conditionValue = condition.values[0];
        if (!ir.equalTypes(ir.T_BOOLEAN, conditionValue.type)) {
            throw new diagnostics.BooleanTypeExpectedErr({
                givenType: displayType(conditionValue.type),
                location: clause.condition.location,
                reason: "if",
            });
        }
        let trueAssignments = {};
        const trueBranch = compileBlock(clause.body, stack, typeScope, context, (assignments) => {
            trueAssignments = assignments;
        });
        stack.openBlock(false);
        let falseBranch = { ops: [] };
        if (restIndex >= rest.length) {
            // Reached else clause.
            if (elseClause !== null) {
                falseBranch = compileBlock(elseClause.body, stack, typeScope, context);
            }
        }
        else {
            compileIfClause(rest[restIndex], rest, restIndex + 1, elseClause, falseBranch.ops, stack, typeScope, context);
        }
        const falseAssignments = stack.closeBlock();
        const destinations = [];
        for (const key in trueAssignments) {
            throw new Error("TODO");
        }
        for (const key in falseAssignments) {
            throw new Error("TODO");
        }
        ops.push({
            tag: "op-branch",
            condition: conditionValue.variable,
            trueBranch,
            falseBranch,
            destinations,
        });
    }
    function compileIfSt(statement, ops, stack, typeScope, context) {
        compileIfClause(statement, statement.elseIfClauses, 0, statement.elseClause, ops, stack, typeScope, context);
    }
    function compileStatement(statement, ops, stack, typeScope, context) {
        if (statement.tag === "var") {
            compileVarSt(statement, ops, stack, typeScope, context);
            return;
        }
        else if (statement.tag === "return") {
            compileReturnSt(statement, ops, stack, typeScope, context);
            return;
        }
        else if (statement.tag === "if") {
            compileIfSt(statement, ops, stack, typeScope, context);
            return;
        }
        else if (statement.tag === "assert") {
            compileAssertSt(statement, ops, stack, typeScope, context);
            return;
        }
        else if (statement.tag === "unreachable") {
            ops.push({
                tag: "op-unreachable",
                diagnostic_kind: "unreachable",
                diagnostic_location: statement.location,
            });
            return;
        }
        const _ = statement;
        throw new Error("Unhandled tag in compileStatement `" + statement["tag"] + "`");
    }
    function compileBlock(block, stack, typeScope, context, callback) {
        const ops = [];
        stack.openBlock(false);
        for (const s of block.statements) {
            compileStatement(s, ops, stack, typeScope, context);
        }
        const assignments = stack.closeBlock();
        if (callback !== undefined) {
            callback(assignments);
        }
        return {
            ops: ops,
        };
    }
    function compileFunctionSignature(signatureAST, typeScope, typeVariablesArePreBound, sourceContext) {
        const typeVariables = typeVariablesArePreBound
            ? []
            : typeScope.typeVariableList.slice(0);
        const signature = {
            type_parameters: typeVariables,
            constraint_parameters: typeScope.constraints.map(c => c.constraint),
            parameters: [],
            return_types: [],
            preconditions: [],
            postconditions: [],
        };
        const stack = new VariableStack();
        for (const parameterAST of signatureAST.parameters.list) {
            const t = compileType(parameterAST.t, typeScope, sourceContext, "check");
            const parameterVariableID = parameterAST.name.name;
            stack.defineLocal(parameterAST.name.name, t, parameterAST.name.location, parameterVariableID);
            signature.parameters.push({
                variable: parameterVariableID,
                type: t,
                location: parameterAST.name.location,
            });
        }
        const context = {
            returnsTo: [],
            sourceContext,
            ensuresReturnExpression: null,
        };
        for (const r of signatureAST.returns) {
            const t = compileType(r, typeScope, sourceContext, "check");
            signature.return_types.push(t);
            context.returnsTo.push({ t, location: r.location });
        }
        for (let precondition of signatureAST.requires) {
            const block = { ops: [] };
            // Compile the precondition in a proof context.
            stack.openBlock(true);
            const result = compileExpression(precondition.expression, block.ops, stack, typeScope, context);
            const asserted = expectOneBooleanForContract(result, typeScope, context, "requires");
            stack.closeBlock();
            signature.preconditions.push({
                block,
                precondition: asserted.variable,
                location: precondition.expression.location,
            });
        }
        if (signatureAST.ensures.length !== 0) {
            // Compile the postcondition in a proof context.
            stack.openBlock(true);
            // The variables in a "return" expression are treated as "parameter"
            // variables for the ensures block.
            const ensuresReturnExpression = {
                location: ir.locationsSpan(signatureAST.returns),
                values: [],
            };
            for (let i = 0; i < signature.return_types.length; i++) {
                ensuresReturnExpression.values.push({
                    variable: stack.uniqueID("return" + i),
                    type: signature.return_types[i],
                    // TODO:
                    location: ir.NONE,
                });
            }
            for (let postcondition of signatureAST.ensures) {
                const block = { ops: [] };
                stack.openBlock(true);
                const result = compileExpression(postcondition.expression, block.ops, stack, typeScope, {
                    ...context,
                    ensuresReturnExpression,
                });
                const asserted = expectOneBooleanForContract(result, typeScope, context, "ensures");
                stack.closeBlock();
                signature.postconditions.push({
                    block,
                    returnedValues: ensuresReturnExpression.values,
                    postcondition: asserted.variable,
                    location: postcondition.expression.location,
                });
            }
            stack.closeBlock();
        }
        return { signature, stack, context };
    }
    function compileMemberFunction(program, def, fName, sourceContext, typeScope) {
        const { signature, stack, context } = compileFunctionSignature(def.ast.signature, typeScope, false, sourceContext);
        const body = compileBlock(def.ast.body, stack, typeScope, context);
        // Make the verifier prove that this function definitely does not exit
        // without returning.
        if (body.ops.length === 0 || !ir.opTerminates(body.ops[body.ops.length - 1])) {
            body.ops.push({
                tag: "op-unreachable",
                diagnostic_kind: "return",
                diagnostic_location: def.ast.body.closing,
            });
        }
        program.functions[fName] = { signature, body };
    }
    function checkImplMemberConformance(int, fnName, constraint, signature, signatureAST) {
        const corresponding = int.fns[fnName.name];
        // Check that a corresponding member exists.
        if (corresponding === undefined) {
            throw new diagnostics.ImplMemberDoesNotExistOnInterface({
                impl: displayConstraint(constraint),
                member: fnName.name,
                memberLocation: fnName.location,
                interface: constraint.interface,
                interfaceLocation: int.bindingLocation,
            });
        }
        // Determine the expected signatures.
        if (corresponding.signatureTypeVariables.length !== 0) {
            throw new Error("TODO: interface member with type parameters");
        }
        const instantiation = ir.typeArgumentsMap(corresponding.interfaceTypeVariables, constraint.subjects);
        // Check the parameter types.
        if (corresponding.parameters.length !== signature.parameters.length) {
            throw new diagnostics.ImplParameterCountMismatch({
                impl: displayConstraint(constraint),
                member: fnName.name,
                implCount: signature.parameters.length,
                interfaceCount: corresponding.parameters.length,
                implLocation: signatureAST.parameters.location,
                interfaceLocation: corresponding.parametersLocation,
            });
        }
        for (let i = 0; i < corresponding.parameters.length; i++) {
            const expected = ir.typeSubstitute(corresponding.parameters[i].t, instantiation);
            if (!ir.equalTypes(expected, signature.parameters[i].type)) {
                throw new diagnostics.ImplParameterTypeMismatch({
                    impl: displayConstraint(constraint),
                    parameterIndex0: i,
                    memberName: fnName.name,
                    implType: displayType(signature.parameters[i].type),
                    interfaceType: displayType(expected),
                    implLocation: signatureAST.parameters.list[i].t.location,
                    interfaceLocation: corresponding.parameters[i].typeLocation,
                });
            }
        }
        // Check the return types.
        if (corresponding.returns.length !== signature.return_types.length) {
            throw new diagnostics.ImplReturnCountMismatch({
                impl: displayConstraint(constraint),
                member: fnName.name,
                implCount: signature.return_types.length,
                interfaceCount: corresponding.returns.length,
                implLocation: ir.locationsSpan(signatureAST.returns),
                interfaceLocation: ir.locationsSpan(corresponding.returns.map(x => ({ location: x.typeLocation }))),
            });
        }
        for (let i = 0; i < corresponding.returns.length; i++) {
            const expected = ir.typeSubstitute(corresponding.returns[i].t, instantiation);
            if (!ir.equalTypes(expected, signature.return_types[i])) {
                throw new diagnostics.ImplReturnTypeMismatch({
                    impl: displayConstraint(constraint),
                    returnIndex0: i,
                    memberName: fnName.name,
                    implType: displayType(signature.return_types[i]),
                    interfaceType: displayType(expected),
                    implLocation: signatureAST.returns[i].location,
                    interfaceLocation: corresponding.returns[i].typeLocation,
                });
            }
        }
        if (signature.preconditions.length !== 0) {
            throw new diagnostics.ImplMayNotHavePreconditionErr({
                impl: displayConstraint(constraint),
                memberName: fnName.name,
                preconditionLocation: signature.preconditions[0].location,
            });
        }
    }
    function compileImpl(program, impl, namingInterface, namingRecord, namingCount, programContext) {
        const sourceContext = programContext.sourceContexts[impl.sourceID];
        const int = programContext.getInterface(impl.constraint.interface);
        const vtable = {
            for_any: impl.typeScope.typeVariableList,
            provides: impl.constraint,
            entries: {},
        };
        const canonicalImplName = `impl__${namingInterface}__${namingRecord}__${namingCount}`;
        const memberBindings = new Map();
        for (const fnAST of impl.ast.fns) {
            const fnName = fnAST.signature.name;
            const existingBinding = memberBindings.get(fnName.name);
            if (existingBinding !== undefined) {
                throw new diagnostics.MemberRedefinedErr({
                    memberName: fnName.name,
                    firstBinding: existingBinding,
                    secondBinding: fnName.location,
                });
            }
            memberBindings.set(fnName.name, fnName.location);
            const { signature, stack, context } = compileFunctionSignature(fnAST.signature, impl.typeScope, false, sourceContext);
            checkImplMemberConformance(int, fnName, impl.constraint, signature, fnAST.signature);
            const body = compileBlock(fnAST.body, stack, int.typeScope, context);
            // Make the verifier prove that this function definitely does not exit
            // without returning.
            if (body.ops.length === 0 || !ir.opTerminates(body.ops[body.ops.length - 1])) {
                body.ops.push({
                    tag: "op-unreachable",
                    diagnostic_kind: "return",
                    diagnostic_location: fnAST.body.closing,
                });
            }
            // TODO: Handle signature type constraints.
            const closureConstraints = impl.typeScope.constraints.map(x => x.constraint);
            const canonicalMemberName = `${canonicalImplName}__${fnName.name}`;
            program.functions[canonicalMemberName] = { signature, body };
            vtable.entries[fnName.name] = {
                implementation: canonicalMemberName,
                constraint_parameters: closureConstraints,
            };
        }
        for (const expected in int.fns) {
            if (memberBindings.get(expected) === undefined) {
                throw new diagnostics.ImplMissingInterfaceMember({
                    impl: displayConstraint(impl.constraint),
                    member: expected,
                    implLocation: impl.headLocation,
                    interface: impl.constraint.interface,
                    memberLocation: int.fns[expected].nameLocation,
                });
            }
        }
        program.globalVTableFactories[canonicalImplName] = vtable;
    }
    function compileInterfaceEntity(program, entity, entityName, programContext) {
        const compiled = {
            type_parameters: entity.typeScope.typeVariableList,
            signatures: {},
        };
        const sourceContext = programContext.sourceContexts[entity.sourceID];
        for (const fnName in entity.fns) {
            const fn = entity.fns[fnName];
            const signature = compileFunctionSignature(fn.ast.signature, entity.typeScope, true, sourceContext);
            compiled.signatures[fnName] = signature.signature;
        }
        program.interfaces[entityName] = compiled;
    }
    function compileRecordEntity(program, entity, entityName, programContext) {
        // Layout storage for this record.
        program.records[entityName] = {
            type_parameters: entity.typeScope.typeVariableList,
            fields: {},
        };
        for (const fieldName in entity.fields) {
            program.records[entityName].fields[fieldName] = entity.fields[fieldName].t;
        }
        // Compile member functions.
        for (const f in entity.fns) {
            const def = entity.fns[f];
            const fName = def.id;
            compileMemberFunction(program, def, fName, programContext.sourceContexts[entity.sourceID], entity.typeScope);
        }
        // Compile impls.
        for (const [interfaceID, impls] of entity.implsByInterface) {
            for (let i = 0; i < impls.length; i++) {
                compileImpl(program, impls[i], interfaceID, entityName, i + "", programContext);
            }
        }
    }
    function compileEnumEntity(program, entity, entityName, programContext) {
        program.enums[entityName] = {
            type_parameters: entity.typeScope.typeVariableList,
            variants: {},
        };
        for (const variantName in entity.variants) {
            program.enums[entityName].variants[variantName] = entity.variants[variantName].t;
        }
        // Compile member functions.
        for (const f in entity.fns) {
            const def = entity.fns[f];
            const fName = def.id;
            compileMemberFunction(program, def, fName, programContext.sourceContexts[entity.sourceID], entity.typeScope);
        }
        // Compile impls.
        for (const [interfaceID, impls] of entity.implsByInterface) {
            for (let i = 0; i < impls.length; i++) {
                compileImpl(program, impls[i], interfaceID, entityName, i + "", programContext);
            }
        }
    }
    /// `compileEntity` compiles the indicated entity into records, functions,
    /// interfaces, vtable-factories, etc in the given `program`.
    /// THROWS `SemanticError` if a type-error is discovered within the
    /// implementation of this entity.
    function compileEntity(program, programContext, entityName, entity) {
        if (entity.tag === "record") {
            return compileRecordEntity(program, entity, entityName, programContext);
        }
        else if (entity.tag === "enum") {
            return compileEnumEntity(program, entity, entityName, programContext);
        }
        else if (entity.tag === "interface") {
            return compileInterfaceEntity(program, entity, entityName, programContext);
        }
        const _ = entity;
        throw new Error("compileEntity: unhandled tag `" + entity["tag"] + "`");
    }
    function getBasicForeign() {
        return {
            "Int==": {
                // Equality
                parameters: [
                    {
                        variable: "left",
                        type: ir.T_INT,
                        location: ir.NONE,
                    },
                    {
                        variable: "right",
                        type: ir.T_INT,
                        location: ir.NONE,
                    },
                ],
                return_types: [ir.T_BOOLEAN],
                type_parameters: [],
                constraint_parameters: [],
                preconditions: [],
                postconditions: [],
                semantics: {
                    eq: true,
                },
            },
            "Boolean==": {
                // Equality
                parameters: [
                    {
                        variable: "left",
                        type: ir.T_BOOLEAN,
                        location: ir.NONE,
                    },
                    {
                        variable: "right",
                        type: ir.T_BOOLEAN,
                        location: ir.NONE,
                    },
                ],
                return_types: [ir.T_BOOLEAN],
                type_parameters: [],
                constraint_parameters: [],
                preconditions: [],
                postconditions: [],
                semantics: {
                    eq: true,
                },
            },
            "Int<": {
                parameters: [
                    {
                        variable: "left",
                        type: ir.T_INT,
                        location: ir.NONE,
                    },
                    {
                        variable: "right",
                        type: ir.T_INT,
                        location: ir.NONE,
                    },
                ],
                return_types: [ir.T_BOOLEAN],
                type_parameters: [],
                constraint_parameters: [],
                preconditions: [],
                postconditions: [],
                semantics: {},
            },
            "Int+": {
                // Addition
                parameters: [
                    {
                        variable: "left",
                        type: ir.T_INT,
                        location: ir.NONE,
                    },
                    {
                        variable: "right",
                        type: ir.T_INT,
                        location: ir.NONE,
                    },
                ],
                return_types: [ir.T_INT],
                type_parameters: [],
                constraint_parameters: [],
                preconditions: [],
                postconditions: [],
            },
            "Int-": {
                // Subtract
                parameters: [
                    {
                        variable: "left",
                        type: ir.T_INT,
                        location: ir.NONE,
                    },
                    {
                        variable: "right",
                        type: ir.T_INT,
                        location: ir.NONE,
                    },
                ],
                return_types: [ir.T_INT],
                type_parameters: [],
                constraint_parameters: [],
                preconditions: [],
                postconditions: [],
            },
        };
    }
    function associateImplWithBase(record, constraint, sourceID, typeScope, implAST) {
        const headLocation = ir.locationSpan(implAST.impl.location, implAST.constraint.location);
        // Check if an existing impl conflicts with this one.
        const existingImpls = record.implsByInterface.get(constraint.interface);
        for (const candidate of existingImpls) {
            const unifier = ir.unifyTypes(candidate.typeScope.typeVariableList, candidate.constraint.subjects, typeScope.typeVariableList, constraint.subjects);
            if (unifier !== null) {
                const firstImpl = displayTypeScope(candidate.typeScope, { space: true }) +
                    displayConstraint(candidate.constraint);
                const secondImpl = displayTypeScope(typeScope, { space: true }) +
                    displayConstraint(constraint);
                throw new diagnostics.OverlappingImplsErr({
                    firstImpl,
                    firstLocation: candidate.headLocation,
                    secondImpl,
                    secondLocation: headLocation,
                });
            }
        }
        // TODO: Check for "orphan" instances.
        // Record this impl.
        record.implsByInterface.get(constraint.interface).push({
            tag: "impl",
            ast: implAST,
            headLocation,
            sourceID,
            typeScope,
            constraint,
        });
    }
    /// `compileSources` transforms the ASTs making up a Shiru program into a
    /// `ir.Program`.
    /// THROWS `SemanticError` if a type-error is discovered within the given source
    /// files.
    function compileSources(sources) {
        const programContext = collectAllEntities(sources);
        // Collect all entities and source contexts.
        for (const sourceID in sources) {
            resolveSourceContext(sourceID, sources[sourceID], programContext);
        }
        // Resolve type scopes and constraints.
        for (let [_, entity] of programContext.namedEntities()) {
            resolveAvailableTypes(programContext, entity);
        }
        // Resolve all impl blocks.
        for (const sourceID in programContext.sourceContexts) {
            const sourceContext = programContext.sourceContexts[sourceID];
            for (const implAST of sourceContext.implASTs) {
                const typeScope = {
                    thisType: null,
                    typeVariables: new Map(),
                    typeVariableList: [],
                    constraints: [],
                };
                collectTypeScope(sourceContext, typeScope, implAST.typeParameters);
                const baseType = compileType(implAST.base, typeScope, sourceContext, "skip");
                if (baseType.tag !== "type-compound") {
                    throw new Error("compileSources: ICE");
                }
                const baseEntity = programContext.getDataEntity(baseType.base);
                const constraint = compileConstraint(implAST.constraint, baseType, sourceContext, typeScope, "skip", ir.locationSpan(implAST.base.location, implAST.constraint.location));
                // Associate the impl with its base record type.
                associateImplWithBase(baseEntity, constraint, sourceID, typeScope, implAST);
            }
        }
        // Recheck all the unchecked types & constraints found in the above step:
        const uncheckedTypes = programContext.uncheckedTypes;
        const uncheckedConstraints = programContext.uncheckedConstraints;
        programContext.uncheckedTypes = [];
        programContext.uncheckedConstraints = [];
        for (const { t, scope, sourceContext } of uncheckedTypes) {
            compileType(t, scope, sourceContext, "check");
        }
        for (const { c, methodSubject, sourceContext, scope, constraintLocation } of uncheckedConstraints) {
            compileConstraint(c, methodSubject, sourceContext, scope, "check", constraintLocation);
        }
        // Resolve members of entities. Type arguments must be validated based on
        // collected constraints.
        for (const [canonicalEntityName, entity] of programContext.namedEntities()) {
            resolveMemberSignatures(programContext, canonicalEntityName, entity);
        }
        const program = {
            functions: {},
            interfaces: {},
            records: {},
            enums: {},
            foreign: programContext.foreignSignatures,
            globalVTableFactories: {},
        };
        for (let [canonicalEntityName, entity] of programContext.namedEntities()) {
            compileEntity(program, programContext, canonicalEntityName, entity);
        }
        return program;
    }
    exports.compileSources = compileSources;
});
define("shiru/egraph", ["require", "exports", "shiru/data"], function (require, exports, data_2) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.EGraph = void 0;
    /// An "equivalence-graph", loosely inspired by "egg (e-graphs good)".
    class EGraph {
        constructor() {
            /// `tagged.get(tag).get(rep)` is the set of IDs tagged with `tag` that are
            /// equal to representative `rep`.
            this.tagged = new data_2.DefaultMap(t => new data_2.DefaultMap(r => new Set()));
            this.taggedDef = new Map();
            this.tuples = new data_2.TrieMap();
            this.ds = new data_2.DisjointSet();
        }
        reset() {
            this.ds.reset();
            for (const [_, map] of this.tagged) {
                for (const [id, set] of map) {
                    const has = set.has(id);
                    set.clear();
                    if (has) {
                        set.add(id);
                    }
                }
            }
        }
        getTagged(tag, id) {
            const out = [];
            const representative = this.ds.representative(id);
            for (const tagged of this.tagged.get(tag).get(representative)) {
                const def = this.taggedDef.get(tagged);
                out.push({ id: tagged, term: def.term, operands: def.operands });
            }
            return out;
        }
        add(term, operands, tag, hint) {
            const tuple = [term, ...operands];
            const existing = this.tuples.get(tuple);
            if (existing) {
                return existing;
            }
            else {
                const id = Symbol("egraph-term(" + hint + ")");
                this.tuples.put(tuple, id);
                if (tag !== undefined) {
                    this.tagged.get(tag).get(id).add(id);
                    this.taggedDef.set(id, { term, operands, tag });
                }
                return id;
            }
        }
        /// `reason` is a conjunction of `Reason`s.
        /// merge(a, b, reason) returns false when this fact was already present in
        /// this egrahp.
        merge(a, b, reason) {
            const arep = this.ds.representative(a);
            const brep = this.ds.representative(b);
            if (arep === brep) {
                return false;
            }
            // Merge a and b specifically (and not their representatives) so that
            // the reason is precisely tracked.
            this.ds.union(a, b, reason);
            const parent = this.ds.representative(arep);
            if (parent !== arep && parent !== brep) {
                throw new Error("EGraph.merge: unexpected new representative");
            }
            const child = arep === parent ? brep : arep;
            for (const [tag, map] of this.tagged) {
                const parentSet = this.tagged.get(tag).get(parent);
                for (const e of map.get(child)) {
                    parentSet.add(e);
                }
            }
            return true;
        }
        updateCongruenceStep() {
            // The keys of `canonical` are representatives.
            // The `id` is the symbol of the original (non-canonicalized) object;
            // the `reason` is the union of reasons for why the canonicalized
            // version is equal to the original version.
            const canonical = new data_2.TrieMap();
            for (const [[term, ...operands], id] of this.tuples) {
                const representatives = operands.map(x => this.ds.representative(x));
                const reason = new Set();
                for (let i = 0; i < representatives.length; i++) {
                    const representative = representatives[i];
                    const original = operands[i];
                    const explanation = this.query(representative, original);
                    for (const r of explanation) {
                        reason.add(r);
                    }
                }
                const key = [term, ...representatives];
                let group = canonical.get(key);
                if (group === undefined) {
                    group = [];
                    canonical.put(key, group);
                }
                group.push({ id, reason });
            }
            let madeChanges = false;
            for (const [_, members] of canonical) {
                if (members.length < 2) {
                    continue;
                }
                const first = members[0];
                for (let i = 1; i < members.length; i++) {
                    const second = members[1];
                    if (this.ds.representative(first.id) === this.ds.representative(second.id)) {
                        // They're already equal.
                        continue;
                    }
                    const reason = new Set([...first.reason, ...second.reason]);
                    this.merge(first.id, second.id, reason);
                    madeChanges = true;
                }
            }
            return madeChanges;
        }
        updateCongruence() {
            let madeChanges = false;
            while (this.updateCongruenceStep()) {
                madeChanges = true;
            }
            return madeChanges;
        }
        query(a, b) {
            if (!this.ds.compareEqual(a, b)) {
                return null;
            }
            const seq = this.ds.explainEquality(a, b);
            const all = new Set();
            for (const list of seq) {
                for (const el of list) {
                    all.add(el);
                }
            }
            return all;
        }
        /// getRepresentative(obj) returns a "representative" element of obj's
        /// equivalence class, such that any two objects that are equal have the
        /// same representative, and any objects that are not equal have different
        /// representatives.
        getRepresentative(obj) {
            return this.ds.representative(obj);
        }
        getClasses(duplicate) {
            const mapping = new Map();
            for (const [k, id] of this.tuples) {
                const representative = this.ds.representative(id);
                let eclass = mapping.get(representative);
                if (eclass === undefined) {
                    eclass = { members: [] };
                    mapping.set(representative, eclass);
                }
                if (duplicate) {
                    mapping.set(id, eclass);
                }
                const term = k[0];
                const operands = k.slice(1);
                eclass.members.push({ id, term, operands });
            }
            return mapping;
        }
    }
    exports.EGraph = EGraph;
});
define("shiru/sat", ["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SATSolver = void 0;
    function swap(array, a, b) {
        const t = array[a];
        array[a] = array[b];
        array[b] = t;
    }
    /// `UnitLiteralQueue` is a helper data structure to maintain a queue of unit
    /// literals.
    class UnitLiteralQueue {
        constructor() {
            this.unitLiterals = new Map();
        }
        /// Adds a literal, with a given antecedent, to this queue.
        /// RETURNS a `ClauseID` when this proposed unit literal is in conflict with
        /// another unit literal in this mapping.
        pushOrFindConflict(literal, antecedent) {
            const term = literal > 0 ? literal : -literal;
            const existing = this.unitLiterals.get(term);
            if (existing !== undefined && existing[0] !== literal) {
                // This contradicts a unit-literal.
                return existing[1];
            }
            else if (!existing) {
                this.unitLiterals.set(term, [literal, antecedent]);
            }
            return null;
        }
        /// N.B.: Iterating over this map clears entries from it!
        *[Symbol.iterator]() {
            for (let key of this.unitLiterals.keys()) {
                const value = this.unitLiterals.get(key);
                this.unitLiterals.delete(key);
                yield value;
            }
        }
        clear() {
            this.unitLiterals.clear();
        }
        size() {
            return this.unitLiterals.size;
        }
    }
    /// `SATSolver` solves the satisfiability problem on Boolean formulas in
    /// conjunctive-normal-form (an "and of ors").
    class SATSolver {
        constructor() {
            this.clauses = [];
            /// `watchedPositive[n]` is the `ClauseID`s that are "watching" the literal
            /// `+n`.
            /// A satisfied clauses watches two arbitrary literals within the clause.
            /// An unsatisfied clauses watches two unfalsified literals within the
            /// clause.
            /// Each clause array is continually re-ordered so that a watched literal is
            /// always one of the first two literals in the clause.
            this.watchedPositive = [];
            /// `watchedNegative[n]`: see `watchedPositive`.
            this.watchedNegative = [];
            /// `assignments[n]` is the assignment of term `n`.
            /// `0`: the term is unassigned.
            /// `1`: the term is assigned "true".
            /// `-1`: the term is assigned "false".
            this.assignments = [];
            /// `assignmentStack` is a stack of literals that have been assigned.
            this.assignmentStack = [];
            /// `assignmentStackPosition[t]` is the index of where to find an assignment
            /// to term `t` in `assignmentStack`, or `-1` for unassigned variables.
            this.assignmentStackPosition = [];
            /// `decisionLevel` is one more than the number of "free" assignments that
            /// have been made.
            this.decisionLevel = 0;
            /// `termDecisionLevel[t]` is the decision level at the time term `t` was
            /// given an assignment.
            /// (It is not-defined for unassigned terms)
            this.termDecisionLevel = [];
            /// `antecedentClause[n]` is a `ClauseID` which became a unit-clause
            /// "forcing" the assignment of this term (the "antecedent" clause).
            /// For an unassigned term `n`, `antecedentClause[n]` is not-defined.
            /// For a term assigned "freely" (rather than as a result of BCP), the value
            /// is `-1`.
            this.antecedentClause = [];
        }
        /// Initializes the internal data-structures for terms 1, 2, ..., `term`
        /// (if not already initialized).
        /// Terms must be initialized before being used in clauses passed to
        /// `addClause`.
        initTerms(term) {
            for (let i = this.assignments.length; i <= term; i++) {
                this.assignments[i] = 0;
                this.assignmentStackPosition[i] = -1;
                this.antecedentClause[i] = 0;
                this.watchedPositive[i] = [];
                this.watchedNegative[i] = [];
            }
        }
        /// RETURNS the current assignment stack.
        getAssignment() {
            return this.assignmentStack.slice(0);
        }
        /// solve solves this instance.
        solve() {
            if (this.decisionLevel > 0) {
                throw new Error("SATSolver.solve() requires decision level must be at 0");
            }
            else if (this.assignments.length === 0) {
                throw new Error("SATSolver.solve() requires at least one term");
            }
            else if (this.assignmentStack.length !== 0) {
                throw new Error("SATSolver.solve() requires no assignments have been made.");
            }
            // Find initial unit clauses (and later, pure literals).
            let unitLiterals = new UnitLiteralQueue();
            for (let i = 0; i < this.clauses.length; i++) {
                const clause = this.clauses[i];
                if (clause.length === 1) {
                    const literal = clause[0];
                    const conflict = unitLiterals.pushOrFindConflict(literal, i);
                    if (conflict !== null) {
                        // There are two contradicting unit-clauses.
                        return "unsatisfiable";
                    }
                }
            }
            this.decisionLevel = 0;
            const initialConflict = this.propagate(unitLiterals);
            if (initialConflict !== null) {
                return "unsatisfiable";
            }
            // Define an initial ordering for the terms. A consistent ordering of
            // terms means larger benefits from learned clauses.
            let ordering = [];
            for (let i = 1; i < this.assignments.length; i++) {
                ordering[i - 1] = i;
            }
            // Set up state for cVSIDS variable ordering heuristic.
            // (See "Understanding VSIDS Branching Heuristics in Conﬂict-Driven
            // Clause-Learning SAT Solvers")
            let termWeights = [];
            for (let i = 0; i < this.assignmentStackPosition.length; i++) {
                termWeights.push(0);
            }
            for (let clause of this.clauses) {
                if (clause.length < 2) {
                    continue;
                }
                // The initial number of occurrences of a variable is a very rough
                // indication of the "centrality" of the variable.
                for (let literal of clause) {
                    let term = literal > 0 ? literal : -literal;
                    termWeights[term] += 1;
                }
            }
            const termWeightComparator = (termA, termB) => {
                return termWeights[termB] - termWeights[termA];
            };
            ordering.sort(termWeightComparator);
            // Start the main CDCL loop.
            // Repeat assignments until an assigment has been made to every term.
            let cursor = 0;
            const termCount = this.assignments.length - 1;
            while (this.assignmentStack.length < termCount) {
                const decisionTerm = ordering[cursor];
                cursor += 1;
                cursor %= ordering.length;
                if (this.assignments[decisionTerm] !== 0) {
                    // This variable has already been assigned.
                    continue;
                }
                if (unitLiterals.size() !== 0) {
                    throw new Error("invariant violation");
                }
                // Enqueue a free decision.
                this.decisionLevel += 1;
                const expectNull = unitLiterals.pushOrFindConflict(+decisionTerm, -1);
                if (expectNull !== null) {
                    throw new Error("invariant violation: expected no conflict when no unit literals were found");
                }
                // Propagate unit consequences of that free decision.
                while (true) {
                    const conflict = this.propagate(unitLiterals);
                    if (conflict === null) {
                        break;
                    }
                    const conflictClause = this.diagnoseConflict(conflict);
                    let maxDecisionLevel = 0;
                    let conflictClauseTermSet = [];
                    for (let i = 0; i < conflictClause.length; i++) {
                        const conflictLiteral = conflictClause[i];
                        const conflictTerm = conflictLiteral > 0 ? conflictLiteral : -conflictLiteral;
                        maxDecisionLevel = Math.max(maxDecisionLevel, this.termDecisionLevel[conflictTerm]);
                        conflictClauseTermSet[conflictTerm] = true;
                    }
                    if (maxDecisionLevel == 0) {
                        // If the conflict-clause is all of terms prior to the
                        // first decision (including an empty conflict clause),
                        // this instance has been refuted.
                        return "unsatisfiable";
                    }
                    // Find the earliest decision level at which the conflict
                    // clause becomes a unit clause.
                    let countUnfalsified = conflictClause.length;
                    let decisionLevelBecomingUnit = 0;
                    for (let i = 0; i < this.assignmentStack.length; i++) {
                        const literal = this.assignmentStack[i];
                        const term = literal > 0 ? literal : -literal;
                        if (conflictClauseTermSet[term]) {
                            countUnfalsified -= 1;
                            if (countUnfalsified === 1) {
                                // UNIT CLAUSE.
                                decisionLevelBecomingUnit = this.termDecisionLevel[term];
                                break;
                            }
                        }
                    }
                    // Rewind at least one decision in the conflict clause.
                    this.rollbackToDecisionLevel(decisionLevelBecomingUnit);
                    // Then, add the clause, bearing in mind it SHOULD be a unit
                    // clause (asserting clause), which should expand
                    // propagation within a PREVIOUS decision level.
                    const conflictClauseID = this.addClause(conflictClause);
                    // Find the unit literal in the conflict clause.
                    let assertingLiteral = null;
                    for (let conflictLiteral of conflictClause) {
                        const conflictTerm = conflictLiteral > 0 ? conflictLiteral : -conflictLiteral;
                        const sign = this.assignments[conflictTerm];
                        if (sign * conflictLiteral > 0) {
                            throw new Error("invariant violation: conflictClause is satisfied by the current assignment");
                        }
                        else if (sign === 0) {
                            // Unassigned literal.
                            if (assertingLiteral === null) {
                                assertingLiteral = conflictLiteral;
                            }
                            else {
                                throw new Error("invariant violation: conflictClause is not an asserting clause (too many unassigned literals)");
                            }
                        }
                    }
                    if (assertingLiteral === null) {
                        throw new Error("invariant violation: conflictClause is not an asserting clause (contradiction)");
                    }
                    unitLiterals.clear();
                    unitLiterals.pushOrFindConflict(assertingLiteral, conflictClauseID);
                    // Use "cVSIDS" strategy for clause ordering.
                    for (let term = 0; term < termWeights.length; term++) {
                        if (conflictClauseTermSet[term]) {
                            termWeights[term] += 1;
                        }
                        else {
                            termWeights[term] *= 0.99;
                        }
                    }
                    ordering.sort(termWeightComparator);
                    // Ensure that variables are assigned in the same order.
                    // This means that subsequent conflicts are in the same
                    // "area" of the search space, and compound on each other.
                    cursor = 0;
                    // Continue in the unit-propagation loop.
                }
            }
            return this.getAssignment();
        }
        /// Adds a clause to this CNF-SAT instance.
        /// The array `clause` is interpreted as a conjunction ("and") of its
        /// contained literals.
        /// A clause is satisfied when at least one of its literals is satisfied.
        addClause(clause) {
            let hasUnassigned = false;
            for (let literal of clause) {
                const term = literal > 0 ? literal : -literal;
                if (this.assignments[term] === 0) {
                    hasUnassigned = true;
                    break;
                }
            }
            if (!hasUnassigned) {
                throw new Error("SATSolver.addClause() requires at least one unassigned literal");
            }
            let termFirstLiteral = {};
            for (let i = 0; i < clause.length; i++) {
                const literal = clause[i];
                const term = literal > 0 ? +literal : -literal;
                if (term in termFirstLiteral && termFirstLiteral[term] !== literal) {
                    // This clause is a tautology.
                    return -1;
                }
                termFirstLiteral[term] = literal;
            }
            const clauseID = this.clauses.length;
            this.clauses.push(clause);
            // Push unassigned literals to the front of the clause, with more
            // recently assigned literals after that, to reduce unnecessary watches.
            clause.sort((literalA, literalB) => {
                const termA = literalA > 0 ? literalA : -literalA;
                const termB = literalB > 0 ? literalB : -literalB;
                let rankA = this.assignmentStackPosition[termA];
                let rankB = this.assignmentStackPosition[termB];
                if (rankA < 0) {
                    rankA = this.assignmentStackPosition.length + 1;
                }
                if (rankB < 0) {
                    rankB = this.assignmentStackPosition.length + 1;
                }
                return rankB - rankA;
            });
            // Watch (up to) the first two literals.
            for (let i = 0; i < 2 && i < clause.length; i++) {
                const literal = clause[i];
                if (literal > 0) {
                    this.watchedPositive[literal].push(clauseID);
                }
                else {
                    this.watchedNegative[-literal].push(clauseID);
                }
            }
            return clauseID;
        }
        /// Validates that certain internal invariants hold. Useful for debugging.
        _validateWatches() {
            const happyLiterals = this.assignments.map((v, i) => v * i);
            const watches = this.clauses.map(x => []);
            for (let i = 1; i < this.watchedNegative.length; i++) {
                for (let clauseID of this.watchedNegative[i]) {
                    watches[clauseID].push(-i);
                }
                for (let clauseID of this.watchedPositive[i]) {
                    watches[clauseID].push(+i);
                }
            }
            for (let i = 0; i < this.clauses.length; i++) {
                const clause = this.clauses[i];
                let satisfied = false;
                const unfalsifiedLiterals = [];
                for (let literal of clause) {
                    if (happyLiterals.includes(literal)) {
                        satisfied = true;
                    }
                    else if (this.assignments[Math.abs(literal)] === 0) {
                        unfalsifiedLiterals.push(literal);
                    }
                }
                const w = watches[i];
                if (!satisfied) {
                    const unwatchedUnfalsified = unfalsifiedLiterals.filter(x => w.indexOf(x) < 0);
                    for (let watcher of w) {
                        const term = Math.abs(watcher);
                        if (this.assignments[term] * watcher < 0 && unwatchedUnfalsified.length >= 1) {
                            throw new Error(`Watched term ${term} in unsatisfied clause #${i} [${clause}] has been assigned ${this.assignments[term]}, and ${unwatchedUnfalsified} are available.`);
                        }
                    }
                }
                if (w.length > 2) {
                    throw new Error("Too many watched literals in this clause!");
                }
                else if (w.length < 2 && w.length < clause.length) {
                    throw new Error(`Too few watched literals in clause #${i} ${clause} watched only by ${w}`);
                }
                else if (w[0] !== clause[0] && w[0] !== clause[1]) {
                    throw new Error("First watched literal " + w[0] + " is not one of first two literals!");
                }
                else if (w[1] !== clause[0] && w[1] !== clause[1]) {
                    throw new Error("Second watched literal " + w[1] + " is not one of first two literals!");
                }
                if (!satisfied) {
                    if (unfalsifiedLiterals.length >= 2) {
                        for (let k of w) {
                            if (!unfalsifiedLiterals.includes(k)) {
                                throw new Error("Watched literal `" + k + "` has been falsified!");
                            }
                        }
                    }
                    if (w.length === 0) {
                        throw new Error("Clause " + clause + " is not being watched by any literals, but isn't satisfied!");
                    }
                }
            }
        }
        /// Assigns the literals in the `unitLiterals` queue, and then performs
        /// boolean-constraint-propagation, resulting in more assignments
        /// to newly created unit clauses.
        /// RETURNS a conflict when boolean-constraint-propagation results in a
        /// conflict: see `UnitLiteralQueue.pushOrFindConflict`.
        /// RETURNS `null` when the queue was completely drained without
        /// encountering a conflict.
        propagate(unitLiterals) {
            for (let [unitLiteral, antecedent] of unitLiterals) {
                // Invariant: the literal "not unitLiteral" is not in
                // `unitLiterals`.
                const [newUnitLiterals, newAntecedents] = this.assign(unitLiteral, antecedent);
                for (let i = 0; i < newUnitLiterals.length; i++) {
                    const conflict = unitLiterals.pushOrFindConflict(newUnitLiterals[i], newAntecedents[i]);
                    if (conflict !== null) {
                        // There are two contradicting unit-clauses; we are still
                        // prior to any decisions, so the formula overall must be
                        // unsatisfiable.
                        return {
                            literal: newUnitLiterals[i],
                            literalAntecedent: newAntecedents[i],
                            negativeLiteralAntecedent: conflict,
                        };
                    }
                }
            }
            return null;
        }
        /// REQUIRES the given term is currently unassigned.
        /// REQUIRES that this assignment doesn't result in any falsified clauses.
        /// MODIFIES the data for this term to reflect the new assignment.
        /// RETURNS newly created unit-clauses following this assignment.
        assign(assignedLiteral, causingClause) {
            const discoveredUnitLiterals = [];
            const discoveredAntecedents = [];
            const assignedTerm = assignedLiteral > 0 ? assignedLiteral : -assignedLiteral;
            if (this.assignments[assignedTerm] !== 0) {
                throw new Error("SATSolver.assign() requires literal is not already assigned");
            }
            const watchers = assignedLiteral > 0 ? this.watchedNegative[assignedTerm] : this.watchedPositive[assignedTerm];
            let watchersKeepIndex = 0;
            for (let wi = 0; wi < watchers.length; wi++) {
                const watchingClauseID = watchers[wi];
                const watchingClause = this.clauses[watchingClauseID];
                let satisfiedIndex = -1;
                let unfalsfiedCount = 0;
                let latestUnfalsfiedLiteralIndex = -1;
                for (let i = 0; i < watchingClause.length; i++) {
                    const l = watchingClause[i];
                    const t = l > 0 ? l : -l;
                    const a = this.assignments[t];
                    const satisfyiedBy = l > 0 ? +1 : -1;
                    if (a === satisfyiedBy) {
                        satisfiedIndex = i;
                        break;
                    }
                    else if (a === 0) {
                        unfalsfiedCount += 1;
                        // N.B.: since watched literals are pushed to the front of
                        // the watchingClause array, if there are any unwatched
                        // unfalsified literals, they will be the result of this
                        // loop.
                        latestUnfalsfiedLiteralIndex = i;
                    }
                }
                // Either find a new literal to watch,
                // or recognize that this `watchingClause` is now a unit clause.
                const destination = watchingClause[0] === -assignedLiteral ? 0 : 1;
                // As an optimization, try to prevent more useless wake-ups by
                // swapping this watch with an earlier assigned that satisfied the
                // clause.
                if (satisfiedIndex >= 0) {
                    if (satisfiedIndex <= 1) {
                        // There are no unwatched satisfied literals in this clause,
                        // so this literal will remain the watcher.
                        // N.B.: without this, this watcher would be cleared at the
                        // end of this loop.
                        watchers[watchersKeepIndex] = watchingClauseID;
                        watchersKeepIndex += 1;
                    }
                    else {
                        // This clause is already satisfied, and does not require
                        // any further updates or inspection.
                        const satisfiedLiteral = watchingClause[satisfiedIndex];
                        swap(watchingClause, destination, satisfiedIndex);
                        if (satisfiedLiteral > 0) {
                            // Positive
                            this.watchedPositive[satisfiedLiteral].push(watchingClauseID);
                        }
                        else {
                            // Negative
                            this.watchedNegative[-satisfiedLiteral].push(watchingClauseID);
                        }
                    }
                    continue;
                }
                if (unfalsfiedCount == 1) {
                    // `this.assignments` is not yet updated; thus the only
                    // falsified literal is the one being deleted; so this is a
                    // conflicting unit-clause.
                    throw new Error(`This assignment falsifies the clause #${watchingClauseID}.`
                        + `\n(adding assignment ${assignedLiteral} to stack [${this.assignmentStack}];`
                        + `\nwatchingClause =#${watchingClauseID} ${watchingClause})`);
                }
                else if (unfalsfiedCount == 2) {
                    // `watchingClause` is not yet satisfied, and has no unfalsified
                    // literals other than its two watched literals.
                    // Thus, this is becoming a unit clause of only the other
                    // watched literal.
                    discoveredUnitLiterals.push(watchingClause[1 - destination]);
                    discoveredAntecedents.push(watchingClauseID);
                    // Keep the literal watched, since there isn't another literal
                    // to watch it.
                    watchers[watchersKeepIndex] = watchingClauseID;
                    watchersKeepIndex += 1;
                }
                else {
                    // There remains an unfalsified literal, other than the two
                    // watched literals, in this unsatisfied watchingClause.
                    const newWatchedLiteral = watchingClause[latestUnfalsfiedLiteralIndex];
                    if (newWatchedLiteral > 0) {
                        this.watchedPositive[newWatchedLiteral].push(watchingClauseID);
                    }
                    else {
                        this.watchedNegative[-newWatchedLiteral].push(watchingClauseID);
                    }
                    swap(watchingClause, destination, latestUnfalsfiedLiteralIndex);
                }
            }
            watchers.length = watchersKeepIndex;
            this.assignments[assignedTerm] = assignedLiteral > 0 ? +1 : -1;
            this.assignmentStackPosition[assignedTerm] = this.assignmentStack.length;
            this.assignmentStack.push(assignedLiteral);
            this.antecedentClause[assignedTerm] = causingClause;
            this.termDecisionLevel[assignedTerm] = this.decisionLevel;
            return [
                discoveredUnitLiterals,
                discoveredAntecedents,
            ];
        }
        diagnoseConflict(conflict) {
            // This method is called when a "conflict" is detected:
            // boolean-constraint-propagation results in a unit clause "literal"
            // and "not literal".
            // `literalAntecedent` indicates the clause within which "literal" is a
            // unit clause; `negativeLiteralAntecedent` indicates the same for
            // "not literal".
            // This method must "diagnose" the conflict, producing a new clause
            // which rejects previous "decisions".
            // The simplest diagnosis is to reject the entire set of decision
            // currently in the assignment stack. However, some of those decisions
            // may not be relevant to this particular conflict; generating a more
            // general conflict clause will prune more of the remaining search
            // space.
            // The `antecedentClause` mapping can be used to generate an
            // "implication graph". The vertices of the graph are literals.
            // For non-decision variables, an edge exists for the negation of each
            // other literal in the vertex's selected antecedent clause.
            // This implication graph structure indicates that a vertex is _implied_
            // by the conjunction of all predecessor vertices. A vertex with no
            // precedessors is a "decision variable", and had a truth value selected
            // arbitrarily.
            // The problem of "diagnosing" a conflict is determing a set of vertices
            // which transitively imply the conflicting the two conflicting
            // literals.
            // To drive backtracking solely by conflict clauses, the conflict clause
            // should be an "asserting clause" -- one which will be a unit clause
            // after unassigning all decisions mentioned in the conflict. This means
            // it must have only one literal from the latest decision level.
            // The simplest method is "rel_sat": resolve all literals in the current
            // decision level except the decision variable:
            let conflictClause = [];
            let seen = new Set();
            let q = [conflict.literal, -conflict.literal];
            for (let i = 0; i < q.length; i++) {
                const literal = q[i];
                const term = literal > 0 ? literal : -literal;
                let antecedent;
                if (literal == conflict.literal) {
                    antecedent = conflict.literalAntecedent;
                }
                else if (literal == -conflict.literal) {
                    antecedent = conflict.negativeLiteralAntecedent;
                }
                else {
                    antecedent = this.antecedentClause[term];
                }
                if (antecedent < 0 || (this.termDecisionLevel[term] < this.decisionLevel && literal !== conflict.literal && literal !== -conflict.literal)) {
                    conflictClause.push(literal);
                }
                else {
                    const clause = this.clauses[antecedent];
                    for (let other of clause) {
                        if (other !== literal && !seen.has(other)) {
                            seen.add(other);
                            q.push(other);
                        }
                    }
                }
            }
            return conflictClause;
        }
        rollbackToDecisionLevel(level) {
            while (this.decisionLevel > level && this.assignmentStack.length > 0) {
                this.popAssignment();
            }
            if (this.assignmentStack.length === 0) {
                if (level > 0) {
                    throw new Error(`bad level argument ${level}`);
                }
            }
        }
        popAssignment() {
            // N.B.: The two-watched-literal scheme requires no bookkeeping updates
            // upon unassignment.
            const literal = this.assignmentStack.pop();
            if (!literal)
                throw new Error("cannot pop when empty");
            const term = literal > 0 ? literal : -literal;
            this.assignments[term] = 0;
            this.assignmentStackPosition[term] = -1;
            if (this.antecedentClause[term] < 0) {
                this.decisionLevel -= 1;
            }
        }
    }
    exports.SATSolver = SATSolver;
    ;
});
define("shiru/smt", ["require", "exports", "shiru/sat"], function (require, exports, sat) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.SMTSolver = void 0;
    /// SMTSolver represents an "satisfiability modulo theories" instance, with
    /// support for quantifier instantiation.
    /// With respect to refutation, SMTSolver is sound but not complete -- some
    /// returned "satisfactions" do not actually satisfy the instance, but all
    /// refutation results definitely refute the instance.
    class SMTSolver {
        constructor() {
            this.clauses = [];
            this.unscopedClauses = [];
            this.scopes = [];
            /// TODO: Instantiation of quantifiers, which is sometimes done in the place
            /// of making decisions in the SATSolver.
        }
        addConstraint(constraint) {
            for (let clause of this.clausify(constraint)) {
                this.addClausified(clause, this.clauses);
            }
        }
        addUnscopedConstraint(constraint) {
            for (const clause of this.clausify(constraint)) {
                this.addClausified(clause, this.unscopedClauses);
            }
        }
        addClausified(clause, target) {
            let maxTerm = 0;
            for (let literal of clause) {
                const term = literal > 0 ? literal : -literal;
                maxTerm = Math.max(maxTerm, term);
            }
            target.push(clause);
        }
        pushScope() {
            this.scopes.push({
                clauseCount: this.clauses.length,
            });
        }
        popScope() {
            const scope = this.scopes.pop();
            if (scope === undefined) {
                throw new Error("SMTSolver.popScope");
            }
            this.clauses.splice(scope.clauseCount);
        }
        /// RETURNS "refuted" when the given constraints can provably not be
        /// satisfied.
        /// RETURNS a counter example (satisfaction) when refutation fails; this may
        /// not be a truly realizable counter-examples, as instantiation and the
        /// theory solver may be incomplete.
        attemptRefutation() {
            const solver = new sat.SATSolver();
            for (const clause of this.unscopedClauses) {
                if (clause.length === 0) {
                    return "refuted";
                }
                const maxTerm = Math.max(...clause.map(x => x > 0 ? x : -x));
                solver.initTerms(maxTerm);
                solver.addClause(clause);
            }
            let progress = 0;
            while (true) {
                while (progress < this.clauses.length) {
                    const clause = this.clauses[progress];
                    if (clause.length === 0) {
                        return "refuted";
                    }
                    const maxTerm = Math.max(...clause.map(x => x > 0 ? x : -x));
                    solver.initTerms(maxTerm);
                    solver.addClause(clause);
                    progress += 1;
                }
                const booleanModel = solver.solve();
                if (booleanModel === "unsatisfiable") {
                    return "refuted";
                }
                else {
                    // Clausal proof adds additional constraints to the formula, which
                    // preserve satisfiablity (but not necessarily logical equivalence).
                    // These are useful in subsequent runs of the solver; HOWEVER,
                    // clauses which merely preserve satisfiability and not logical
                    // equivalence must be pruned.
                    // TODO: Remove (and attempt to re-add) any non-implied clauses.
                    const theoryClause = this.rejectModel(booleanModel);
                    if (Array.isArray(theoryClause)) {
                        // Completely undo the assignment.
                        // TODO: theoryClause should be an asserting clause, so the
                        // logic in backtracking should be able to replace this.
                        solver.rollbackToDecisionLevel(-1);
                        if (theoryClause.length === 0) {
                            throw new Error("TODO: loop zero");
                        }
                        solver.addClause(theoryClause);
                    }
                    else {
                        // TODO: Instantiation may need to take place here.
                        // The SAT+SMT solver has failed to refute the formula.
                        solver.rollbackToDecisionLevel(-1);
                        return theoryClause;
                    }
                }
            }
        }
    }
    exports.SMTSolver = SMTSolver;
});
define("shiru/uf", ["require", "exports", "shiru/data", "shiru/egraph", "shiru/ir", "shiru/smt"], function (require, exports, data_3, egraph, ir, smt) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.UFTheory = exports.UFSolver = void 0;
    function transitivitySearch(digraphOutEdges, source, target) {
        const reached = new Set();
        const frontier = [{ source, reason: new Set() }];
        while (frontier.length !== 0) {
            const top = frontier.pop();
            const outEdges = digraphOutEdges.get(top.source);
            for (const outEdge of outEdges) {
                if (!reached.has(outEdge.target)) {
                    const reason = new Set([...top.reason, ...outEdge.reason]);
                    if (outEdge.target === target) {
                        return reason;
                    }
                    reached.add(outEdge.target);
                    frontier.push({
                        source: outEdge.target,
                        reason,
                    });
                }
            }
        }
        return null;
    }
    ;
    class UFSolver {
        constructor() {
            this.values = new Map();
            this.fns = new Map();
            this.egraph = new egraph.EGraph();
            this.constants = new data_3.DefaultMap(constant => {
                const varID = Symbol("uf-constant");
                const object = this.egraph.add(varID, [], "constant", String(constant));
                this.values.set(object, { tag: "constant", constant });
                return object;
            });
            // Create symbolic constants for the two boolean values.
            this.trueObject = this.createConstant(true);
            this.falseObject = this.createConstant(false);
        }
        createVariable(hint) {
            const varID = Symbol("uf-var");
            const object = this.egraph.add(varID, [], undefined, hint);
            this.values.set(object, { tag: "var", var: Symbol("uf-var") });
            return object;
        }
        createFn(semantics) {
            const fnID = Symbol("uf-fn");
            if (semantics.transitiveAcyclic && !semantics.transitive) {
                throw new Error("UFSolver.createFn: semantics.transitiveAcyclic requires semantics.transitive");
            }
            this.fns.set(fnID, semantics);
            return fnID;
        }
        createApplication(fn, args) {
            const object = this.egraph.add(fn, args);
            this.values.set(object, { tag: "app", fn, args });
            return object;
        }
        createConstant(literal) {
            return this.constants.get(literal);
        }
        getDefinition(valueID) {
            const value = this.values.get(valueID);
            if (value === undefined) {
                throw new Error("UFSolver.getDefinition: no such value");
            }
            return value;
        }
        getFnSemantics(fnID) {
            const semantics = this.fns.get(fnID);
            if (semantics === undefined) {
                throw new Error("UFSolver.getFnSemantics: no such fn");
            }
            return semantics;
        }
        /// refuteAssumptions(assumptions) returns a set of facts which the solver
        /// has determined are inconsistent, or a model ("counterexample") when the
        /// facts appear to be consistent.
        /// refuteAssumptions() is _sound_ with respect to refutation; when
        /// "inconsistent" is returned, the assumptions are definitely inconsistent.
        refuteAssumptions(assumptions) {
            this.egraph.reset();
            for (const assumption of assumptions) {
                const truthObject = assumption.assignment
                    ? this.trueObject
                    : this.falseObject;
                this.egraph.merge(truthObject, assumption.constraint, new Set([assumption.reason]));
            }
            let progress = true;
            while (progress) {
                progress = false;
                const classes = this.egraph.getClasses(true);
                // Iterate over all true constraints (those equal to the true
                // object).
                const trueClass = classes.get(this.trueObject);
                for (const trueMember of trueClass.members) {
                    const reasonTrue = this.egraph.query(this.trueObject, trueMember.id);
                    const handled = this.handleTrueMember(trueMember.term, trueMember.operands, reasonTrue);
                    if (handled === "change") {
                        progress = true;
                    }
                    else if (handled !== "no-change") {
                        return handled;
                    }
                }
                // Iterate over all false constraints (those equal to the false
                // object).
                const falseClass = classes.get(this.falseObject);
                for (const falseMember of falseClass.members) {
                    const reasonFalse = this.egraph.query(this.falseObject, falseMember.id);
                    const handled = this.handleFalseMember(falseMember.term, falseMember.operands, reasonFalse);
                    if (handled === "change") {
                        progress = true;
                    }
                    else if (handled !== "no-change") {
                        return handled;
                    }
                }
                if (this.egraph.updateCongruence()) {
                    progress = true;
                }
                if (this.propagateFnInterpreters() === "change") {
                    progress = true;
                }
                const inconsistency = this.findInconsistentConstants()
                    || this.findTransitivityContradictions();
                if (inconsistency !== null) {
                    return {
                        tag: "inconsistent",
                        inconsistent: inconsistency,
                    };
                }
            }
            // The UFSolver has failed to show that the given assumptions are
            // inconsistent.
            return {
                tag: "model",
                model: {},
            };
        }
        handleTrueMember(term, operands, reasonTrue) {
            const semantics = this.fns.get(term);
            if (semantics !== undefined) {
                if (semantics.eq) {
                    const newKnowledge = this.egraph.merge(operands[0], operands[1], reasonTrue);
                    if (newKnowledge) {
                        return "change";
                    }
                }
            }
            return "no-change";
        }
        handleFalseMember(term, operands, reasonFalse) {
            const semantics = this.fns.get(term);
            if (semantics !== undefined) {
                if (semantics.eq) {
                    const query = this.egraph.query(operands[0], operands[1]);
                    if (query !== null) {
                        return {
                            tag: "inconsistent",
                            inconsistent: new Set([...query, ...reasonFalse]),
                        };
                    }
                }
            }
            return "no-change";
        }
        /// `evaluateConstant` returns a constant (as it was passed to
        /// `createConstant`) that is equal to the given value under the current
        /// constraints.
        evaluateConstant(value) {
            const constants = this.egraph.getTagged("constant", value);
            if (constants.length === 0) {
                return null;
            }
            const id = constants[0].id;
            const valueDefinition = this.values.get(id);
            if ((valueDefinition === null || valueDefinition === void 0 ? void 0 : valueDefinition.tag) !== "constant") {
                throw new Error("UFSolver.evaluateConstant: non-literal tagged");
            }
            return {
                constant: valueDefinition.constant,
                reason: this.egraph.query(value, id),
            };
        }
        /// `propagateFnInterpreters()` adds additional constants and equalities by
        /// using the `interpreter` semantics of functions.
        propagateFnInterpreters() {
            let madeChanges = false;
            while (true) {
                let iterationMadeChanges = false;
                for (const [eclass, { members }] of this.egraph.getClasses()) {
                    for (const member of members) {
                        const semantics = this.fns.get(member.term);
                        if (semantics !== undefined) {
                            const interpreter = semantics.interpreter;
                            if (interpreter !== undefined) {
                                const reason = new Set();
                                const args = [];
                                for (const operand of member.operands) {
                                    const ec = this.evaluateConstant(operand);
                                    if (ec !== null) {
                                        args.push(ec.constant);
                                        for (const s of ec.reason) {
                                            reason.add(s);
                                        }
                                    }
                                    else {
                                        args.push(null);
                                    }
                                }
                                const r = interpreter.f(...args);
                                if (r !== null) {
                                    const constant = this.createConstant(r);
                                    const changed = this.egraph.merge(constant, eclass, reason);
                                    if (changed) {
                                        iterationMadeChanges = true;
                                    }
                                }
                            }
                        }
                    }
                }
                if (!iterationMadeChanges) {
                    break;
                }
                madeChanges = true;
            }
            return madeChanges ? "change" : "no-change";
        }
        findTransitivityContradictions() {
            // A directed graph for each transitive function.
            const digraphs = new data_3.DefaultMap(f => {
                return new data_3.DefaultMap(k => []);
            });
            // Retrieve the true/false constraints.
            const classes = this.egraph.getClasses(true);
            const trueClass = classes.get(this.trueObject);
            const falseClass = classes.get(this.falseObject);
            if (trueClass === undefined) {
                throw new Error("findTransitivityContradictions: ICE");
            }
            else if (falseClass === undefined) {
                throw new Error("findTransitivityContradictions: ICE");
            }
            // For each transitive function, build a directed graph for each
            // application in the "true" equality class.
            for (const app of trueClass.members) {
                const semantics = this.fns.get(app.term);
                if (semantics !== undefined && semantics.transitive === true) {
                    if (app.operands.length !== 2) {
                        throw new Error("findTransitivityContradictions: ICE");
                    }
                    const source = app.operands[0];
                    const target = app.operands[1];
                    const sourceRep = this.egraph.getRepresentative(source);
                    const targetRep = this.egraph.getRepresentative(target);
                    const reason = new Set([
                        ...this.egraph.query(this.trueObject, app.id),
                        ...this.egraph.query(source, sourceRep),
                        ...this.egraph.query(target, targetRep),
                    ]);
                    digraphs.get(app.term).get(sourceRep).push({
                        reason: reason,
                        target: targetRep,
                    });
                }
            }
            // Find each negative transitive constraint.
            for (const app of falseClass.members) {
                const semantics = this.fns.get(app.term);
                if (semantics !== undefined && semantics.transitive === true) {
                    if (app.operands.length !== 2) {
                        throw new Error("findTransitivityContradictions: ICE");
                    }
                    const source = app.operands[0];
                    const target = app.operands[1];
                    const sourceRep = this.egraph.getRepresentative(source);
                    const targetRep = this.egraph.getRepresentative(target);
                    // Naively performs a DFS on the set of `<` edges, searching for
                    // a contradiction.
                    const transitiveChain = transitivitySearch(digraphs.get(app.term), sourceRep, targetRep);
                    if (transitiveChain !== null) {
                        return new Set([
                            ...this.egraph.query(source, sourceRep),
                            ...this.egraph.query(target, targetRep),
                            ...transitiveChain,
                            ...this.egraph.query(app.id, this.falseObject),
                        ]);
                    }
                }
            }
            // Find violations of transitive-acyclic semantics.
            for (const [id] of classes) {
                if (this.egraph.getRepresentative(id) !== id) {
                    // Only consider e-class representatives.
                    continue;
                }
                // Search for a path from the group to itself.
                for (const [fnID, digraph] of digraphs) {
                    const semantics = this.fns.get(fnID);
                    if (semantics.transitiveAcyclic === true) {
                        const transitiveChain = transitivitySearch(digraph, id, id);
                        if (transitiveChain !== null) {
                            return transitiveChain;
                        }
                    }
                }
            }
            return null;
        }
        /// findInconsistentConstants() returns a set of reasons which are
        /// inconsistent because they imply that two distinct constants are equal.
        findInconsistentConstants() {
            for (const [id, _group] of this.egraph.getClasses()) {
                const constants = this.egraph.getTagged("constant", id);
                if (constants.length > 1) {
                    // Two distinct constants are in the same equality class.
                    return new Set([...this.egraph.query(constants[0].id, constants[1].id)]);
                }
            }
            return null;
        }
    }
    exports.UFSolver = UFSolver;
    /// UFTheory implements the "theory of uninterpreted functions".
    /// This theory understands the properties of equality
    /// (symmetric, reflexive, and transitive)
    /// as well as the "congruence" of function application:
    /// a == b implies f(a) == f(b)
    class UFTheory extends smt.SMTSolver {
        constructor() {
            super(...arguments);
            // The UF-theory solver that solves Boolean assignments to theory
            // constraints.
            this.solver = new UFSolver();
            // The next SAT term to vend in clausification.
            this.nextSatTerm = 1;
            // The SAT term associated with a given Boolean-typed object tracked by the
            // solver.
            this.termByObject = new data_3.DefaultMap(object => {
                const term = this.nextSatTerm;
                this.nextSatTerm += 1;
                this.objectByTerm.set(term, object);
                return term;
            });
            // The Boolean-typed object associated with the given SAT term.
            this.objectByTerm = new Map();
            this.eqFn = this.createFunction(ir.T_BOOLEAN, { eq: true });
        }
        createVariable(type) {
            const v = this.solver.createVariable();
            if (ir.equalTypes(ir.T_BOOLEAN, type)) {
                // Boolean-typed variables must be equal to either true or false.
                // This constraint ensures that the sat solver will commit the
                // variable to a particular assignment.
                this.addUnscopedConstraint([
                    this.createApplication(this.eqFn, [this.solver.trueObject, v]),
                    this.createApplication(this.eqFn, [this.solver.falseObject, v]),
                ]);
            }
            return v;
        }
        createConstant(t, c) {
            if (c === null || c === undefined) {
                throw new Error("createConstant: cannot use `" + c + "` as constant");
            }
            return this.solver.createConstant(c);
        }
        createFunction(returnType, semantics) {
            return this.solver.createFn(semantics);
        }
        createApplication(fnID, args) {
            return this.solver.createApplication(fnID, args);
        }
        toSatLiteral(valueID) {
            const value = this.solver.getDefinition(valueID);
            if (value.tag === "app") {
                const semantics = this.solver.getFnSemantics(value.fn);
                if (semantics.not === true) {
                    return -this.toSatLiteral(value.args[0]);
                }
            }
            return this.termByObject.get(valueID);
        }
        clausify(disjunction) {
            const clause = [];
            for (const value of disjunction) {
                clause.push(this.toSatLiteral(value));
            }
            return [clause];
        }
        rejectModel(literals) {
            const assumptions = [];
            for (const literal of literals) {
                const term = literal > 0 ? +literal : -literal;
                const object = this.objectByTerm.get(term);
                assumptions.push({
                    constraint: object,
                    assignment: literal > 0,
                    reason: literal,
                });
            }
            const result = this.solver.refuteAssumptions(assumptions);
            if (result.tag === "inconsistent") {
                const learnedClause = [];
                for (const element of result.inconsistent) {
                    learnedClause.push(-element);
                }
                return learnedClause;
            }
            return result.model;
        }
    }
    exports.UFTheory = UFTheory;
});
define("shiru/verify", ["require", "exports", "shiru/data", "shiru/diagnostics", "shiru/ir", "shiru/semantics", "shiru/uf"], function (require, exports, data_4, diagnostics, ir, semantics_1, uf) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.verifyProgram = void 0;
    function verifyProgram(program) {
        const problems = [];
        // Index impls by their interface signatures.
        const interfaceSignaturesByImplFn = indexInterfaceSignaturesByImplFn(program);
        // Verify each interface signature.
        for (const i in program.interfaces) {
            problems.push(...verifyInterface(program, i, interfaceSignaturesByImplFn));
        }
        // Verify each function body.
        for (let f in program.functions) {
            problems.push(...verifyFunction(program, f, interfaceSignaturesByImplFn));
        }
        return problems;
    }
    exports.verifyProgram = verifyProgram;
    function verifyInterface(program, interfaceName, interfaceSignaturesByImplFn) {
        const state = new VerificationState(program, foreignInterpeters, interfaceSignaturesByImplFn);
        const trait = program.interfaces[interfaceName];
        // Create the type scope for the interface's subjects.
        const interfaceTypeScope = new Map();
        for (let i = 0; i < trait.type_parameters.length; i++) {
            const typeVariable = trait.type_parameters[i];
            const typeID = state.smt.createVariable(ir.T_ANY);
            interfaceTypeScope.set(typeVariable, typeID);
        }
        state.pushTypeScope(interfaceTypeScope);
        // Validate that the interface's contracts are well-formed, in that
        // they explicitly guarantee their internal preconditions.
        for (const member in trait.signatures) {
            const signature = trait.signatures[member];
            // Create the type scope for this member's type parameters.
            const signatureTypeScope = new Map();
            for (let i = 0; i < signature.type_parameters.length; i++) {
                const typeVariable = signature.type_parameters[i];
                const typeID = state.smt.createVariable(ir.T_ANY);
                signatureTypeScope.set(typeVariable, typeID);
            }
            state.pushTypeScope(signatureTypeScope);
            const functionScope = state.pushVariableScope(true);
            // Create symbolic values for the arguments.
            for (const parameter of signature.parameters) {
                state.defineVariable(parameter, state.smt.createVariable(parameter.type));
            }
            // Verify that preconditions explicitly state their own preconditions,
            // and assume that they hold for postconditions.
            for (const precondition of signature.preconditions) {
                traverseBlock(program, new Map(), precondition.block, state, {
                    // Return ops within a precondition don't have their own
                    // postconditions.
                    verifyAtReturn: [],
                }, () => {
                    state.assumeGuaranteedInPath(precondition.precondition);
                });
            }
            // Create symbolic values for the returns.
            const symbolicReturned = [];
            for (const r of signature.return_types) {
                symbolicReturned.push(state.smt.createVariable(r));
            }
            for (const postcondition of signature.postconditions) {
                const local = new Map();
                for (let i = 0; i < symbolicReturned.length; i++) {
                    local.set(postcondition.returnedValues[i], symbolicReturned[i]);
                }
                traverseBlock(program, local, postcondition.block, state, {
                    // Return ops within a postcondition don't have their own
                    // postconditions.
                    verifyAtReturn: [],
                }, () => {
                    state.assumeGuaranteedInPath(postcondition.postcondition);
                });
            }
            state.popVariableScope(functionScope);
            state.popTypeScope();
        }
        state.popTypeScope();
        return state.failedVerifications;
    }
    function indexInterfaceSignaturesByImplFn(program) {
        const map = new data_4.DefaultMap(_ => []);
        // Add each implementation to the map.
        for (const implID in program.globalVTableFactories) {
            const impl = program.globalVTableFactories[implID];
            for (const memberID in impl.entries) {
                const implMember = impl.entries[memberID];
                map.get(implMember.implementation).push({ implID, memberID });
            }
        }
        return map;
    }
    const foreignInterpeters = {
        "Int+": {
            f(a, b) {
                if (a === null || b === null) {
                    return null;
                }
                else if (typeof a !== "bigint") {
                    throw new Error("foreignInterpreters['Int+']: got non bigint `" + a + "`");
                }
                else if (typeof b !== "bigint") {
                    throw new Error("foreignInterpreters['Int+']: got non bigint `" + b + "`");
                }
                return a + b;
            },
        },
    };
    function assumeStaticPreconditions(program, signature, valueArguments, typeArguments, state) {
        if (signature.type_parameters.length !== typeArguments.length) {
            throw new Error("ICE: type argument count mismatch");
        }
        else if (signature.parameters.length !== valueArguments.length) {
            throw new Error("ICE: value argument count mismatch");
        }
        const typeScope = new Map();
        for (let i = 0; i < signature.type_parameters.length; i++) {
            typeScope.set(signature.type_parameters[i], typeArguments[i]);
        }
        const valueScope = new Map();
        for (let i = 0; i < signature.parameters.length; i++) {
            valueScope.set(signature.parameters[i], valueArguments[i]);
        }
        const hidingTypeScope = state.pushHidingTypeScope();
        state.pushTypeScope(typeScope);
        const variableScope = state.pushVariableScope(true);
        for (let i = 0; i < signature.preconditions.length; i++) {
            const precondition = signature.preconditions[i];
            traverseBlock(program, valueScope, precondition.block, state, {
                // Return ops within a precondition block do not have their own
                // postconditions.
                verifyAtReturn: [],
            }, () => {
                state.assumeGuaranteedInPath(precondition.precondition);
            });
        }
        state.popVariableScope(variableScope);
        state.popTypeScope();
        state.popHidingTypeScope(hidingTypeScope);
    }
    /// implFnTypeArguments: The arguments to the impl fn. These are the impl's
    /// "for_any" type parameters, followed by the interface-signature's type
    /// parameters.
    function assumeConstraintPreconditions(program, valueArguments, implFnTypeArguments, implementing, state) {
        const impl = program.globalVTableFactories[implementing.implID];
        const interfaceEntity = program.interfaces[impl.provides.interface];
        const interfaceSignature = interfaceEntity.signatures[implementing.memberID];
        if (implFnTypeArguments.length !== impl.for_any.length + interfaceSignature.type_parameters.length) {
            throw new Error("ICE: mismatching implFnTypeArguments.length");
        }
        const typeScope = new Map();
        for (let i = 0; i < interfaceEntity.type_parameters.length; i++) {
            const typeParameter = interfaceEntity.type_parameters[i];
            const typeArgument = state.getTypeID(impl.provides.subjects[i]);
            typeScope.set(typeParameter, typeArgument);
        }
        for (let i = 0; i < interfaceSignature.type_parameters.length; i++) {
            const typeParameter = interfaceSignature.type_parameters[i];
            const typeArgument = implFnTypeArguments[impl.for_any.length + i];
            typeScope.set(typeParameter, typeArgument);
        }
        const variableScope = new Map();
        for (let i = 0; i < valueArguments.length; i++) {
            variableScope.set(interfaceSignature.parameters[i], valueArguments[i]);
        }
        const hidingTypeScope = state.pushHidingTypeScope();
        state.pushTypeScope(typeScope);
        const hidingVariableScope = state.pushVariableScope(true);
        for (const precondition of interfaceSignature.preconditions) {
            traverseBlock(program, variableScope, precondition.block, state, {
                verifyAtReturn: [],
            }, () => {
                state.assumeGuaranteedInPath(precondition.precondition);
            });
        }
        state.popVariableScope(hidingVariableScope);
        state.popTypeScope();
        state.popHidingTypeScope(hidingTypeScope);
    }
    function generateToVerifyFromConstraint(program, valueArguments, implFnTypeArguments, implementing, state) {
        const impl = program.globalVTableFactories[implementing.implID];
        const interfaceEntity = program.interfaces[impl.provides.interface];
        const interfaceSignature = interfaceEntity.signatures[implementing.memberID];
        if (implFnTypeArguments.length !== impl.for_any.length + interfaceSignature.type_parameters.length) {
            throw new Error("ICE: mismatching implFnTypeArguments.length");
        }
        const typeScope = new Map();
        for (let i = 0; i < interfaceEntity.type_parameters.length; i++) {
            const typeParameter = interfaceEntity.type_parameters[i];
            const typeArgument = state.getTypeID(impl.provides.subjects[i]);
            typeScope.set(typeParameter, typeArgument);
        }
        for (let i = 0; i < interfaceSignature.type_parameters.length; i++) {
            const typeParameter = interfaceSignature.type_parameters[i];
            const typeArgument = implFnTypeArguments[impl.for_any.length + i];
            typeScope.set(typeParameter, typeArgument);
        }
        const out = [];
        for (const postcondition of interfaceSignature.postconditions) {
            const variableScope = new Map();
            for (let i = 0; i < valueArguments.length; i++) {
                variableScope.set(interfaceSignature.parameters[i], { tag: "symbolic", symbolic: valueArguments[i] });
            }
            for (let i = 0; i < postcondition.returnedValues.length; i++) {
                variableScope.set(postcondition.returnedValues[i], { tag: "returned", returnedIndex: i });
            }
            out.push({
                postcondition,
                variableScope,
                typeIDScope: typeScope,
            });
        }
        return out;
    }
    function generateToVerifyFromStatic(signature, valueArguments, typeArguments) {
        if (signature.type_parameters.length !== typeArguments.length) {
            throw new Error("ICE: type argument count mismatch");
        }
        else if (signature.parameters.length !== valueArguments.length) {
            throw new Error("ICE: value argument count mismatch");
        }
        const typeScope = new Map();
        for (let i = 0; i < signature.type_parameters.length; i++) {
            typeScope.set(signature.type_parameters[i], typeArguments[i]);
        }
        const out = [];
        for (const postcondition of signature.postconditions) {
            // Setup verify-at-return for this postcondition.
            const variableScope = new Map();
            for (let i = 0; i < signature.parameters.length; i++) {
                variableScope.set(signature.parameters[i], { tag: "symbolic", symbolic: valueArguments[i] });
            }
            for (let i = 0; i < postcondition.returnedValues.length; i++) {
                variableScope.set(postcondition.returnedValues[i], { tag: "returned", returnedIndex: i });
            }
            out.push({
                postcondition,
                variableScope,
                typeIDScope: typeScope,
            });
        }
        return out;
    }
    function verifyPostconditionWellFormedness(program, signature, state, verifyAtReturns) {
        state.smt.pushScope();
        let symbolicReturned = [];
        for (const r of signature.return_types) {
            symbolicReturned.push(state.smt.createVariable(r));
        }
        for (const verifyAtReturn of verifyAtReturns) {
            const valueArgs = new Map();
            for (const [k, v] of verifyAtReturn.variableScope) {
                if (v.tag === "returned") {
                    valueArgs.set(k, symbolicReturned[v.returnedIndex]);
                }
                else {
                    valueArgs.set(k, v.symbolic);
                }
            }
            assumePostcondition(program, valueArgs, verifyAtReturn.typeIDScope, verifyAtReturn.postcondition, state);
        }
        state.smt.popScope();
    }
    /// interfaceSignaturesByImplFn: Explains which interface signatures each fn
    /// implements. Any preconditions from the indicated interfaces should be
    /// automatically assumed, and any postconditions should be automatically
    /// checked.
    function verifyFunction(program, fName, interfaceSignaturesByImplFn) {
        const interfaceSignatures = interfaceSignaturesByImplFn.get(fName);
        const state = new VerificationState(program, foreignInterpeters, interfaceSignaturesByImplFn);
        const f = program.functions[fName];
        // Create the initial type scope, which maps each type parameter to an
        // unknown symbolic type ID constant.
        const typeScope = new Map();
        const typeArguments = [];
        for (let i = 0; i < f.signature.type_parameters.length; i++) {
            const typeParameter = f.signature.type_parameters[i];
            const typeArgument = state.smt.createVariable(ir.T_ANY);
            typeArguments.push(typeArgument);
            typeScope.set(typeParameter, typeArgument);
        }
        state.pushTypeScope(typeScope);
        // Initialize the function's arguments.
        const symbolicArguments = [];
        for (let i = 0; i < f.signature.parameters.length; i++) {
            const parameter = f.signature.parameters[i];
            // Create a symbolic constant for the initial value of the parameter.
            const symbolic = state.smt.createVariable(parameter.type);
            state.defineVariable(parameter, symbolic);
            symbolicArguments.push(symbolic);
        }
        // Execute and validate the function's preconditions.
        assumeStaticPreconditions(program, f.signature, symbolicArguments, typeArguments, state);
        const verifyAtReturns = [];
        // Collect postconditions from an impl fn.
        for (const interfaceSignatureReference of interfaceSignatures) {
            if (f.signature.preconditions.length !== 0) {
                throw new Error("impl function `" + fName + "` must not impose explicit preconditions");
            }
            assumeConstraintPreconditions(program, symbolicArguments, typeArguments, interfaceSignatureReference, state);
            verifyAtReturns.push(...generateToVerifyFromConstraint(program, symbolicArguments, typeArguments, interfaceSignatureReference, state));
        }
        // Collect explicit postconditions from a fn.
        verifyAtReturns.push(...generateToVerifyFromStatic(f.signature, symbolicArguments, typeArguments));
        // Validate that the function's postconditions are well-formed, in that they
        // explicitly guarantee their internal preconditions.
        verifyPostconditionWellFormedness(program, f.signature, state, verifyAtReturns);
        // Check the function's body (including that each return op guarantees the
        // ensured postconditions).
        traverseBlock(program, new Map(), f.body, state, {
            verifyAtReturn: verifyAtReturns,
        });
        const lastOp = f.body.ops[f.body.ops.length - 1];
        if (!ir.opTerminates(lastOp)) {
            throw new Error("ICE: verifyFunction invoked on a function which does not obviously terminate");
        }
        return state.failedVerifications;
    }
    class DynamicFunctionMap {
        constructor(program, smt) {
            this.program = program;
            this.smt = smt;
            this.map = new data_4.DefaultMap(i => new data_4.DefaultMap(s => {
                const interfaceIR = this.program.interfaces[i];
                const signature = interfaceIR.signatures[s];
                const typeParameters = interfaceIR.type_parameters.concat(signature.type_parameters);
                const anys = [];
                for (let i = 0; i < typeParameters.length; i++) {
                    anys.push(ir.T_ANY);
                }
                const map = ir.typeArgumentsMap(typeParameters, anys);
                const rs = signature.return_types.map(r => ir.typeSubstitute(r, map));
                return rs.map(r => { var _a; return this.smt.createFunction(r, { eq: (_a = signature.semantics) === null || _a === void 0 ? void 0 : _a.eq }); });
            }));
        }
        /// Retrieves the single function identity across all implementations of the
        /// interface.
        /// Invocations of the function in the SMT engine take
        /// value arguments ++ interface type arguments ++ signature type arguments.
        get(interfaceID, signatureID) {
            return this.map.get(interfaceID).get(signatureID);
        }
    }
    class RecordMap {
        constructor(program, smt) {
            this.program = program;
            this.smt = smt;
            this.map = new data_4.DefaultMap(r => {
                const record = this.program.records[r];
                const fields = {};
                for (const k in record.fields) {
                    fields[k] = this.smt.createFunction(record.fields[k], {});
                }
                const recordType = {
                    tag: "type-compound",
                    base: r,
                    type_arguments: record.type_parameters.map(x => ({ tag: "type-any" })),
                };
                return {
                    constructor: this.smt.createFunction(recordType, {}),
                    fields,
                    typeID: this.smt.createFunction(ir.T_INT, {}),
                };
            });
        }
        construct(recordID, initialization) {
            const info = this.map.get(recordID);
            const f = info.constructor;
            const args = [];
            for (const field in info.fields) {
                args.push(initialization[field]);
            }
            return this.smt.createApplication(f, args);
        }
        extractField(recordID, field, obj) {
            const f = this.map.get(recordID).fields[field];
            return this.smt.createApplication(f, [obj]);
        }
        typeID(recordID, typeArgumentTypeIDs) {
            const info = this.map.get(recordID);
            return this.smt.createApplication(info.typeID, typeArgumentTypeIDs);
        }
    }
    ;
    class EnumMap {
        constructor(program, smt) {
            this.program = program;
            this.smt = smt;
            this.map = new data_4.DefaultMap(enumID => {
                const constructors = {};
                const destructors = {};
                const tagValues = {};
                const enumEntity = this.program.enums[enumID];
                const instantiation = new Map();
                const enumType = {
                    tag: "type-compound",
                    base: enumID,
                    type_arguments: [],
                };
                for (const parameter of enumEntity.type_parameters) {
                    instantiation.set(parameter, ir.T_ANY);
                    enumType.type_arguments.push(ir.T_ANY);
                }
                let tagIndex = 0;
                for (const variant in enumEntity.variants) {
                    const variantType = ir.typeSubstitute(enumEntity.variants[variant], instantiation);
                    constructors[variant] = this.smt.createFunction(enumType, {});
                    destructors[variant] = this.smt.createFunction(variantType, {});
                    tagValues[variant] = this.smt.createConstant(ir.T_INT, tagIndex);
                    tagIndex += 1;
                }
                return {
                    extractTag: this.smt.createFunction(ir.T_INT, {}),
                    constructors,
                    destructors,
                    tagValues,
                    typeID: this.smt.createFunction(ir.T_INT, {}),
                };
            });
        }
        hasTag(enumID, enumValue, variant, eq) {
            const info = this.map.get(enumID);
            const symbolicTag = this.smt.createApplication(info.extractTag, [enumValue]);
            const testTag = info.tagValues[variant];
            // Add a constraint that the tag takes on one of a small number of values.
            const finiteAlternativesClause = [];
            for (const variant in info.tagValues) {
                const tagConstant = info.tagValues[variant];
                finiteAlternativesClause.push(eq.eq(symbolicTag, tagConstant));
            }
            return {
                testResult: eq.eq(symbolicTag, testTag),
                finiteAlternativesClause,
            };
        }
        construct(enumID, variantValue, variant) {
            const info = this.map.get(enumID);
            return this.smt.createApplication(info.constructors[variant], [variantValue]);
        }
        destruct(enumID, enumValue, variant) {
            const info = this.map.get(enumID);
            return this.smt.createApplication(info.destructors[variant], [enumValue]);
        }
        typeID(enumID, typeArgumentTypeIDs) {
            const info = this.map.get(enumID);
            return this.smt.createApplication(info.typeID, typeArgumentTypeIDs);
        }
    }
    class VerificationState {
        constructor(program, foreignInterpeters, interfaceSignaturesByImplFn) {
            this.smt = new uf.UFTheory();
            this.notF = this.smt.createFunction(ir.T_BOOLEAN, { not: true });
            this.eqF = this.smt.createFunction(ir.T_BOOLEAN, { eq: true });
            this.containsF = this.smt.createFunction(ir.T_BOOLEAN, { transitive: true, transitiveAcyclic: true });
            /// Generates a SMT function for each return of each Shiru fn.
            /// The first parameters are the type arguments (type id).
            this.functions = new data_4.DefaultMap(fnID => {
                var _a;
                const fn = this.program.functions[fnID];
                if (fn === undefined) {
                    throw new Error("VerificationState.functions.get: undefined `" + fnID + "`");
                }
                const instantiation = new Map();
                for (let i = 0; i < fn.signature.type_parameters.length; i++) {
                    instantiation.set(fn.signature.type_parameters[i], ir.T_ANY);
                }
                const out = [];
                for (const r of fn.signature.return_types) {
                    // Use a more generic "Any" type.
                    const resultType = ir.typeSubstitute(r, instantiation);
                    out.push(this.smt.createFunction(resultType, { eq: (_a = fn.signature.semantics) === null || _a === void 0 ? void 0 : _a.eq }));
                }
                return out;
            });
            this.foreign = new data_4.DefaultMap(op => {
                var _a;
                const fn = this.program.foreign[op];
                if (fn === undefined) {
                    throw new Error("VerificationState.foreign.get: undefined `" + op + "`");
                }
                const out = [];
                for (const r of fn.return_types) {
                    out.push(this.smt.createFunction(r, {
                        eq: (_a = fn.semantics) === null || _a === void 0 ? void 0 : _a.eq,
                        interpreter: this.foreignInterpreters[op],
                    }));
                }
                return out;
            });
            this.recursivePreconditions = {
                blockedFunctions: {},
                blockedInterfaces: {},
            };
            this.recursivePostconditions = {
                blockedFunctions: {},
                blockedInterfaces: {},
            };
            /// `varScopes` is a stack of variable mappings. SSA variables aren't
            /// reassigned, but can be shadowed (including within the same block).
            this.varScopes = [
                {
                    token: Symbol("root-scope"),
                    variableHiding: true,
                    variables: new Map(),
                }
            ];
            /// `typeScopes` is a stack of type parameter --> TypeID values.
            this.typeScopes = [];
            this.unitTypeID = this.smt.createConstant(ir.T_INT, 21);
            this.booleanTypeID = this.smt.createConstant(ir.T_INT, 22);
            this.intTypeID = this.smt.createConstant(ir.T_INT, 23);
            this.bytesTypeID = this.smt.createConstant(ir.T_INT, 24);
            this.anyTypeID = this.smt.createConstant(ir.T_INT, 25);
            /// `pathConstraints` is the stack of conditional constraints that must be
            /// true to reach a position in the program.
            this.pathConstraints = [];
            // Verification adds failure messages to this stack as they are encountered.
            // Multiple failures can be returned.
            this.failedVerifications = [];
            this.program = program;
            this.foreignInterpreters = foreignInterpeters;
            this.dynamicFunctions = new DynamicFunctionMap(this.program, this.smt);
            this.recordMap = new RecordMap(this.program, this.smt);
            this.enumMap = new EnumMap(this.program, this.smt);
            this.interfaceSignaturesByImplFn = interfaceSignaturesByImplFn;
            // SMT requires at least one constraint.
            this.smt.addConstraint([
                this.smt.createConstant(ir.T_BOOLEAN, true),
            ]);
        }
        /// Pushing a hiding scope hides all previous associations, allowing errors
        /// to be noticed more easily.
        pushHidingTypeScope() {
            const token = Symbol("hiding-type-scope");
            this.typeScopes.push(token);
            return token;
        }
        pushTypeScope(scope) {
            this.typeScopes.push(scope);
        }
        popTypeScope() {
            const top = this.typeScopes.pop();
            if (top === undefined) {
                throw new Error("popTypeScope: no scope open");
            }
            else if (!(top instanceof Map)) {
                throw new Error("popTypeScope: hiding scope open; expected call to popHidingTypeScope().");
            }
        }
        popHidingTypeScope(expected) {
            const top = this.typeScopes.pop();
            if (top !== expected) {
                throw new Error("popHidingTypeScope: did not find expected hiding type scope");
            }
        }
        /// `getTypeID` generates a symbolic constant representing the given type.
        getTypeID(t) {
            if (t.tag === "type-any") {
                return this.anyTypeID;
            }
            else if (t.tag === "type-primitive") {
                if (t.primitive === "Unit") {
                    return this.unitTypeID;
                }
                else if (t.primitive === "Boolean") {
                    return this.booleanTypeID;
                }
                else if (t.primitive === "Int") {
                    return this.intTypeID;
                }
                else if (t.primitive === "Bytes") {
                    return this.bytesTypeID;
                }
                else {
                    const un = t.primitive;
                    throw new Error("getTypeID: unhandled primitive `" + un + "`");
                }
            }
            else if (t.tag === "type-variable") {
                for (let i = this.typeScopes.length - 1; i >= 0; i--) {
                    const scope = this.typeScopes[i];
                    if (typeof scope === "symbol") {
                        throw new Error("getTypeID: unmapped type-variable within hiding scope: `" + t.id + "`");
                    }
                    const mapping = scope.get(t.id);
                    if (mapping !== undefined) {
                        return mapping;
                    }
                }
                throw new Error("getTypeID: unmapped type-variable `" + t.id + "`");
            }
            else if (t.tag === "type-compound") {
                const args = t.type_arguments.map(x => this.getTypeID(x));
                const base = t.base;
                if (this.program.records[base] !== undefined) {
                    return this.recordMap.typeID(base, args);
                }
                else {
                    return this.enumMap.typeID(base, args);
                }
            }
            else {
                const un = t;
                throw new Error("getTypeID: unhandled type tag `" + un["tag"] + "`");
            }
        }
        negate(bool) {
            return this.smt.createApplication(this.notF, [bool]);
        }
        eq(left, right) {
            return this.smt.createApplication(this.eqF, [left, right]);
        }
        isSmallerThan(left, right) {
            return this.smt.createApplication(this.containsF, [left, right]);
        }
        pushVariableScope(variableHiding) {
            const token = Symbol("variable-scope");
            this.varScopes.push({
                token,
                variableHiding,
                variables: new Map(),
            });
            return token;
        }
        popVariableScope(expected) {
            const top = this.varScopes.pop();
            if (!top || top.token !== expected) {
                throw new Error("popVariableScope: did not find expected scope");
            }
        }
        /// Modifies this state so that it assumes the given condition is always
        /// true when at this path in the program.
        assumeGuaranteedInPath(condition) {
            this.pushPathConstraint(this.negate(this.getValue(condition).value));
            this.markPathUnreachable();
            this.popPathConstraint();
        }
        pushPathConstraint(c) {
            this.pathConstraints.push(c);
        }
        popPathConstraint() {
            this.pathConstraints.pop();
        }
        /// Determines whether or not the given condition is possibly false given
        /// the current path constraints.
        /// Returns `"refuted"` when it is not possible for the condition to be
        /// false.
        checkPossiblyFalseInPath(condition, reason) {
            this.pushPathConstraint(this.negate(this.getValue(condition).value));
            const reply = this.checkReachable(reason);
            this.popPathConstraint();
            return reply;
        }
        /// `checkReachable` checks whether or not the conjunction of current path
        /// constraints, combined with all other constraints added to the `smt`
        /// solver, is reachable or not.
        checkReachable(reason) {
            this.smt.pushScope();
            for (const constraint of this.pathConstraints) {
                this.smt.addConstraint([constraint]);
            }
            const model = this.smt.attemptRefutation();
            this.smt.popScope();
            return model;
        }
        /// `markPathUnreachable` ensures that the conjunction of the current path
        /// constraints is considered not satisfiable in subsequent invocations of
        /// the `smt` solver.
        markPathUnreachable() {
            const pathUnreachable = this.pathConstraints.map(e => this.negate(e));
            this.smt.addConstraint(pathUnreachable);
        }
        /// `defineVariable` associates the given symbolic value with the given
        /// name for the remainder of the current innermost scope.
        defineVariable(variable, value) {
            const scope = this.varScopes[this.varScopes.length - 1];
            scope.variables.set(variable.variable, {
                type: variable.type,
                value: value,
            });
        }
        /// `getValue` retrieves the value associated with the given name from the
        /// innermost scope that defines it.
        getValue(variable) {
            for (let i = this.varScopes.length - 1; i >= 0; i--) {
                const scope = this.varScopes[i];
                const value = scope.variables.get(variable);
                if (value !== undefined) {
                    return value;
                }
                else if (scope.variableHiding) {
                    throw new Error("getValue: variable `" + variable + "` is not defined within the containing hiding scope");
                }
            }
            throw new Error("getValue: variable `" + variable + "` is not defined");
        }
    }
    function traverseBlock(program, locals, block, state, context, then) {
        // Blocks bound variable scopes, so variables must be cleared after.
        const variableScope = state.pushVariableScope(false);
        for (const [k, v] of locals) {
            state.defineVariable(k, v);
        }
        for (let subop of block.ops) {
            traverse(program, subop, state, context);
        }
        // Execute the final computation before exiting this scope.
        if (then !== undefined) {
            then();
        }
        // Clear variables defined within this block.
        state.popVariableScope(variableScope);
    }
    // MUTATES the verification state parameter, to add additional clauses that are
    // ensured after the execution (and termination) of this operation.
    function traverse(program, op, state, context) {
        var _a;
        if (op.tag === "op-branch") {
            const symbolicCondition = state.getValue(op.condition).value;
            const phis = [];
            for (const destination of op.destinations) {
                phis.push(state.smt.createVariable(destination.destination.type));
            }
            state.pushPathConstraint(symbolicCondition);
            traverseBlock(program, new Map(), op.trueBranch, state, context, () => {
                for (let i = 0; i < op.destinations.length; i++) {
                    const destination = op.destinations[i];
                    const source = destination.trueSource;
                    if (source === "undef")
                        continue;
                    state.smt.addUnscopedConstraint([
                        state.negate(symbolicCondition),
                        state.eq(phis[i], state.getValue(source.variable).value),
                    ]);
                }
            });
            state.popPathConstraint();
            state.pushPathConstraint(state.negate(symbolicCondition));
            traverseBlock(program, new Map(), op.falseBranch, state, context, () => {
                for (let i = 0; i < op.destinations.length; i++) {
                    const destination = op.destinations[i];
                    const source = destination.falseSource;
                    if (source === "undef")
                        continue;
                    state.smt.addUnscopedConstraint([
                        symbolicCondition,
                        state.eq(phis[i], state.getValue(source.variable).value),
                    ]);
                }
            });
            state.popPathConstraint();
            for (let i = 0; i < op.destinations.length; i++) {
                state.defineVariable(op.destinations[i].destination, phis[i]);
            }
            return;
        }
        else if (op.tag === "op-const") {
            // Like assignment, this requires no manipulation of constraints, only
            // the state of variables.
            let constant;
            if (op.type === "Int") {
                constant = state.smt.createConstant(op.destination.type, BigInt(op.int));
            }
            else if (op.type === "Boolean") {
                constant = state.smt.createConstant(op.destination.type, op.boolean);
            }
            else if (op.type === "Bytes") {
                constant = state.smt.createConstant(op.destination.type, op.bytes);
            }
            else {
                const _ = op;
                throw new Error("traverse: unexpected op-const type `" + op["type"] + "`");
            }
            state.defineVariable(op.destination, constant);
            return;
        }
        else if (op.tag === "op-copy") {
            for (const copy of op.copies) {
                state.defineVariable(copy.destination, state.getValue(copy.source).value);
            }
            return;
        }
        else if (op.tag === "op-field") {
            const object = state.getValue(op.object);
            const baseType = object.type;
            const fieldValue = state.recordMap.extractField(baseType.base, op.field, object.value);
            state.smt.addUnscopedConstraint([state.isSmallerThan(fieldValue, object.value)]);
            state.defineVariable(op.destination, fieldValue);
            return;
        }
        else if (op.tag === "op-is-variant") {
            const object = state.getValue(op.base);
            const baseType = object.type;
            const tagInfo = state.enumMap.hasTag(baseType.base, object.value, op.variant, state);
            state.smt.addUnscopedConstraint(tagInfo.finiteAlternativesClause);
            state.defineVariable(op.destination, tagInfo.testResult);
            return;
        }
        else if (op.tag === "op-variant") {
            const object = state.getValue(op.object);
            const baseType = object.type;
            const tagInfo = state.enumMap.hasTag(baseType.base, object.value, op.variant, state);
            state.smt.addUnscopedConstraint(tagInfo.finiteAlternativesClause);
            // Check that the symbolic tag definitely matches this variant.
            state.pushPathConstraint(state.negate(tagInfo.testResult));
            const reason = {
                tag: "failed-variant",
                enumType: baseType.base + "[???]",
                variant: op.variant,
                accessLocation: op.diagnostic_location,
            };
            const refutation = state.checkReachable(reason);
            if (refutation !== "refuted") {
                reason.enumType = (0, semantics_1.displayType)(baseType);
                state.failedVerifications.push(reason);
            }
            state.markPathUnreachable();
            state.popPathConstraint();
            // Extract the field.
            const variantValue = state.enumMap.destruct(baseType.base, object.value, op.variant);
            state.smt.addUnscopedConstraint([state.isSmallerThan(variantValue, object.value)]);
            state.defineVariable(op.destination, variantValue);
            return;
        }
        else if (op.tag === "op-new-record") {
            const fields = {};
            for (const field in op.fields) {
                fields[field] = state.getValue(op.fields[field]).value;
            }
            const recordType = op.destination.type;
            const recordValue = state.recordMap.construct(recordType.base, fields);
            state.defineVariable(op.destination, recordValue);
            return;
        }
        else if (op.tag === "op-new-enum") {
            const enumType = op.destination.type;
            const variantValue = state.getValue(op.variantValue).value;
            const enumValue = state.enumMap.construct(enumType.base, variantValue, op.variant);
            state.defineVariable(op.destination, enumValue);
            const tagInfo = state.enumMap.hasTag(enumType.base, enumValue, op.variant, state);
            state.smt.addUnscopedConstraint([tagInfo.testResult]);
            const destruction = state.enumMap.destruct(enumType.base, enumValue, op.variant);
            state.smt.addUnscopedConstraint([state.eq(destruction, variantValue)]);
            return;
        }
        else if (op.tag === "op-proof") {
            return traverseBlock(program, new Map(), op.body, state, context);
        }
        else if (op.tag === "op-return") {
            if (context.verifyAtReturn.length !== 0) {
                // Check that the postconditions from the context are satisfied by
                // this return.
                const returnedValues = [];
                for (let i = 0; i < op.sources.length; i++) {
                    returnedValues.push(state.getValue(op.sources[i]).value);
                }
                checkVerifyAtReturns(program, state, returnedValues, context.verifyAtReturn, op.diagnostic_return_site);
            }
            // Subsequently, this path is treated as unreachable, since the function
            // exited.
            state.markPathUnreachable();
            return;
        }
        else if (op.tag === "op-foreign") {
            const signature = program.foreign[op.operation];
            for (let precondition of signature.preconditions) {
                throw new Error("TODO: Check precondition of op-foreign");
            }
            for (let postcondition of signature.postconditions) {
                throw new Error("TODO: Assume postcondition of op-foreign");
            }
            const args = [];
            for (let i = 0; i < op.arguments.length; i++) {
                args.push(state.getValue(op.arguments[i]).value);
            }
            if (((_a = signature.semantics) === null || _a === void 0 ? void 0 : _a.eq) === true) {
                if (op.arguments.length !== 2) {
                    throw new Error("Foreign signature with `eq` semantics"
                        + " must take exactly 2 arguments (" + op.operation + ")");
                }
                else if (op.destinations.length !== 1) {
                    throw new Error("Foreign signature with `eq` semantics"
                        + " must return exactly 1 value");
                }
                const destination = op.destinations[0];
                state.defineVariable(destination, state.eq(args[0], args[1]));
            }
            else {
                const fIDs = state.foreign.get(op.operation);
                for (let i = 0; i < op.destinations.length; i++) {
                    state.defineVariable(op.destinations[i], state.smt.createApplication(fIDs[i], args));
                }
            }
            return;
        }
        else if (op.tag === "op-static-call") {
            traverseStaticCall(program, op, state);
            return;
        }
        else if (op.tag === "op-dynamic-call") {
            traverseDynamicCall(program, op, state);
            return;
        }
        else if (op.tag === "op-unreachable") {
            // TODO: Better classify verification failures.
            const reason = op.diagnostic_kind === "return"
                ? {
                    tag: "failed-return",
                    blockEndLocation: op.diagnostic_location,
                }
                : {
                    tag: "failed-assert",
                    assertLocation: op.diagnostic_location,
                };
            if (state.checkReachable(reason) !== "refuted") {
                state.failedVerifications.push(reason);
            }
            // Like a return statement, this path is subsequently treated as
            // unreachable.
            state.markPathUnreachable();
            return;
        }
        else if (op.tag === "op-proof-eq") {
            const leftObject = state.getValue(op.left);
            const rightObject = state.getValue(op.right);
            state.defineVariable(op.destination, state.eq(leftObject.value, rightObject.value));
            return;
        }
        const _ = op;
        throw new Error(`unhandled op ${op["tag"]}`);
    }
    /// checkPrecondition inspects the state and ensures that the precondition
    /// invoked with the given scope is satisfied.
    function checkPrecondition(program, valueArgs, typeArgs, precondition, state, reason) {
        // When contracts of `fn` refer to a type parameter like `#T`, its symbolic
        // type ID will be retrieved from only the `typeArgs` map:
        const hidingTypeScope = state.pushHidingTypeScope();
        state.pushTypeScope(typeArgs);
        traverseBlock(program, valueArgs, precondition.block, state, {
            // Return ops within a precondition do not have their own
            // postconditions.
            verifyAtReturn: [],
        }, () => {
            if (state.checkPossiblyFalseInPath(precondition.precondition, reason) !== "refuted") {
                state.failedVerifications.push(reason);
            }
        });
        state.popTypeScope();
        state.popHidingTypeScope(hidingTypeScope);
    }
    /// assumePostcondition modifies the state so that subsequent inspections can
    /// assume that this postcondition, invoked with the given scope, is satisfied.
    function assumePostcondition(program, valueArgs, typeArgs, postcondition, state) {
        // When contracts of `fn` refer to a type parameter like `#T`, its symbolic
        // type ID will be retrieved from only the `subscope` map:
        const hidingTypeScope = state.pushHidingTypeScope();
        state.pushTypeScope(typeArgs);
        const postconditionScope = state.pushVariableScope(true);
        traverseBlock(program, valueArgs, postcondition.block, state, {
            // Return ops within a postcondition do not have their own postconditions.
            verifyAtReturn: [],
        }, () => {
            state.assumeGuaranteedInPath(postcondition.postcondition);
        });
        state.popVariableScope(postconditionScope);
        state.popTypeScope();
        state.popHidingTypeScope(hidingTypeScope);
    }
    /// checkVerifyAtReturns inspects the current state to determine whether or not
    /// each postcondition is satisfied by the given returned values.
    function checkVerifyAtReturns(program, state, returnedValues, verifyAtReturns, diagnosticReturnLocation) {
        for (const verifyAtReturn of verifyAtReturns) {
            // Bind the necessary inputs (parameters, returned values) for
            // the postcondition.
            const locals = new Map();
            for (const [key, spec] of verifyAtReturn.variableScope) {
                if (spec.tag === "returned") {
                    locals.set(key, returnedValues[spec.returnedIndex]);
                }
                else {
                    const symbolicSource = spec.symbolic;
                    locals.set(key, symbolicSource);
                }
            }
            const postconditionTypeScope = state.pushHidingTypeScope();
            state.pushTypeScope(verifyAtReturn.typeIDScope);
            const postconditionVariableScope = state.pushVariableScope(true);
            traverseBlock(program, locals, verifyAtReturn.postcondition.block, state, {
                // Return ops within a postcondition do not have their own
                // postconditions.
                verifyAtReturn: [],
            }, () => {
                const reason = {
                    tag: "failed-postcondition",
                    returnLocation: diagnosticReturnLocation,
                    postconditionLocation: verifyAtReturn.postcondition.location,
                };
                // Check if it's possible for the indicated boolean to be
                // false.
                const refutation = state.checkPossiblyFalseInPath(verifyAtReturn.postcondition.postcondition, reason);
                if (refutation !== "refuted") {
                    state.failedVerifications.push(reason);
                }
            });
            state.popVariableScope(postconditionVariableScope);
            state.popTypeScope();
            state.popHidingTypeScope(postconditionTypeScope);
        }
    }
    function traverseStaticCall(program, op, state) {
        const fn = op.function;
        const signature = program.functions[fn].signature;
        if (state.interfaceSignaturesByImplFn.get(fn).length !== 0) {
            throw new Error("impl functions cannot be invoked directly by static calls");
        }
        const valueArgs = [];
        for (let i = 0; i < op.arguments.length; i++) {
            valueArgs.push(state.getValue(op.arguments[i]).value);
        }
        const typeArgs = [];
        const typeArgsMap = new Map();
        for (let i = 0; i < op.type_arguments.length; i++) {
            const typeParameter = signature.type_parameters[i];
            const typeArgument = op.type_arguments[i];
            typeArgsMap.set(typeParameter, state.getTypeID(typeArgument));
            typeArgs.push(state.getTypeID(typeArgument));
        }
        if (state.recursivePreconditions.blockedFunctions[fn] !== undefined) {
            throw new diagnostics.RecursivePreconditionErr({
                callsite: op.diagnostic_callsite,
                fn: fn,
            });
        }
        else {
            state.recursivePreconditions.blockedFunctions[fn] = true;
            const valueArgsMap = new Map();
            for (let i = 0; i < valueArgs.length; i++) {
                valueArgsMap.set(signature.parameters[i], valueArgs[i]);
            }
            for (const precondition of signature.preconditions) {
                const reason = {
                    tag: "failed-precondition",
                    callLocation: op.diagnostic_callsite,
                    preconditionLocation: precondition.location,
                };
                checkPrecondition(program, valueArgsMap, typeArgsMap, precondition, state, reason);
            }
            delete state.recursivePreconditions.blockedFunctions[fn];
        }
        const smtFns = state.functions.get(fn);
        const results = [];
        for (let i = 0; i < op.destinations.length; i++) {
            const result = state.smt.createApplication(smtFns[i], [...valueArgs, ...typeArgs]);
            results.push(result);
            state.defineVariable(op.destinations[i], result);
        }
        if (state.recursivePostconditions.blockedFunctions[fn] !== true) {
            state.recursivePostconditions.blockedFunctions[fn] = true;
            for (const postcondition of signature.postconditions) {
                const valueArgsMap = new Map();
                for (let i = 0; i < op.arguments.length; i++) {
                    const variable = signature.parameters[i];
                    valueArgsMap.set(variable, valueArgs[i]);
                }
                for (let i = 0; i < op.destinations.length; i++) {
                    const variable = postcondition.returnedValues[i];
                    valueArgsMap.set(variable, results[i]);
                }
                assumePostcondition(program, valueArgsMap, typeArgsMap, postcondition, state);
            }
            delete state.recursivePostconditions.blockedFunctions[fn];
        }
    }
    function traverseDynamicCall(program, op, state) {
        var _a;
        const constraint = program.interfaces[op.constraint.interface];
        const signature = constraint.signatures[op.signature_id];
        const typeArgsMap = new Map();
        const typeArgsList = [];
        for (let i = 0; i < op.constraint.subjects.length; i++) {
            const t = op.constraint.subjects[i];
            const id = state.getTypeID(t);
            typeArgsMap.set(constraint.type_parameters[i], id);
            typeArgsList.push(id);
        }
        for (let i = 0; i < op.signature_type_arguments.length; i++) {
            const t = op.signature_type_arguments[i];
            const id = state.getTypeID(t);
            typeArgsMap.set(signature.type_parameters[i], id);
            typeArgsList.push(id);
        }
        const valueArgs = op.arguments.map(v => state.getValue(v).value);
        for (const precondition of signature.preconditions) {
            throw new Error("TODO");
        }
        const smtFns = state.dynamicFunctions.get(op.constraint.interface, op.signature_id);
        const results = [];
        for (let i = 0; i < op.destinations.length; i++) {
            const result = state.smt.createApplication(smtFns[i], [...valueArgs, ...typeArgsList]);
            results.push(result);
            state.defineVariable(op.destinations[i], result);
        }
        for (const postcondition of signature.postconditions) {
            throw new Error("TODO");
        }
        if (((_a = signature.semantics) === null || _a === void 0 ? void 0 : _a.eq) === true) {
            throw new Error("TODO");
        }
    }
});
define("shiru/library", ["require", "exports", "shiru/diagnostics", "shiru/grammar", "shiru/interpreter", "shiru/lexer", "shiru/semantics", "shiru/verify"], function (require, exports, diagnostics, grammar, interpreter, lexer, semantics, verify) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.displayError = exports.TextDocument = exports.formatVerificationFailure = exports.interpret = exports.verifyProgram = exports.compileASTs = exports.parseSource = void 0;
    function parseSource(sourceFile) {
        try {
            return grammar.parseSource(sourceFile.content, sourceFile.path);
        }
        catch (e) {
            if (e instanceof lexer.LexError || e instanceof grammar.ParseError) {
                return e;
            }
            throw e;
        }
    }
    exports.parseSource = parseSource;
    function compileASTs(asts) {
        try {
            return semantics.compileSources(asts);
        }
        catch (e) {
            if (e instanceof diagnostics.SemanticError) {
                return e;
            }
            throw e;
        }
    }
    exports.compileASTs = compileASTs;
    function verifyProgram(program) {
        try {
            return verify.verifyProgram(program);
        }
        catch (e) {
            if (e instanceof diagnostics.SemanticError) {
                return e;
            }
            throw e;
        }
    }
    exports.verifyProgram = verifyProgram;
    function interpret(program, fn, args) {
        return interpreter.interpret(fn, args, program, {
            "Int+": ([a, b]) => {
                if (a.sort !== "int")
                    throw new Error("bad argument");
                if (b.sort !== "int")
                    throw new Error("bad argument");
                return [{ sort: "int", int: a.int + b.int }];
            },
            "Int-": ([a, b]) => {
                if (a.sort !== "int")
                    throw new Error("bad argument");
                if (b.sort !== "int")
                    throw new Error("bad argument");
                return [{ sort: "int", int: a.int - b.int }];
            },
            "Int==": ([a, b]) => {
                if (a.sort !== "int")
                    throw new Error("bad argument");
                if (b.sort !== "int")
                    throw new Error("bad argument");
                return [{ sort: "boolean", boolean: a.int == b.int }];
            },
        });
    }
    exports.interpret = interpret;
    function formatVerificationFailure(v) {
        if (v.tag === "failed-assert") {
            return {
                message: [
                    "An assert has not been shown to hold at",
                    v.assertLocation ? v.assertLocation : " (unknown location)",
                ],
            };
        }
        else if (v.tag === "failed-precondition") {
            return {
                message: [
                    "A precondition has not been shown to hold at",
                    v.callLocation,
                    "The precondition was defined at",
                    v.preconditionLocation,
                ],
            };
        }
        else if (v.tag === "failed-return") {
            return {
                message: [
                    "A function has not been shown to always return a value at",
                    v.blockEndLocation ? v.blockEndLocation : " (unknown location)",
                ],
            };
        }
        else if (v.tag === "failed-postcondition") {
            return {
                message: [
                    "A postcondition has not been shown to hold at",
                    v.returnLocation,
                    "The postcondition was defined at",
                    v.postconditionLocation,
                ]
            };
        }
        else if (v.tag === "failed-variant") {
            return {
                message: [
                    "An object of enum type `" + v.enumType + "` ",
                    "has not been shown to have variant tag `" + v.variant + "`, ",
                    "so the variant access of `." + v.variant + "` is illegal at",
                    v.accessLocation,
                ],
            };
        }
        else {
            const _ = v;
            throw new Error("unhandled `" + v["tag"] + "`");
        }
    }
    exports.formatVerificationFailure = formatVerificationFailure;
    class TextDocument {
        constructor(path, content) {
            this.path = path;
            this.content = content;
            this.lines = [];
            let offset = 0;
            for (let line of content.split("\n")) {
                this.lines.push({
                    content: line + " ",
                    offset,
                });
                offset += line.length + 1;
            }
        }
        locate(query) {
            if (query <= 0) {
                return { offset: 0, line0: 0, char0: 0 };
            }
            for (let i = 0; i < this.lines.length; i++) {
                let next = this.lines[i].offset + this.lines[i].content.length;
                if (query <= next) {
                    return { offset: query, line0: i, char0: query - this.lines[i].offset };
                }
            }
            const lastLine = this.lines[this.lines.length - 1];
            return {
                offset: lastLine.offset + lastLine.content.length,
                line0: this.lines.length - 1,
                char0: lastLine.content.length,
            };
        }
        /// `getLocus` returns a brief "one word" description of the given location.
        getLocus(location) {
            const start = this.locate(location.offset);
            const end = this.locate(location.offset + location.length);
            if (start.line0 === end.line0) {
                return `${this.path}:${start.line0 + 1}:${start.char0 + 1}-${end.char0 + 1}`;
            }
            else {
                return `${this.path}:${start.line0 + 1}:${start.char0 + 1}-${end.line0 + 1}:${end.line0 + 1}`;
            }
        }
        getSnippetLine(line0, highlightStart, highlightEnd, options) {
            let offset = this.lines[line0].offset;
            const source = this.lines[line0].content;
            const beforeHighlighted = source.substring(0, highlightStart.offset - offset);
            const highlighted = source.substring(highlightStart.offset - offset, highlightEnd.offset - offset);
            const afterHighlighted = source.substring(highlightEnd.offset - offset);
            const groups = [beforeHighlighted, highlighted, afterHighlighted];
            let carets = "";
            let formatted = "";
            let column = 0;
            for (let i = 0; i < 3; i++) {
                const group = groups[i];
                const caret = (i === 1) ? "^" : " ";
                const TAB_OR_NONTABS = /(?:\t|[^\t]+)/g;
                let match;
                while ((match = TAB_OR_NONTABS.exec(group)) !== null) {
                    let word = match[0];
                    if (word === "\t") {
                        const w = options.tabSize - column % options.tabSize;
                        word = " ".repeat(w);
                    }
                    formatted += word;
                    column += word.length;
                    carets += caret.repeat(word.length);
                    column += word.length;
                }
            }
            return {
                formatted: formatted,
                carets: carets,
            };
        }
        getSnippet(highlighting, options) {
            const start = this.locate(highlighting.offset);
            const end = this.locate(highlighting.offset + highlighting.length);
            const rows = [];
            for (let y of new Set([start.line0 - 1, start.line0, start.line0 + 1, end.line0 - 1, end.line0, end.line0 + 1])) {
                if (y < 0 || y >= this.lines.length) {
                    continue;
                }
                if (rows.length !== 0) {
                    const previous = rows[rows.length - 1];
                    if (previous.tag === "content" && previous.line0 < y - 1) {
                        rows.push({ tag: "ellipses" });
                    }
                }
                const row = this.getSnippetLine(y, start, end, options);
                rows.push({
                    tag: "content",
                    line0: y,
                    formatted: row.formatted,
                    carets: row.carets.trim() !== "" ? row.carets : null,
                });
            }
            return rows;
        }
    }
    exports.TextDocument = TextDocument;
    function displayError(e, sourceList) {
        const sources = {};
        let s = "ERROR: ";
        for (let m of e.message) {
            if (typeof m === "string") {
                s += m;
            }
            else {
                const fileID = m.fileID;
                if (!sources[fileID]) {
                    const source = sourceList.find(x => x.path === fileID);
                    if (!source) {
                        s += fileID + ":?" + "\n";
                        continue;
                    }
                    sources[fileID] = new TextDocument(fileID, source.content);
                }
                const source = sources[fileID];
                s += " " + source.getLocus(m);
                s += ":\n";
                const mWide = {
                    fileID: m.fileID,
                    offset: m.offset,
                    length: Math.max(1, m.length),
                };
                const rows = source.getSnippet(mWide, { tabSize: 4 });
                const NUMBER_TRAY = 8;
                for (let row of rows) {
                    if (row.tag === "content") {
                        const n = (row.line0 + 1).toFixed(0);
                        s += "\t" + " ".repeat(NUMBER_TRAY - n.length) + n + " | ";
                        s += row.formatted;
                        if (row.carets !== null) {
                            s += "\n";
                            s += "\t" + " ".repeat(NUMBER_TRAY) + " | ";
                            s += row.carets;
                        }
                    }
                    else {
                        s += "\t" + " ".repeat(NUMBER_TRAY - 3) + "... |";
                    }
                    s += "\n";
                }
                s += "\n";
            }
        }
        return s;
    }
    exports.displayError = displayError;
});
//# sourceMappingURL=shiru-amd.js.map