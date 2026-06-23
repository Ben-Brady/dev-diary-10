import type { Token } from "./lexer";

class ParserError extends Error {
    name = "ParseError";
}

export type Expr =
    | UnaryExpr
    | BinopExpr
    | CallExpr
    | IdentiferExpr
    | LiteralExpr;
export type Stmt = BlockStmt | AssignStmt | ExprStmt | IfStmt | WhileStmt;

export type UnaryOperator = "+" | "-" | "!";
export type MathOperator = "+" | "-" | "/" | "*" | "**";
export type CompareOperator = "==" | "!=" | "<" | "<=" | ">" | ">=";
export type BinaryOperator = CompareOperator | MathOperator;

export interface BinopExpr {
    type: "binop";
    op: BinaryOperator;
    left: Expr;
    right: Expr;
}

export interface UnaryExpr {
    type: "unaryop";
    op: UnaryOperator;
    value: Expr;
}

export interface CallExpr {
    type: "call";
    func: Expr;
    args: Expr[];
}

export interface IdentiferExpr {
    type: "ident";
    name: string;
}

export interface LiteralExpr {
    type: "literal";
    value: string | number;
}

export interface ExprStmt {
    type: "expr";
    expr: Expr;
}

export interface AssignStmt {
    type: "assign";
    target: string;
    value: Expr;
}

export interface IfStmt {
    type: "if";
    condition: Expr;
    body: Stmt;
    else: Stmt | null;
}

export interface WhileStmt {
    type: "while";
    condition: Expr;
    body: Stmt;
}

export interface BlockStmt {
    type: "block";
    stmts: Stmt[];
}

export type AST = Stmt[];

export function parse(tokens: Token[]): AST {
    let cursor = 0;
    const hasTokens = () => cursor < tokens.length;

    const peek = () => tokens[cursor];
    const peekIf = (type: Token["type"], text?: string) => {
        let token = peek();
        if (!token) return null;
        if (token.type !== type) return null;
        if (text && token.text !== text) return null;
        return token;
    };
    const popIf = (type: Token["type"], text?: string) => {
        let token = peekIf(type, text);
        if (token) cursor += 1;
        return token;
    };
    function expect<T>(value: T | undefined | null, error: string): T {
        if (!value) throw new ParserError(error);
        return value;
    }

    const comma = () => popIf("symbol", ",") && ",";
    const not = () => popIf("symbol", "!") && "!";
    const divide = () => popIf("symbol", "/") && "/";
    const asterix = () => popIf("symbol", "*") && "*";
    const exponent = () => popIf("symbol", "**") && "**";
    const equals = () => popIf("symbol", "=") && "=";
    const plus = () => popIf("symbol", "+") && "+";
    const minus = () => popIf("symbol", "-") && "-";
    const eq = () => popIf("symbol", "==") && "==";
    const neq = () => popIf("symbol", "!=") && "<";
    const lt = () => popIf("symbol", "<") && "<";
    const lteq = () => popIf("symbol", "<=") && "<=";
    const gt = () => popIf("symbol", ">") && ">";
    const gteq = () => popIf("symbol", ">=") && ">=";
    const openingBracket = () => popIf("symbol", "(") && "(";
    const closingBracket = () => popIf("symbol", ")") && ")";
    const openingBrace = () => popIf("symbol", "{") && "{";
    const closingBrace = () => popIf("symbol", "}") && "}";
    const whileKeyword = () => popIf("keyword", "while");
    const letKeyword = () => popIf("keyword", "let");
    const ifKeyword = () => popIf("keyword", "if");
    const elseKeyword = () => popIf("keyword", "else");

    const unaryOperator = () => plus() || minus() || not();
    const binaryOperator = () => mathOperator() || compareOperator();
    const compareOperator = () =>
        eq() || neq() || lt() || gt() || lteq() || gteq();
    const mathOperator = () =>
        exponent() || divide() || asterix() || plus() || minus();

    const name = () => popIf("identifer")?.text;

    const number = (): Expr | null => {
        let token = popIf("number");
        if (!token) return null;
        return { type: "literal", value: Number(token.text) };
    };
    const string = (): Expr | null => {
        let token = popIf("string");
        if (!token) return null;
        return { type: "literal", value: token.text.slice(1, -1) };
    };
    const literal = () => string() || number();

    const unaryop = (): Expr | null => {
        const op = unaryOperator();
        if (!op) return null;

        const value = expect(expr(), `Expected expr after ${op}`);
        return { type: "unaryop", op, value };
    };

    const binop = (left: Expr): Expr | null => {
        const op = binaryOperator();
        if (!op) return null;
        const right = expect(expr(), `Expected expr after ${op}`);
        return { type: "binop", op, left, right };
    };

    const call = (func: Expr): Expr | null => {
        if (!openingBracket()) return null;

        const args: Expr[] = [];
        if (!closingBracket()) {
            while (true) {
                let arg = expect(expr(), "Expected expr in call");
                args.push(arg);
                if (closingBracket()) break;
                expect(comma(), "Expected comma between arguments");
            }
        }

        return { type: "call", func: func, args };
    };

    const ident = (): Expr | null => {
        let name_ = name();
        if (!name_) return null;
        return { type: "ident", name: name_ };
    };
    const brackets = (): Expr | null => {
        if (!popIf("symbol", "(")) return null;
        const expr_ = expr();
        expect(popIf("symbol", ")"), "Expected closing brackets");
        return expr_;
    };

    const whileStmt = (): Stmt | null => {
        if (!whileKeyword()) return null;

        const condition = expect(expr(), "Expected condition in while");
        const body = expect(stmt(), "Expected body in while");
        return {
            type: "while",
            condition: condition,
            body: body,
        };
    };

    const ifStmt = (): Stmt | null => {
        if (!ifKeyword()) return null;

        const condition = expect(expr(), "Expected condition in if");
        const body = expect(stmt(), "Expected body in if");
        const else_ = elseKeyword() ? stmt() : null;
        return {
            type: "if",
            condition,
            body,
            else: else_,
        };
    };

    const assignStmt = (): Stmt | null => {
        let start = cursor;
        const target = name();
        if (!target) return null;
        if (!equals()) {
            cursor = start;
            return null;
        }

        const value = expect(expr(), "Expected value in assignment");
        return { type: "assign", target, value };
    };

    const exprStmt = (): Stmt | null => {
        const expr_ = expr();
        if (!expr_) return null;

        return { type: "expr", expr: expr_ };
    };

    const block = (): BlockStmt | null => {
        if (!openingBrace()) return null;
        const stmts: Stmt[] = [];
        while (hasTokens()) {
            if (closingBrace()) break;

            const nextStmt = expect(stmt(), "Expected stmt in block");
            stmts.push(nextStmt);
        }
        return { type: "block", stmts };
    };

    const expr = (): Expr | null => {
        const value = brackets() || unaryop() || ident() || literal();
        if (!value) return null;
        return compoundExpr(value);
    }; //

    const compoundExpr = (left: Expr): Expr => {
        const value = call(left) || binop(left);
        if (!value) return left;
        return compoundExpr(value);
    }; //

    const stmt = (): Stmt | null =>
        block() ||
        whileStmt() || //
        ifStmt() || //
        assignStmt() ||
        exprStmt();

    try {
        let stmts: Stmt[] = [];
        while (hasTokens()) {
            const v = stmt();
            if (!v) throw new ParserError(`Invalid statement`);
            stmts.push(v);
        }
        return stmts;
    } catch (e) {
        if (e instanceof ParserError) {
            e.message = `${e.message} at token ${cursor + 1}`;
        }
        throw e;
    }
}
