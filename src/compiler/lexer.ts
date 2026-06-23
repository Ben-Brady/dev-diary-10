export interface Token {
    type:
        | "keyword" //
        | "identifer" //
        | "symbol" //
        | "string" //
        | "number"; //
    text: string;
}

class LexerError extends Error {
    name = "LexerError";
}

export function tokenize(code: string): Token[] {
    let cursor = 0;

    const hasText = () => cursor < code.length;
    const peek = (length: number = 1) => code.slice(cursor, cursor + length);
    const advance = (length: number = 1) => {
        if (cursor >= code.length) throw new LexerError("Unexpected EOF");
        cursor += length;
    };
    const matches = (...options: string[]) =>
        options.some(option => peek(option.length) === option);

    const popToken = (type: Token["type"], length: number): Token => {
        let text = code.slice(cursor, cursor + length);
        cursor += length;
        return { type, text };
    };

    const keyword = () => {
        const KEYWORDS = ["if", "else", "let", "while"];
        KEYWORDS.sort((a, b) => a.length - b.length);

        for (const keyword of KEYWORDS) {
            if (matches(keyword)) {
                return popToken("keyword", keyword.length);
            }
        }
        return undefined;
    };

    const symbol = () => {
        const OPERATORS = [
            ..."=<>+-*/{}()!,".split(""),
            "**",
            "==",
            "!=",
            "<=",
            ">=",
        ];
        OPERATORS.sort((a, b) => b.length - a.length);

        for (const operator of OPERATORS) {
            if (matches(operator)) {
                return popToken("symbol", operator.length);
            }
        }
        return undefined;
    };

    function string(): Token | undefined {
        if (!matches('"')) return undefined;

        let offset = cursor;
        advance();

        while (hasText()) {
            const char = peek();
            advance();
            if (char === '"') break;
        }

        return { type: "string", text: code.slice(offset, cursor) };
    }

    function identifer(): Token | undefined {
        if (!peek().match(/[a-zA-Z]/)) return undefined;
        let offset = cursor;

        while (hasText()) {
            if (!peek().match(/[a-zA-Z0-9_]/)) {
                break;
            }
            advance();
        }

        return { type: "identifer", text: code.slice(offset, cursor) };
    }

    function whitespace(): boolean {
        const success = matches(" ", "\t", "\n");
        if (success) advance();
        return success;
    }

    function singleComment(): boolean {
        if (!matches("//")) return false;
        advance(2);
        while (!matches("\n")) {
            advance();
        }
        return true;
    }
    function multilineComment(): boolean {
        if (!matches("/*")) return false;
        advance(2);
        while (!matches("*/")) {
            advance();
        }
        advance(2);
        return true;
    }

    function number(): Token | undefined {
        if (!peek().match(/[0-9]/)) return undefined;

        let offset = cursor;

        while (hasText()) {
            let char = peek();
            if (!char.match(/[0-9]/)) break;
            advance();
        }

        return { type: "number", text: code.slice(offset, cursor) };
    }

    const tokens: Token[] = [];
    while (hasText()) {
        if (whitespace()) continue;
        if (singleComment()) continue;
        if (multilineComment()) continue;

        const token =
            keyword() || symbol() || string() || number() || identifer();

        if (!token) throw new LexerError(`Unexpected Character '${peek()}'`);
        tokens.push(token);
    }
    return tokens;
}
