import { createSavedSignal } from "@nnilky/solid-hooks";
import { createSignal, For, type JSXElement, Show } from "solid-js";
import { Dynamic } from "solid-js/web";

export default function TabCard(props: {
    tabs: Record<string, () => JSXElement>;
}) {
    const [active, setActive] = createSavedSignal<string>(
        "dd10:tab",
        // eslint-disable-next-line solid/reactivity
        Object.keys(props.tabs).at(0)!,
    );

    return (
        <div class="w-full border rounded-lg">
            <div class="h-12 w-full flex border-b max-md:text-sm">
                <For each={Object.keys(props.tabs)}>
                    {name => (
                        <button
                            class="cursor-pointer flex-1 text-center not-last:border-r disabled:bg-white/10"
                            disabled={name === active()}
                            onClick={() => setActive(name)}
                        >
                            {name}
                        </button>
                    )}
                </For>
            </div>

            <div class="w-full h-128 p-8">
                <For each={Object.entries(props.tabs)}>
                    {([name, func]) => (
                        <Show when={name == active()}>
                            <Dynamic component={func} />
                        </Show>
                    )}
                </For>
            </div>
        </div>
    );
}
