import type {
    AssignStmt,
    AST,
    BinaryOperator,
    BinopExpr,
    CallExpr,
    Expr,
    IdentiferExpr,
    IfStmt,
    LiteralExpr,
    Stmt,
    UnaryExpr,
    WhileStmt,
} from "./parser";

let bytecode = 0;
export const UNARY_NOT = bytecode++;
export const UNARY_PLUS = bytecode++;
export const UNARY_MINUS = bytecode++;
export const BINARY_OP = bytecode++;
export const CALL = bytecode++;
export const JUMP_FORWARD = bytecode++;
export const JUMP_BACKWARD = bytecode++;
export const JUMP_IF_NOT = bytecode++;
export const GET_NAME = bytecode++;
export const STORE_NAME = bytecode++;
export const GET_LITERAL = bytecode++;
export const DISCARD = bytecode++;
export const TO_BOOL = bytecode++;

let binop = 0;
export const OP_PLUS = binop++;
export const OP_MINUS = binop++;
export const OP_DIVIDE = binop++;
export const OP_MULTIPLY = binop++;
export const OP_EQUALS = binop++;
export const OP_NOT_EQUALS = binop++;
export const OP_GREATER_THAN = binop++;
export const OP_LESS_THAN = binop++;
export const OP_GREATER_THAN_OR_EQ = binop++;
export const OP_LESS_THAN_OR_EQ = binop++;
export const OP_EXPONENT = binop++;
export const binops: Record<BinaryOperator, number> = {
    "**": OP_EXPONENT,
    "+": OP_PLUS,
    "-": OP_MINUS,
    "*": OP_MULTIPLY,
    "/": OP_DIVIDE,
    "==": OP_EQUALS,
    "!=": OP_NOT_EQUALS,
    "<": OP_LESS_THAN,
    "<=": OP_LESS_THAN_OR_EQ,
    ">": OP_GREATER_THAN,
    ">=": OP_GREATER_THAN_OR_EQ,
};

export const binopSymbols: Record<number, string> = Object.fromEntries(
    Object.entries(binops).map(v => [v[1], v[0]]),
);
export const bytecodeNames: Record<number, string> = {
    [UNARY_NOT]: "UNARY_NOT",
    [UNARY_PLUS]: "UNARY_PLUS",
    [UNARY_MINUS]: "UNARY_MINUS",
    [BINARY_OP]: "BINARY_OP",
    [DISCARD]: "DISCARD",
    [CALL]: "CALL",
    [JUMP_FORWARD]: "JUMP_FORWARD",
    [JUMP_BACKWARD]: "JUMP_BACKWARD",
    [JUMP_IF_NOT]: "JUMP_IF_NOT",
    [GET_NAME]: "GET_NAME",
    [STORE_NAME]: "STORE_NAME",
    [GET_LITERAL]: "GET_LITERAL",
    [TO_BOOL]: "TO_BOOL",
};

type CompilerContext = {
    getName(name: string): number;
    getLiteral(name: number | string | boolean): number;
};

type Value = string | number | boolean;

export type Compilation = {
    names: string[];
    literals: Value[];
    bytecode: Uint8Array;
};

export function compile(ast: AST): Compilation {
    let names: string[] = [];
    let literals: Value[] = [];
    const ctx: CompilerContext = {
        getName(name) {
            const index = names.findIndex(v => v === name);
            if (index !== -1) return index;
            names.push(name);
            return names.length - 1;
        },
        getLiteral(value) {
            const index = literals.findIndex(v => v === value);
            if (index !== -1) return index;
            literals.push(value);
            return literals.length - 1;
        },
    };

    const bytecode = Array.from(compileStmts(ctx, ast));
    return {
        names,
        literals,
        bytecode: new Uint8Array(bytecode),
    };
}

function* compileStmts(ctx: CompilerContext, stmts: Stmt[]): Iterable<number> {
    for (const stmt of stmts) {
        yield* Stmt(ctx, stmt);
    }
}

function* Stmt(ctx: CompilerContext, stmt: Stmt): Iterable<number> {
    if (stmt.type === "block") yield* compileStmts(ctx, stmt.stmts);
    if (stmt.type === "if") yield* IfStmt(ctx, stmt);
    if (stmt.type === "assign") yield* AssignStmt(ctx, stmt);
    if (stmt.type === "while") yield* WhileStmt(ctx, stmt);
    if (stmt.type === "expr") {
        yield* Expr(ctx, stmt.expr);
        yield DISCARD;
    }
}

function* Expr(ctx: CompilerContext, value: Expr): Iterable<number> {
    if (value.type === "call") yield* CallExpr(ctx, value);
    if (value.type === "ident") yield* IdentExpr(ctx, value);
    if (value.type === "unaryop") yield* UnaryOpExpr(ctx, value);
    if (value.type === "binop") yield* BinopExpr(ctx, value);
    if (value.type === "literal") yield* LiteralExpr(ctx, value);
}

function* IfStmt(ctx: CompilerContext, stmt: IfStmt): Iterable<number> {
    yield* Expr(ctx, stmt.condition);
    yield TO_BOOL;

    const if_block = Array.from(Stmt(ctx, stmt.body));
    if (if_block.length > 2 ** 16) throw new Error("If block too long");

    if (!stmt.else) {
        yield JUMP_IF_NOT;
        yield if_block.length;
        yield* if_block;
    } else {
        const else_block = Array.from(Stmt(ctx, stmt.else));
        yield JUMP_IF_NOT;
        yield if_block.length + 2;
        yield* if_block;
        yield JUMP_FORWARD; // 1
        yield else_block.length; // 2
        yield* else_block;
    }
}

function* WhileStmt(ctx: CompilerContext, stmt: WhileStmt): Iterable<number> {
    const condition = Array.from(Expr(ctx, stmt.condition));
    condition.push(TO_BOOL);

    const body = Array.from(Stmt(ctx, stmt.body));
    if (body.length > 2 ** 16) throw new Error("While block too long");

    yield* condition;
    yield JUMP_IF_NOT;
    yield body.length + 2;
    yield* body;
    yield JUMP_BACKWARD; // 1
    yield body.length + 4 + condition.length; //2
}

function* AssignStmt(ctx: CompilerContext, stmt: AssignStmt): Iterable<number> {
    yield* Expr(ctx, stmt.value);
    yield STORE_NAME;
    yield ctx.getName(stmt.target);
}

function* CallExpr(ctx: CompilerContext, expr: CallExpr): Iterable<number> {
    yield* Expr(ctx, expr.func);
    for (const arg of expr.args) {
        yield* Expr(ctx, arg);
    }
    yield CALL;
    yield expr.args.length;
}

function* IdentExpr(
    ctx: CompilerContext,
    expr: IdentiferExpr,
): Iterable<number> {
    yield GET_NAME;
    yield ctx.getName(expr.name);
}

function* LiteralExpr(
    ctx: CompilerContext,
    expr: LiteralExpr,
): Iterable<number> {
    yield GET_LITERAL;
    yield ctx.getLiteral(expr.value);
}

function* UnaryOpExpr(ctx: CompilerContext, expr: UnaryExpr): Iterable<number> {
    yield* Expr(ctx, expr.value);
    if (expr.op === "+") yield UNARY_PLUS;
    if (expr.op === "-") yield UNARY_MINUS;
    if (expr.op === "!") yield UNARY_NOT;
}

function* BinopExpr(ctx: CompilerContext, expr: BinopExpr): Iterable<number> {
    yield* Expr(ctx, expr.left);
    yield* Expr(ctx, expr.right);
    yield BINARY_OP;
    yield binops[expr.op];
}
