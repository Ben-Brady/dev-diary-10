import { H2, H3 } from "@local/ui";
import { createSavedSignal } from "@nnilky/solid-hooks";
import { createMemo, createSignal, Show } from "solid-js";

import { type Compilation, compile } from "./compiler/bytecode";
import { execute } from "./compiler/interpreter";
import { type Token, tokenize } from "./compiler/lexer";
import { type AST, parse } from "./compiler/parser";
import AstDisplay from "./components/AstDisplay";
import BytecodeDisplay from "./components/BytecodeDisplay";
import TabCard from "./components/TabCard";
import TokenDisplay from "./components/TokenDisplay";

export default function AstPreview() {
    const [stdin, setStdin] = createSavedSignal("dd10:stdin", "");
    const [code, setCode] = createSavedSignal("dd10:code", CODE_SAMPLE_1);
    const [error, setError] = createSignal("");

    const generation = createMemo(() => {
        let tokens: Token[] | undefined;
        let ast: AST | undefined;
        let compilation: Compilation | undefined;

        setError("");
        try {
            tokens = tokenize(code());
            ast = parse(tokens);
            compilation = compile(ast);
        } catch (e) {
            setError(String(e));
        }
        return { tokens, ast, compilation };
    });

    const output = () => {
        if (!generation().compilation) return "";

        const start = performance.now();
        let result = "";
        try {
            result = execute(generation().compilation!, stdin());
        } catch (e) {
            result = String(e);
        }
        const duration = performance.now() - start;
        return `Executed in ${duration.toFixed()}ms\n\n` + result;
    };

    return (
        <div class="flex flex-col gap-4 mb-4">
            <div class="flex flex-col border rounded-lg overflow-hidden">
                <div class="h-12 w-full flex border-b max-md:text-sm">
                    <button
                        class="cursor-pointer flex-1 text-center not-last:border-r disabled:bg-white/10"
                        onClick={() => {
                            setCode(CODE_SAMPLE_1);
                            setStdin("");
                        }}
                    >
                        Simple Maths
                    </button>
                    <button
                        class="cursor-pointer flex-1 text-center not-last:border-r disabled:bg-white/10"
                        onClick={() => {
                            setCode(CODE_SAMPLE_2);
                            setStdin("");
                        }}
                    >
                        Powers of 2
                    </button>
                    <button
                        class="cursor-pointer flex-1 text-center not-last:border-r disabled:bg-white/10"
                        onClick={() => {
                            setCode(CODE_SAMPLE_3);
                            setStdin("6347234");
                        }}
                    >
                        Format Bytes
                    </button>
                </div>
                <code>
                    <textarea
                        id="dd10-input"
                        class="h-64 w-full p-2 outline-none"
                        value={code()}
                        onChange={e => setCode(e.currentTarget.value)}
                        onKeyUp={e => setCode(e.currentTarget.value)}
                    />
                </code>
            </div>
            <code class="flex">
                <span class="font-mono p-1.5">{"> "}</span>
                <textarea
                    class="h-10 w-full p-2 outline-none"
                    value={stdin()}
                    onChange={e => setStdin(e.currentTarget.value)}
                    onKeyUp={e => setStdin(e.currentTarget.value)}
                />
            </code>

            <TabCard
                tabs={{
                    Lexer: () => (
                        <Show when={generation().tokens} fallback={error()}>
                            <TokenDisplay tokens={generation().tokens!} />
                        </Show>
                    ),
                    Parser: () => (
                        <>
                            <Show when={generation().ast} fallback={error()}>
                                <AstDisplay ast={generation().ast!} />
                            </Show>
                        </>
                    ),
                    Compiler: () => (
                        <Show
                            when={generation().compilation}
                            fallback={error()}
                        >
                            <BytecodeDisplay
                                compilation={generation().compilation!}
                            />
                        </Show>
                    ),
                    Output: () => (
                        <Show when={output()}>
                            <pre class="code-block h-full overflow-y-auto">
                                <code>{output()}</code>
                            </pre>
                        </Show>
                    ),
                }}
            />
        </div>
    );
}

const CODE_SAMPLE_1 = `
total = 1 + 10 + 100
if (total > 100) {
    print("yay")
} else {
    print("nah")
}
`.trim();
const CODE_SAMPLE_2 = `
// Powers of 2
i = 0
print("Powers of 2:")
while (i <= 16) {
    print("    " + str(i) + ": " + str(2 ** i))
    i = i + 1
}
`.trim();
const CODE_SAMPLE_3 = `
// Format bytes
input = int(stdin)

depth = 0
bytes = input
while (bytes > 1024) {
    bytes = bytes / 1024
    depth = depth + 1
}
bytes = round(bytes)

if (depth == 0) suffix = " bytes"
else if (depth == 1) suffix = "KB"
else if (depth == 2) suffix = "MB"
else if (depth == 3) suffix = "GB"
else if (depth == 4) suffix = "TB"
else if (depth == 5) suffix = "PB"
else suffix = "?"

print("Input:", round(input), "bytes")
print("Formated:", str(round(bytes)) + suffix)
`.trim();
