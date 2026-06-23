import { For } from "solid-js";

import type { Token } from "../compiler/lexer";

export default function TokenDisplay(props: { tokens: Token[] }) {
    return (
        <div class="h-full flex flex-wrap content-baseline gap-2 overflow-y-auto">
            <For each={props.tokens}>
                {token => (
                    <div class="max-w-full h-fit text-wrap border px-2 py-0.5 rounded-md bg-neutral-600/30">
                        {token.text}
                    </div>
                )}
            </For>
        </div>
    );
}
