declare module "shiru/ir" {
    export interface SourceLocation {
        fileID: string;
        offset: number;
        length: number;
    }
    export const NONE: SourceLocation;
    export function locationSpan(from: SourceLocation, to: SourceLocation): {
        fileID: string;
        offset: number;
        length: number;
    };
    export function locationsSpan(set: {
        location: SourceLocation;
    }[]): SourceLocation;
    export interface TypePrimitive {
        tag: "type-primitive";
        primitive: "Bytes" | "Unit" | "Boolean" | "Int";
    }
    export const T_INT: TypePrimitive;
    export const T_BOOLEAN: TypePrimitive;
    export const T_BYTES: TypePrimitive;
    export const T_UNIT: TypePrimitive;
    export const T_ANY: TypeAny;
    export interface TypeCompound {
        tag: "type-compound";
        base: RecordID | EnumID;
        type_arguments: Type[];
    }
    export interface TypeVariable {
        tag: "type-variable";
        id: TypeVariableID;
    }
    export interface TypeAny {
        tag: "type-any";
    }
    export type Type = TypePrimitive | TypeCompound | TypeVariable | TypeAny;
    export type FunctionID = string & {
        __brand: "function-id";
    };
    export type VariableID = string & {
        __brand: "variable-id";
    };
    export type RecordID = string & {
        __brand: "record-id";
    };
    export type EnumID = string & {
        __brand: "enum-id";
    };
    export type InterfaceID = string & {
        __brand: "interface-id";
    };
    export type TypeVariableID = string & {
        __brand: "type-variable-id";
    };
    export interface VariableDefinition {
        variable: VariableID;
        type: Type;
        location: SourceLocation;
    }
    export type OpConst = {
        tag: "op-const";
        destination: VariableDefinition;
    } & (OpConstInt | OpConstBytes | OpConstBoolean);
    export interface OpConstInt {
        type: "Int";
        int: string;
    }
    export interface OpConstBytes {
        type: "Bytes";
        bytes: string;
    }
    export interface OpConstBoolean {
        type: "Boolean";
        boolean: boolean;
    }
    export interface Copy {
        source: VariableID;
        destination: VariableDefinition;
    }
    export interface OpCopy {
        tag: "op-copy";
        copies: Copy[];
    }
    export interface OpProofEq {
        tag: "op-proof-eq";
        left: VariableID;
        right: VariableID;
        destination: VariableDefinition;
    }
    export interface OpBranch {
        tag: "op-branch";
        condition: VariableID;
        trueBranch: OpBlock;
        falseBranch: OpBlock;
        destinations: BranchPhi[];
    }
    export interface BranchPhi {
        destination: VariableDefinition;
        trueSource: {
            tag: "variable";
            variable: VariableID;
        } | "undef";
        falseSource: {
            tag: "variable";
            variable: VariableID;
        } | "undef";
    }
    export interface OpNewRecord {
        tag: "op-new-record";
        record: RecordID;
        fields: {
            [fieldName: string]: VariableID;
        };
        destination: VariableDefinition;
    }
    export interface OpNewEnum {
        tag: "op-new-enum";
        enum: EnumID;
        variant: string;
        variantValue: VariableID;
        destination: VariableDefinition;
    }
    export interface OpIsVariant {
        tag: "op-is-variant";
        base: VariableID;
        variant: string;
        destination: VariableDefinition;
    }
    export interface OpField {
        tag: "op-field";
        object: VariableID;
        field: string;
        destination: VariableDefinition;
    }
    export interface OpVariant {
        tag: "op-variant";
        object: VariableID;
        variant: string;
        destination: VariableDefinition;
        diagnostic_location: SourceLocation;
    }
    export interface OpStaticCall {
        tag: "op-static-call";
        function: FunctionID;
        arguments: VariableID[];
        type_arguments: Type[];
        destinations: VariableDefinition[];
        diagnostic_callsite: SourceLocation;
    }
    export interface OpDynamicCall {
        tag: "op-dynamic-call";
        constraint: ConstraintParameter;
        signature_id: string;
        signature_type_arguments: Type[];
        arguments: VariableID[];
        destinations: VariableDefinition[];
        diagnostic_callsite: SourceLocation;
    }
    export interface OpReturn {
        tag: "op-return";
        sources: VariableID[];
        diagnostic_return_site: SourceLocation;
    }
    export interface OpBlock {
        ops: Op[];
    }
    export interface OpProof {
        tag: "op-proof";
        body: OpBlock;
    }
    export interface OpUnreachable {
        tag: "op-unreachable";
        diagnostic_kind: "contract" | "return" | "match" | "unreachable";
        diagnostic_location: SourceLocation;
    }
    export interface OpForeign {
        tag: "op-foreign";
        operation: string;
        arguments: VariableID[];
        destinations: VariableDefinition[];
    }
    export type LeafOp = OpConst | OpCopy | OpProofEq | OpNewRecord | OpNewEnum | OpField | OpVariant | OpIsVariant | OpStaticCall | OpDynamicCall | OpForeign | OpReturn | OpUnreachable;
    export type Op = OpBranch | OpProof | LeafOp;
    export interface IRInterface {
        type_parameters: TypeVariableID[];
        signatures: Record<string, FunctionSignature>;
    }
    export interface ConstraintParameter {
        interface: InterfaceID;
        subjects: Type[];
    }
    export interface Precondition {
        block: OpBlock;
        precondition: VariableID;
        location: SourceLocation;
    }
    export interface Postcondition {
        block: OpBlock;
        returnedValues: VariableDefinition[];
        postcondition: VariableID;
        location: SourceLocation;
    }
    export interface FunctionSignature {
        type_parameters: TypeVariableID[];
        constraint_parameters: ConstraintParameter[];
        parameters: VariableDefinition[];
        return_types: Type[];
        preconditions: Precondition[];
        postconditions: Postcondition[];
        semantics?: {
            eq?: true;
        };
    }
    export interface IRFunction {
        signature: FunctionSignature;
        body: OpBlock;
    }
    export interface RecordDefinition {
        type_parameters: TypeVariableID[];
        fields: {
            [field: string]: Type;
        };
    }
    export interface EnumDefinition {
        type_parameters: TypeVariableID[];
        variants: {
            [variant: string]: Type;
        };
    }
    export interface VTableFactory {
        for_any: TypeVariableID[];
        provides: ConstraintParameter;
        entries: Record<string, VTableFactoryEntry>;
    }
    export interface VTableFactoryEntry {
        implementation: FunctionID;
        constraint_parameters: (number | ConstraintParameter)[];
    }
    export interface Program {
        functions: Record<string, IRFunction>;
        interfaces: Record<string, IRInterface>;
        records: Record<string, RecordDefinition>;
        enums: Record<string, EnumDefinition>;
        foreign: Record<string, FunctionSignature>;
        globalVTableFactories: Record<string, VTableFactory>;
    }
    export function opTerminates(op: Op): boolean;
    export function equalTypes(pattern: Type, passed: Type): boolean;
    export interface UnificationResult {
        leftRenaming: Map<TypeVariableID, TypeVariable>;
        rightRenaming: Map<TypeVariableID, TypeVariable>;
        instantiations: Map<TypeVariableID, Type | null>;
    }
    export function unifyTypes(leftVars: TypeVariableID[], lefts: Type[], rightVars: TypeVariableID[], rights: Type[]): UnificationResult | null;
    export function typeArgumentsMap(parameters: TypeVariableID[], args: Type[]): Map<TypeVariableID, Type>;
    export function typeSubstitute(t: Type, map: Map<TypeVariableID, Type>): Type;
    export function typeRecursiveSubstitute(t: Type, map: Map<TypeVariableID, Type | null>): Type;
    export function constraintSubstitute(c: ConstraintParameter, map: Map<TypeVariableID, Type>): ConstraintParameter;
}
declare module "shiru/lexer" {
    import { SourceLocation } from "shiru/ir";
    export type ErrorElement = string | SourceLocation;
    export interface IdenToken {
        tag: "iden";
        name: string;
        location: SourceLocation;
    }
    export interface TypeIdenToken {
        tag: "type-iden";
        name: string;
        location: SourceLocation;
    }
    export interface TypeKeywordToken {
        tag: "type-keyword";
        keyword: keyof typeof TYPE_KEYWORDS;
        location: SourceLocation;
    }
    export interface KeywordToken {
        tag: "keyword";
        keyword: keyof typeof KEYWORDS;
        location: SourceLocation;
    }
    export interface TypeVarToken {
        tag: "type-var";
        name: string;
        location: SourceLocation;
    }
    export interface StringLiteralToken {
        tag: "string-literal";
        value: string;
        location: SourceLocation;
    }
    export interface NumberLiteralToken {
        tag: "number-literal";
        int: string;
        location: SourceLocation;
    }
    export interface PunctuationToken {
        tag: "punctuation";
        symbol: keyof typeof PUNCTUATION;
        location: SourceLocation;
    }
    export interface OperatorToken {
        tag: "operator";
        operator: keyof typeof OPERATORS;
        location: SourceLocation;
    }
    export interface EOFToken {
        tag: "eof";
        location: SourceLocation;
    }
    export const RESERVED: {
        Never: boolean;
        async: boolean;
        await: boolean;
        break: boolean;
        enum: boolean;
        for: boolean;
        function: boolean;
        of: boolean;
        record: boolean;
        resource: boolean;
        resume: boolean;
        service: boolean;
        test: boolean;
        type: boolean;
        until: boolean;
        while: boolean;
        yield: boolean;
    };
    export const TYPE_KEYWORDS: {
        Any: boolean;
        Unit: boolean;
        Boolean: boolean;
        Int: boolean;
        String: boolean;
        This: boolean;
    };
    export const KEYWORDS: {
        and: boolean;
        any: boolean;
        assert: boolean;
        case: boolean;
        class: boolean;
        do: boolean;
        else: boolean;
        elseif: boolean;
        ensures: boolean;
        enum: boolean;
        false: boolean;
        fn: boolean;
        forall: boolean;
        foreign: boolean;
        if: boolean;
        impl: boolean;
        import: boolean;
        implies: boolean;
        interface: boolean;
        is: boolean;
        isa: boolean;
        match: boolean;
        method: boolean;
        new: boolean;
        not: boolean;
        or: boolean;
        package: boolean;
        proof: boolean;
        record: boolean;
        requires: boolean;
        return: boolean;
        this: boolean;
        true: boolean;
        union: boolean;
        unit: boolean;
        unreachable: boolean;
        var: boolean;
        when: boolean;
    };
    export const OPERATORS: {
        "==": boolean;
        "!=": boolean;
        "<=": boolean;
        ">=": boolean;
        "++": boolean;
        "+": boolean;
        "-": boolean;
        "/": boolean;
        "*": boolean;
        "%": boolean;
        "<": boolean;
        ">": boolean;
    };
    export const PUNCTUATION: {
        "=": boolean;
        "(": boolean;
        ")": boolean;
        "{": boolean;
        "}": boolean;
        "[": boolean;
        "]": boolean;
        "|": boolean;
        ".": boolean;
        ",": boolean;
        ":": boolean;
        ";": boolean;
    };
    export type Token = IdenToken | TypeIdenToken | TypeVarToken | KeywordToken | TypeKeywordToken | StringLiteralToken | NumberLiteralToken | PunctuationToken | OperatorToken | EOFToken;
    export function tokenize(blob: string, fileID: string): Token[];
    export class LexError {
        message: ErrorElement[];
        constructor(message: ErrorElement[]);
        toString(): string;
    }
}
declare module "shiru/diagnostics" {
    import { SourceLocation } from "shiru/ir";
    import { ErrorElement } from "shiru/lexer";
    export class SemanticError {
        message: ErrorElement[];
        constructor(message: ErrorElement[]);
        toString(): string;
    }
    export class EntityRedefinedErr extends SemanticError {
        constructor(args: {
            name: string;
            firstBinding: SourceLocation;
            secondBinding: SourceLocation;
        });
    }
    export class NoSuchPackageErr extends SemanticError {
        constructor(args: {
            packageName: string;
            reference: SourceLocation;
        });
    }
    export class NoSuchEntityErr extends SemanticError {
        constructor(args: {
            entityName: string;
            reference: SourceLocation;
        });
    }
    export class NamespaceAlreadyDefinedErr extends SemanticError {
        constructor(args: {
            namespace: string;
            firstBinding: SourceLocation;
            secondBinding: SourceLocation;
        });
    }
    export class InvalidThisTypeErr extends SemanticError {
        constructor(args: {
            referenced: SourceLocation;
        });
    }
    export class MemberRedefinedErr extends SemanticError {
        constructor(args: {
            memberName: string;
            secondBinding: SourceLocation;
            firstBinding: SourceLocation;
        });
    }
    export class TypeVariableRedefinedErr extends SemanticError {
        constructor(args: {
            typeVariableName: string;
            firstBinding: SourceLocation;
            secondBinding: SourceLocation;
        });
    }
    export class NoSuchTypeVariableErr extends SemanticError {
        constructor(args: {
            typeVariableName: string;
            location: SourceLocation;
        });
    }
    export class NonTypeEntityUsedAsTypeErr extends SemanticError {
        constructor(args: {
            entity: string;
            entityTag: "interface";
            entityBinding: SourceLocation;
            useLocation: SourceLocation;
        });
    }
    export class TypeUsedAsConstraintErr extends SemanticError {
        constructor(args: {
            name?: string;
            kind: "record" | "keyword" | "enum";
            typeLocation: SourceLocation;
        });
    }
    export class VariableRedefinedErr extends SemanticError {
        constructor(args: {
            name: string;
            firstLocation: SourceLocation;
            secondLocation: SourceLocation;
        });
    }
    export class VariableNotDefinedErr extends SemanticError {
        constructor(args: {
            name: string;
            referencedAt: SourceLocation;
        });
    }
    export class MultiExpressionGroupedErr extends SemanticError {
        constructor(args: {
            location: SourceLocation;
            valueCount: number;
            grouping: "parens" | "field" | "field-init" | "method" | "if" | "op" | "contract" | "is";
            op?: string;
        });
    }
    export class ValueCountMismatchErr extends SemanticError {
        constructor(args: {
            actualCount: number;
            actualLocation: SourceLocation;
            expectedCount: number;
            expectedLocation: SourceLocation;
        });
    }
    export class TypeMismatchErr extends SemanticError {
        constructor(args: {
            givenType: string;
            givenLocation: SourceLocation;
            givenIndex?: {
                index0: number;
                count: number;
            };
            expectedType: string;
            expectedLocation: SourceLocation;
        });
    }
    export class ImplParameterCountMismatch extends SemanticError {
        constructor(args: {
            impl: string;
            member: string;
            implCount: number;
            interfaceCount: number;
            implLocation: SourceLocation;
            interfaceLocation: SourceLocation;
        });
    }
    export class ImplReturnCountMismatch extends SemanticError {
        constructor(args: {
            impl: string;
            member: string;
            implCount: number;
            interfaceCount: number;
            implLocation: SourceLocation;
            interfaceLocation: SourceLocation;
        });
    }
    export class ImplParameterTypeMismatch extends SemanticError {
        constructor(args: {
            impl: string;
            memberName: string;
            parameterIndex0: number;
            implType: string;
            interfaceType: string;
            implLocation: SourceLocation;
            interfaceLocation: SourceLocation;
        });
    }
    export class ImplReturnTypeMismatch extends SemanticError {
        constructor(args: {
            impl: string;
            memberName: string;
            returnIndex0: number;
            implType: string;
            interfaceType: string;
            implLocation: SourceLocation;
            interfaceLocation: SourceLocation;
        });
    }
    export class FieldAccessOnNonCompoundErr extends SemanticError {
        constructor(args: {
            accessedType: string;
            accessedLocation: SourceLocation;
        });
    }
    export class VariantTestOnNonEnumErr extends SemanticError {
        constructor(args: {
            testedType: string;
            testLocation: SourceLocation;
        });
    }
    export class MethodAccessOnNonCompoundErr extends SemanticError {
        constructor(args: {
            accessedType: string;
            accessedLocation: SourceLocation;
        });
    }
    export class BooleanTypeExpectedErr extends SemanticError {
        constructor(args: {
            givenType: string;
            location: SourceLocation;
        } & ({
            reason: "if";
        } | {
            reason: "logical-op";
            op: string;
            opLocation: SourceLocation;
        } | {
            reason: "contract";
            contract: "requires" | "ensures" | "assert";
        }));
    }
    export class TypeDoesNotProvideOperatorErr extends SemanticError {
        constructor({ lhsType, operator, operatorLocation }: {
            lhsType: string;
            operatorLocation: SourceLocation;
            operator: string;
        });
    }
    export class OperatorTypeMismatchErr extends SemanticError {
        constructor(args: {
            lhsType: string;
            operator: string;
            givenRhsType: string;
            expectedRhsType: string;
            rhsLocation: SourceLocation;
        });
    }
    export class CallOnNonCompoundErr extends SemanticError {
        constructor(args: {
            baseType: string;
            location: SourceLocation;
        });
    }
    export class NoSuchFnErr extends SemanticError {
        constructor(args: {
            baseType: string;
            methodName: string;
            methodNameLocation: SourceLocation;
        });
    }
    export class OperationRequiresParenthesizationErr extends SemanticError {
        constructor(args: {
            op1: {
                str: string;
                location: SourceLocation;
            };
            op2: {
                str: string;
                location: SourceLocation;
            };
            reason: "unordered" | "non-associative";
        });
    }
    export class RecursivePreconditionErr extends SemanticError {
        constructor(args: {
            callsite: SourceLocation;
            fn: string;
        });
    }
    export class ReturnExpressionUsedOutsideEnsuresErr extends SemanticError {
        constructor(args: {
            returnLocation: SourceLocation;
        });
    }
    export class TypesDontSatisfyConstraintErr extends SemanticError {
        constructor(args: {
            neededConstraint: string;
            neededLocation: SourceLocation;
            constraintLocation: SourceLocation | null;
        });
    }
    export class NonCompoundInRecordLiteralErr extends SemanticError {
        constructor(args: {
            t: string;
            location: SourceLocation;
        });
    }
    export class MemberRepeatedInCompoundLiteralErr extends SemanticError {
        constructor(args: {
            kind: "field" | "variant";
            fieldName: string;
            firstLocation: SourceLocation;
            secondLocation: SourceLocation;
        });
    }
    export class NoSuchFieldErr extends SemanticError {
        constructor(args: {
            recordType: string;
            fieldName: string;
            location: SourceLocation;
            kind: "access" | "initialization";
        });
    }
    export class NoSuchVariantErr extends SemanticError {
        constructor(args: {
            kind: "is test" | "variant access" | "initialization";
            enumType: string;
            variantName: string;
            location: SourceLocation;
        });
    }
    export class UninitializedFieldErr extends SemanticError {
        constructor(args: {
            recordType: string;
            missingFieldName: string;
            definedLocation: SourceLocation;
            initializerLocation: SourceLocation;
        });
    }
    export class MultipleVariantsErr extends SemanticError {
        constructor(args: {
            enumType: string;
            firstVariant: string;
            firstLocation: SourceLocation;
            secondVariant: string;
            secondLocation: SourceLocation;
        });
    }
    export class EnumLiteralMissingVariantErr extends SemanticError {
        constructor(args: {
            enumType: string;
            location: SourceLocation;
        });
    }
    export class TypeParameterCountMismatchErr extends SemanticError {
        constructor(args: {
            entityType: "record" | "interface";
            entityName: string;
            expectedCount: number;
            expectedLocation: SourceLocation;
            givenCount: number;
            givenLocation: SourceLocation;
        });
    }
    export class OverlappingImplsErr extends SemanticError {
        constructor(args: {
            firstImpl: string;
            firstLocation: SourceLocation;
            secondImpl: string;
            secondLocation: SourceLocation;
        });
    }
    export class ImplMemberDoesNotExistOnInterface extends SemanticError {
        constructor(args: {
            impl: string;
            member: string;
            memberLocation: SourceLocation;
            interface: string;
            interfaceLocation: SourceLocation;
        });
    }
    export class ImplMissingInterfaceMember extends SemanticError {
        constructor(args: {
            impl: string;
            member: string;
            implLocation: SourceLocation;
            interface: string;
            memberLocation: SourceLocation;
        });
    }
    export class ImplMayNotHavePreconditionErr extends SemanticError {
        constructor(args: {
            impl: string;
            memberName: string;
            preconditionLocation: SourceLocation;
        });
    }
    export class ProofMemberUsedOutsideProofContextErr extends SemanticError {
        constructor(args: {
            operation: string;
            location: SourceLocation;
        });
    }
}
declare module "shiru/parser" {
    export type ParsersFor<Token, ASTs> = {
        [P in keyof ASTs]: Parser<Token, ASTs[P]>;
    };
    export interface TokenSpan<Token> {
        first: Token;
        following: Token;
    }
    export type DebugContext<Token> = Record<string, TokenSpan<Token>>;
    export type ParseResult<Result> = {
        object: Result;
        rest: number;
    } | null;
    export abstract class Parser<Token, Result> {
        abstract parse(stream: Token[], from: number, debugContext: DebugContext<Token>): ParseResult<Result>;
        map<Q>(f: (r: Result, stream: Token[], from: number) => Q): Parser<Token, Q>;
        required(f: FailHandler<Token, unknown>): Parser<Token, Result>;
        otherwise<Q>(q: Q): Parser<Token, Result | Q>;
    }
    export class MapParser<T, A, B> extends Parser<T, B> {
        parser: Parser<T, A>;
        f: (a: A, stream: T[], from: number) => B;
        constructor(parser: Parser<T, A>, f: (a: A, stream: T[], from: number) => B);
        parse(stream: T[], from: number, debugContext: DebugContext<T>): ParseResult<B>;
    }
    export class EndOfStreamParser<T> extends Parser<T, {}> {
        parse(stream: T[], from: number): {
            object: {};
            rest: number;
        } | null;
    }
    export class ConstParser<T, R> extends Parser<T, R> {
        private value;
        constructor(value: R);
        parse(stream: T[], from: number): {
            object: R;
            rest: number;
        };
    }
    export class TokenParser<T, R> extends Parser<T, R> {
        f: (t: T) => (null | R);
        constructor(f: (t: T) => (null | R));
        parse(stream: T[], from: number): null | {
            object: R;
            rest: number;
        };
    }
    export class RepeatParser<T, R> extends Parser<T, R[]> {
        element: Parser<T, R>;
        min?: number;
        max?: number;
        constructor(element: Parser<T, R>, min?: number, max?: number);
        parse(stream: T[], from: number, debugContext: DebugContext<T>): ParseResult<R[]>;
    }
    export class PeekParser<T, R> extends Parser<T, R> {
        private subparser;
        constructor(subparser: Parser<T, R>);
        parse(stream: T[], from: number, debugContext: DebugContext<T>): ParseResult<R>;
    }
    export type RecordParserDescription<T, R> = {
        [P in keyof R]: (Parser<T, R[P]>);
    };
    export class RecordParser<T, R> extends Parser<T, R> {
        private description;
        private mem;
        constructor(description: () => RecordParserDescription<T, R>);
        parse(stream: T[], from: number, debugContext: DebugContext<T>): ParseResult<R>;
    }
    export class ChoiceParser<T, U> extends Parser<T, U> {
        parsers: () => Parser<T, U>[];
        constructor(parsers: () => Parser<T, U>[]);
        parse(stream: T[], from: number, debugContext: DebugContext<T>): ParseResult<U>;
    }
    export function choice<T, As, K extends keyof As>(grammar: () => ParsersFor<T, As>, ...keys: K[]): ChoiceParser<T, As[K]>;
    export type FailHandler<T, Q> = (stream: T[], from: number, context: DebugContext<T>) => Q;
    export class FailParser<T> extends Parser<T, never> {
        private f;
        constructor(f: FailHandler<T, unknown>);
        parse(stream: T[], from: number, debugContext: Record<string, TokenSpan<T>>): ParseResult<never>;
    }
}
declare module "shiru/grammar" {
    import { SourceLocation } from "shiru/ir";
    import { ErrorElement, IdenToken, KeywordToken, NumberLiteralToken, OperatorToken, StringLiteralToken, Token, TypeIdenToken, TypeKeywordToken, TypeVarToken } from "shiru/lexer";
    import { ParsersFor } from "shiru/parser";
    export class ParseError {
        message: ErrorElement[];
        constructor(message: ErrorElement[]);
        toString(): string;
    }
    export function parseSource(blob: string, fileID: string): Source;
    export type BooleanLiteralToken = KeywordToken & {
        keyword: "true" | "false";
    };
    export type BinaryLogicalToken = KeywordToken & {
        keyword: "and" | "or" | "implies";
    };
    export interface Source {
        package: PackageDef;
        imports: Import[];
        definitions: Definition[];
    }
    export interface PackageDef {
        packageName: IdenToken;
    }
    export interface ImportOfObject {
        tag: "of-object";
        packageName: IdenToken;
        objectName: TypeIdenToken;
        location: SourceLocation;
    }
    export interface ImportOfPackage {
        tag: "of-package";
        packageName: IdenToken;
        location: SourceLocation;
    }
    export interface Import {
        imported: ImportOfObject | ImportOfPackage;
    }
    export type Definition = RecordDefinition | EnumDefinition | InterfaceDefinition | ImplDefinition;
    export interface RecordDefinition {
        tag: "record-definition";
        entityName: TypeIdenToken;
        typeParameters: TypeParameters;
        fields: Field[];
        fns: Fn[];
        location: SourceLocation;
    }
    export interface EnumDefinition {
        tag: "enum-definition";
        entityName: TypeIdenToken;
        typeParameters: TypeParameters;
        variants: Field[];
        fns: Fn[];
        location: SourceLocation;
    }
    export interface ImplDefinition {
        tag: "impl-definition";
        impl: KeywordToken;
        typeParameters: TypeParameters;
        base: TypeNamed;
        constraint: Constraint;
        fns: Fn[];
        location: SourceLocation;
    }
    export interface InterfaceMember {
        signature: FnSignature;
    }
    export interface InterfaceDefinition {
        tag: "interface-definition";
        entityName: TypeIdenToken;
        typeParameters: TypeParameters;
        members: InterfaceMember[];
    }
    export interface Field {
        name: IdenToken;
        t: Type;
    }
    export interface FnParameters {
        list: FnParameter[];
        location: SourceLocation;
    }
    export interface FnParameter {
        name: IdenToken;
        t: Type;
    }
    export interface FnSignature {
        proof: KeywordToken | false;
        name: IdenToken;
        parameters: FnParameters;
        returns: Type[];
        requires: RequiresClause[];
        ensures: EnsuresClause[];
    }
    export interface RequiresClause {
        expression: Expression;
    }
    export interface EnsuresClause {
        expression: Expression;
    }
    export interface Fn {
        signature: FnSignature;
        body: Block;
    }
    export interface TypeParameters {
        parameters: TypeVarToken[];
        constraints: TypeConstraint[];
    }
    interface TypeArguments {
        arguments: Type[];
    }
    interface TypeConstraint {
        methodSubject: TypeVarToken | (TypeKeywordToken & {
            keyword: "This";
        });
        constraint: Constraint;
        location: SourceLocation;
    }
    interface TypeConstraints {
        constraints: TypeConstraint[];
    }
    export interface TypeNamed {
        tag: "named";
        packageQualification: PackageQualification | null;
        entity: TypeIdenToken;
        arguments: Type[];
        location: SourceLocation;
    }
    export interface PackageQualification {
        package: IdenToken;
        location: SourceLocation;
    }
    export type Type = TypeNamed | TypeKeywordToken | TypeVarToken;
    export interface Block {
        statements: Statement[];
        closing: SourceLocation;
    }
    export interface ReturnSt {
        tag: "return";
        values: Expression[];
        location: SourceLocation;
    }
    export interface IfSt {
        tag: "if";
        condition: Expression;
        body: Block;
        elseIfClauses: ElseIfClause[];
        elseClause: ElseClause | null;
    }
    export interface ElseIfClause {
        condition: Expression;
        body: Block;
    }
    export interface ElseClause {
        body: Block;
    }
    export type Statement = VarSt | ReturnSt | IfSt | AssertSt | UnreachableSt;
    export interface UnreachableSt {
        tag: "unreachable";
        location: SourceLocation;
    }
    export interface AssertSt {
        tag: "assert";
        expression: Expression;
        location: SourceLocation;
    }
    export interface VarSt {
        tag: "var";
        variables: VarDecl[];
        initialization: Expression[];
        location: SourceLocation;
    }
    export interface VarDecl {
        variable: IdenToken;
        t: Type;
        location: SourceLocation;
    }
    export interface Expression {
        left: ExpressionOperand;
        operations: ExpressionOperation[];
        location: SourceLocation;
    }
    export type ExpressionAccess = ExpressionAccessMethod | ExpressionAccessField;
    export interface ExpressionAccessMethod {
        tag: "method";
        methodName: IdenToken;
        args: Expression[];
        location: SourceLocation;
    }
    export interface ExpressionAccessField {
        tag: "field";
        fieldName: IdenToken;
    }
    export interface ExpressionOperand {
        atom: ExpressionAtom;
        accesses: ExpressionAccess[];
        suffixIs: ExpressionSuffixIs | null;
        location: SourceLocation;
    }
    export interface ExpressionOperationLogical {
        tag: "logical";
        operator: BinaryLogicalToken;
        right: ExpressionOperand;
    }
    export interface ExpressionSuffixIs {
        tag: "is";
        operator: KeywordToken;
        variant: IdenToken;
        location: SourceLocation;
    }
    export type ExpressionOperation = ExpressionOperationBinary | ExpressionOperationLogical;
    export interface ExpressionOperationBinary {
        tag: "binary";
        operator: OperatorToken;
        right: ExpressionOperand;
    }
    export interface ExpressionParenthesized {
        tag: "paren";
        expression: Expression;
        location: SourceLocation;
    }
    export interface ExpressionTypeCall {
        tag: "type-call";
        t: Type;
        methodName: IdenToken;
        arguments: Expression[];
        location: SourceLocation;
    }
    export interface ExpressionConstraintCall {
        tag: "constraint-call";
        constraint: ExpressionConstraint;
        methodName: IdenToken;
        arguments: Expression[];
        location: SourceLocation;
    }
    type Constraint = TypeNamed;
    export interface ExpressionConstraint {
        subject: Type;
        constraint: Constraint;
        location: SourceLocation;
    }
    export interface ExpressionRecordLiteral {
        tag: "record-literal";
        t: Type;
        initializations: ExpressionRecordFieldInit[];
        location: SourceLocation;
    }
    export interface ExpressionRecordFieldInit {
        fieldName: IdenToken;
        value: Expression;
    }
    export type ExpressionAtom = ExpressionParenthesized | StringLiteralToken | NumberLiteralToken | BooleanLiteralToken | (KeywordToken & {
        keyword: "return";
    }) | IdenToken | ExpressionTypeCall | ExpressionRecordLiteral | ExpressionConstraintCall;
    type ASTs = {
        AssertSt: AssertSt;
        Block: Block;
        Definition: Definition;
        ElseClause: ElseClause;
        ElseIfClause: ElseIfClause;
        EnsuresClause: EnsuresClause;
        EnumDefinition: EnumDefinition;
        Expression: Expression;
        ExpressionAccess: ExpressionAccess;
        ExpressionAccessField: ExpressionAccessField;
        ExpressionAccessMethod: ExpressionAccessMethod;
        ExpressionAtom: ExpressionAtom;
        ExpressionConstraint: ExpressionConstraint;
        ExpressionConstraintCall: ExpressionConstraintCall;
        ExpressionOperand: ExpressionOperand;
        ExpressionOperation: ExpressionOperation;
        ExpressionOperationBinary: ExpressionOperationBinary;
        ExpressionOperationLogical: ExpressionOperationLogical;
        ExpressionParenthesized: ExpressionParenthesized;
        ExpressionRecordLiteral: ExpressionRecordLiteral;
        ExpressionRecordFieldInit: ExpressionRecordFieldInit;
        ExpressionSuffixIs: ExpressionSuffixIs;
        ExpressionTypeCall: ExpressionTypeCall;
        Field: Field;
        Fn: Fn;
        FnParameter: FnParameter;
        FnParameters: FnParameters;
        FnSignature: FnSignature;
        IfSt: IfSt;
        ImplDefinition: ImplDefinition;
        Import: Import;
        ImportOfObject: ImportOfObject;
        ImportOfPackage: ImportOfPackage;
        InterfaceDefinition: InterfaceDefinition;
        InterfaceMember: InterfaceMember;
        PackageDef: PackageDef;
        PackageQualification: PackageQualification;
        RecordDefinition: RecordDefinition;
        RequiresClause: RequiresClause;
        ReturnSt: ReturnSt;
        Source: Source;
        Statement: Statement;
        Type: Type;
        TypeArguments: TypeArguments;
        TypeConstraint: TypeConstraint;
        TypeConstraints: TypeConstraints;
        TypeNamed: TypeNamed;
        TypeParameters: TypeParameters;
        TypeParametersOnlyConstraints: TypeParameters;
        UnreachableSt: UnreachableSt;
        VarDecl: VarDecl;
        VarSt: VarSt;
    };
    export const grammar: ParsersFor<Token, ASTs>;
}
declare module "shiru/interpreter" {
    import * as ir from "shiru/ir";
    import { ErrorElement } from "shiru/lexer";
    export type Value = RecordValue | EnumValue | BooleanValue | BytesValue | IntValue;
    export type RecordValue = {
        sort: "record";
        fields: Record<string, Value>;
    };
    export type EnumValue = {
        sort: "enum";
        field: Record<string, Value>;
    };
    export type BooleanValue = {
        sort: "boolean";
        boolean: boolean;
    };
    export type BytesValue = {
        sort: "bytes";
        bytes: string;
    };
    export type IntValue = {
        sort: "int";
        int: bigint;
    };
    export type ForeignImpl = (args: Value[]) => Value[];
    export function interpret(fn: ir.FunctionID, args: Value[], program: ir.Program, foreign: Record<string, ForeignImpl>): Value[];
    export class RuntimeErr {
        message: ErrorElement[];
        constructor(message: ErrorElement[]);
    }
    export function printProgram(program: ir.Program, lines: string[]): void;
    export function printFn(program: ir.Program, fnName: string, lines: string[]): void;
    export function printBlockContents(block: ir.OpBlock, indent: string, context: {
        typeVariables: string[];
    }, lines: string[]): void;
    export function printOp(op: ir.Op, indent: string, context: {
        typeVariables: string[];
    }, lines: string[]): void;
}
declare module "shiru/data" {
    export class TrieMap<KS extends readonly unknown[], V> {
        private map;
        private value;
        get(key: KS, from?: number): V | undefined;
        put(key: KS, v: V, from?: number): void;
        [Symbol.iterator](progress?: KS[number][]): Generator<[KS, V]>;
    }
    export class DefaultMap<K, V> {
        private defaulter;
        private map;
        constructor(defaulter: (k: K) => V);
        get(key: K): V;
        [Symbol.iterator](): Generator<[K, V], void, undefined>;
    }
    interface Edge<E, K> {
        next: E;
        key: K;
    }
    export class DisjointSet<E, K> {
        parents: Map<E, E>;
        ranks: Map<E, number>;
        outgoingEdges: Map<E, Edge<E, K>[]>;
        reset(): void;
        init(e: E): void;
        representative(e: E): E;
        compareEqual(a: E, b: E): boolean;
        explainEquality(a: E, b: E): K[];
        union(a: E, b: E, key: K): boolean;
        components(): E[][];
    }
}
declare module "shiru/semantics" {
    import * as grammar from "shiru/grammar";
    import * as ir from "shiru/ir";
    interface TypeVariableBinding {
        bindingLocation: ir.SourceLocation;
        variable: ir.TypeVariable;
    }
    interface TypeScopeI<This extends ir.Type | null> {
        thisType: This;
        typeVariables: Map<ir.TypeVariableID, TypeVariableBinding>;
        typeVariableList: ir.TypeVariableID[];
        constraints: TypeArgumentConstraint[];
    }
    interface TypeArgumentConstraint {
        constraint: ir.ConstraintParameter;
        location: ir.SourceLocation;
    }
    type TypeScope = TypeScopeI<ir.Type | null>;
    export function displayType(t: ir.Type): string;
    export function displayConstraint(c: ir.ConstraintParameter): string;
    export function displayTypeScope(c: TypeScope, opt: {
        space: boolean;
    }): string;
    export function compileSources(sources: Record<string, grammar.Source>): ir.Program;
}
declare module "shiru/egraph" {
    export type EObject = symbol & {
        __brand: "EObject";
    };
    export type EClassDescription<Term> = {
        members: {
            id: EObject;
            term: Term;
            operands: EObject[];
        }[];
    };
    export class EGraph<Term, Tag, Reason> {
        private tagged;
        private taggedDef;
        private tuples;
        private ds;
        reset(): void;
        getTagged(tag: Tag, id: EObject): Array<{
            id: EObject;
            term: Term;
            operands: EObject[];
        }>;
        add(term: Term, operands: EObject[], tag?: Tag, hint?: string): EObject;
        merge(a: EObject, b: EObject, reason: Set<Reason>): boolean;
        private updateCongruenceStep;
        updateCongruence(): boolean;
        query(a: EObject, b: EObject): null | Set<Reason>;
        getRepresentative(obj: EObject): EObject;
        getClasses(duplicate?: boolean): Map<EObject, EClassDescription<Term>>;
    }
}
declare module "shiru/sat" {
    export type Literal = number;
    type ClauseID = number;
    export type SATResult = "unsatisfiable" | Literal[];
    class UnitLiteralQueue {
        private unitLiterals;
        pushOrFindConflict(literal: Literal, antecedent: ClauseID): ClauseID | null;
        [Symbol.iterator](): Generator<[number, number], void, unknown>;
        clear(): void;
        size(): number;
    }
    export class SATSolver {
        private clauses;
        private watchedPositive;
        private watchedNegative;
        private assignments;
        private assignmentStack;
        private assignmentStackPosition;
        private decisionLevel;
        private termDecisionLevel;
        private antecedentClause;
        initTerms(term: number): void;
        getAssignment(): number[];
        solve(): SATResult;
        addClause(clause: Literal[]): ClauseID;
        _validateWatches(): void;
        propagate(unitLiterals: UnitLiteralQueue): {
            literal: Literal;
            literalAntecedent: ClauseID;
            negativeLiteralAntecedent: ClauseID;
        } | null;
        private assign;
        private diagnoseConflict;
        rollbackToDecisionLevel(level: number): void;
        popAssignment(): void;
    }
}
declare module "shiru/smt" {
    import * as sat from "shiru/sat";
    export abstract class SMTSolver<E, Counterexample> {
        protected clauses: sat.Literal[][];
        protected unscopedClauses: sat.Literal[][];
        private scopes;
        addConstraint(constraint: E): void;
        addUnscopedConstraint(constraint: E): void;
        protected addClausified(clause: sat.Literal[], target: sat.Literal[][]): void;
        pushScope(): void;
        popScope(): void;
        attemptRefutation(): "refuted" | Counterexample;
        protected abstract rejectModel(concrete: sat.Literal[]): Counterexample | sat.Literal[];
        protected abstract clausify(constraint: E): sat.Literal[][];
    }
}
declare module "shiru/uf" {
    import * as egraph from "shiru/egraph";
    import * as ir from "shiru/ir";
    import * as smt from "shiru/smt";
    export interface UFCounterexample {
    }
    type VarID = symbol & {
        __brand: "uf-var";
    };
    export type FnID = symbol & {
        __brand: "uf-fn";
    };
    type Value = VarValue | AppValue | ConstantValue;
    interface VarValue {
        tag: "var";
        var: VarID;
    }
    interface AppValue {
        tag: "app";
        fn: FnID;
        args: ValueID[];
    }
    interface ConstantValue {
        tag: "constant";
        constant: unknown;
    }
    export type ValueID = egraph.EObject & {
        __uf: "uf.ValueID";
    };
    export interface Semantics {
        eq?: true;
        not?: true;
        transitive?: true;
        transitiveAcyclic?: true;
        interpreter?: {
            f(...args: (unknown | null)[]): unknown | null;
        };
    }
    export interface Assumption<Reason> {
        constraint: ValueID;
        assignment: boolean;
        reason: Reason;
    }
    interface UFInconsistency<Reason> {
        tag: "inconsistent";
        inconsistent: Set<Reason>;
    }
    export class UFSolver<Reason> {
        private values;
        private fns;
        private egraph;
        private constants;
        createVariable(hint?: string): ValueID;
        createFn(semantics: Semantics): FnID;
        createApplication(fn: FnID, args: ValueID[]): ValueID;
        createConstant(literal: unknown): ValueID;
        getDefinition(valueID: ValueID): Value;
        getFnSemantics(fnID: FnID): Semantics;
        trueObject: ValueID;
        falseObject: ValueID;
        refuteAssumptions(assumptions: Assumption<Reason>[]): UFInconsistency<Reason> | {
            tag: "model";
            model: UFCounterexample;
        };
        private handleTrueMember;
        private handleFalseMember;
        private evaluateConstant;
        private propagateFnInterpreters;
        private findTransitivityContradictions;
        private findInconsistentConstants;
    }
    export class UFTheory extends smt.SMTSolver<ValueID[], UFCounterexample> {
        private solver;
        private nextSatTerm;
        private termByObject;
        private objectByTerm;
        createVariable(type: ir.Type): ValueID;
        createConstant(t: ir.Type, c: unknown): ValueID;
        createFunction(returnType: ir.Type, semantics: Semantics): FnID;
        private eqFn;
        createApplication(fnID: FnID, args: ValueID[]): ValueID;
        private toSatLiteral;
        clausify(disjunction: ValueID[]): number[][];
        rejectModel(literals: number[]): UFCounterexample | number[];
    }
}
declare module "shiru/verify" {
    import * as ir from "shiru/ir";
    export function verifyProgram(program: ir.Program): FailedVerification[];
    export type FailedVerification = FailedPreconditionVerification | FailedAssertVerification | FailedReturnVerification | FailedPostconditionValidation | FailedVariantVerification;
    export interface FailedPreconditionVerification {
        tag: "failed-precondition";
        callLocation: ir.SourceLocation;
        preconditionLocation: ir.SourceLocation;
    }
    export interface FailedPostconditionValidation {
        tag: "failed-postcondition";
        returnLocation: ir.SourceLocation;
        postconditionLocation: ir.SourceLocation;
    }
    export interface FailedAssertVerification {
        tag: "failed-assert";
        assertLocation: ir.SourceLocation;
    }
    export interface FailedReturnVerification {
        tag: "failed-return";
        blockEndLocation?: ir.SourceLocation;
    }
    export interface FailedVariantVerification {
        tag: "failed-variant";
        variant: string;
        enumType: string;
        accessLocation: ir.SourceLocation;
    }
}
declare module "shiru/library" {
    import * as diagnostics from "shiru/diagnostics";
    import * as grammar from "shiru/grammar";
    import * as interpreter from "shiru/interpreter";
    import * as ir from "shiru/ir";
    import * as lexer from "shiru/lexer";
    import * as verify from "shiru/verify";
    export interface SourceFile {
        path: string;
        content: string;
    }
    export type FunctionID = ir.FunctionID;
    export function parseSource(sourceFile: SourceFile): grammar.Source | lexer.LexError | grammar.ParseError;
    export function compileASTs(asts: Record<string, grammar.Source>): ir.Program | diagnostics.SemanticError;
    export function verifyProgram(program: ir.Program): diagnostics.SemanticError | verify.FailedVerification[];
    export function interpret(program: ir.Program, fn: FunctionID, args: interpreter.Value[]): interpreter.Value[];
    export function formatVerificationFailure(v: verify.FailedVerification): diagnostics.SemanticError;
    export class TextDocument {
        private path;
        private content;
        lines: {
            content: string;
            offset: number;
        }[];
        constructor(path: string, content: string);
        locate(query: number): {
            offset: number;
            line0: number;
            char0: number;
        };
        getLocus(location: ir.SourceLocation): string;
        getSnippetLine(line0: number, highlightStart: {
            offset: number;
            line0: number;
            char0: number;
        }, highlightEnd: {
            offset: number;
            line0: number;
            char0: number;
        }, options: {
            tabSize: number;
        }): {
            formatted: string;
            carets: string;
        };
        getSnippet(highlighting: ir.SourceLocation, options: {
            tabSize: number;
        }): ({
            tag: "ellipses";
        } | {
            tag: "content";
            line0: number;
            formatted: string;
            carets: string | null;
        })[];
    }
    export function displayError(e: {
        message: lexer.ErrorElement[];
    }, sourceList: SourceFile[]): string;
}
