import { For } from "solid-js";

import * as bc from "../compiler/bytecode";
import type { Token } from "../compiler/lexer";

export default function BytecodeDisplay(props: {
    compilation: bc.Compilation;
}) {
    const ops = () => {
        const { bytecode, names, literals } = props.compilation;
        let cursor = 0;
        const ops: { start: number; end: number; text: string }[] = [];
        while (cursor < bytecode.length) {
            let start = cursor;
            const byte = bytecode[cursor++];

            let text = bc.bytecodeNames[byte];

            if (byte == bc.CALL) {
                text = `${text}(${bytecode[cursor++]} args)`;
            }
            if (byte == bc.JUMP_FORWARD || byte == bc.JUMP_IF_NOT) {
                text = `${text}(+${bytecode[cursor++]})`;
            }
            if (byte == bc.JUMP_BACKWARD) {
                text = `${text}(-${bytecode[cursor++]})`;
            }
            if (byte == bc.BINARY_OP) {
                const op = bc.binopSymbols[bytecode[cursor++]];
                text = `${text}(${op})`;
            }
            if (byte == bc.GET_LITERAL) {
                const index = bytecode[cursor++];
                const value = JSON.stringify(literals[index]);
                text = `${text}(${value})`;
            }
            if (byte == bc.STORE_NAME || byte == bc.GET_NAME) {
                const name = names[bytecode[cursor++]];
                text = `${text}(${name})`;
            }

            let end = cursor;
            ops.push({ text, start, end });
        }
        return ops;
    };

    const code = () => {
        let output = "";

        const { literals, names } = props.compilation;
        if (literals.length > 0) {
            output += `Literals:\n`;
            output += `    ${literals.map(v => JSON.stringify(v)).join(", ")}\n`;
            output += "\n";
        }
        if (names.length > 0) {
            output += `Identifiers:\n`;
            output += `    ${names.join(", ")}\n`;
            output += "\n";
        }

        const operations = ops();
        const { bytecode } = props.compilation;
        output += "position | bytes | description\n";
        for (let i = 0; i < operations.length; i++) {
            const { start, end, text } = operations[i];

            output += `${start.toString().padStart(8)} | `;

            const bytes = Array.from(bytecode)
                .slice(start, end)
                .map(v => v.toString(16).padStart(2, "0"))
                .join(" ");
            output += `${bytes.padStart(5)} | `;

            output += text;
            output += "\n";
        }
        return output;
    };

    return (
        <pre
            class={
                "code-block h-full overflow-y-auto " +
                "text-sm max-sm:text-[12px] max-xs:text-[10px]"
            }
        >
            <code>{code() + " "}</code>
        </pre>
    );
}
