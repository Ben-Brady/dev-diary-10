import type {
    AST,
    BinopExpr,
    BlockStmt,
    CallExpr,
    DeclarationStmt as AssignStmt,
    Expr,
    ExprStmt,
    IdentiferExpr,
    IfStmt,
    LiteralExpr,
    Stmt,
    UnaryExpr,
} from "../compiler/parser";

interface Node {
    name: string;
    children?: Node[];
}

export default function AstDisplay(props: { ast: AST }) {
    const tree = () => renderAst(props.ast);

    return (
        <pre class="code-block text-sm h-full overflow-y-auto">
            <code>{tree()}</code>
        </pre>
    );
}

function renderAst(ast: AST) {
    let output = "";
    let indentLevel = 0;
    let newline = (offset: number = 0) => {
        indentLevel += offset;
        return "\n" + " ".repeat(indentLevel * 4);
    };

    function renderExpr(expr: Expr): string {
        function renderLiteral(expr: LiteralExpr) {
            return `Literal(${expr.value})`;
        }

        function renderBinop(expr: BinopExpr) {
            return [
                `Binop(` + newline(+1),
                `op: ${expr.op}` + newline(),
                `left: ` + renderExpr(expr.left) + newline(),
                `right: ` + renderExpr(expr.right) + newline(-1),
                `)`,
            ].join("");
        }
        function renderUnary(expr: UnaryExpr) {
            return [
                `UnaryOp(` + newline(+1),
                `op: ${expr.op}` + newline(),
                `value: renderExpr(expr)` + newline(-1),
                `)`,
            ].join("");
        }

        function renderCall(expr: CallExpr) {
            const { args } = expr;

            let output = "";
            output += `Call(` + newline(+1);
            output += `func: ${renderExpr(expr.func)}` + newline();
            output += `args: [` + newline(+1);
            for (let i = 0; i < args.length; i++) {
                const arg = args[i];
                output += `${renderExpr(arg)}`;
                output += newline(i === args.length - 1 ? -1 : 0);
            }
            output += `]` + newline(-1);
            output += `)`;
            return output;
        }
        function renderIdent(expr: IdentiferExpr) {
            return `Ident(${expr.name})`;
        }

        if (expr.type === "literal") return renderLiteral(expr);
        if (expr.type === "binop") return renderBinop(expr);
        if (expr.type === "unaryop") return renderUnary(expr);
        if (expr.type === "call") return renderCall(expr);
        if (expr.type === "ident") return renderIdent(expr);
        return "";
    }

    function renderStmt(stmt: Stmt): string {
        function renderAssignStmt(stmt: AssignStmt) {
            return [
                "Assign(" + newline(+1),
                `name: ${stmt.target}` + newline(),
                `value: ${renderExpr(stmt.value)}` + newline(-1),
                ")",
            ].join("");
        }

        function renderIfStmt(stmt: IfStmt) {
            let output = "";
            output += "If(" + newline(+1);
            output += `condition: ${renderExpr(stmt.condition)}` + newline();
            if (!stmt.else) {
                output += `body: ${renderStmt(stmt.body)}` + newline(-1);
            } else {
                output += `body: ${renderStmt(stmt.body)}` + newline();
                output += `else: ${renderStmt(stmt.else)}` + newline(-1);
            }
            output += ")";
            return output;
        }

        function renderExprStmt(stmt: ExprStmt) {
            let output = "";
            output += "Expr(" + newline(+1);
            output += `expr: ${renderExpr(stmt.expr)}` + newline(-1);
            output += ")";
            return output;
        }

        function renderBlockStmt(stmt: BlockStmt) {
            if (stmt.stmts.length === 0) return "Block()";
            let output = "";
            output += "Block(" + newline(+1);
            for (let i = 0; i < stmt.stmts.length; i++) {
                const s = stmt.stmts[i];
                output += `${renderStmt(s)}`;
                output += newline(i === stmt.stmts.length - 1 ? -1 : 0);
            }
            output += ")";
            return output;
        }

        if (stmt.type === "assign") return renderAssignStmt(stmt);
        if (stmt.type === "block") return renderBlockStmt(stmt);
        if (stmt.type === "expr") return renderExprStmt(stmt);
        if (stmt.type === "if") return renderIfStmt(stmt);
        return "";
    }

    for (const stmt of ast) {
        output += renderStmt(stmt) + "\n";
    }

    return output;
}
