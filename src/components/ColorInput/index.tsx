import { createSignal, Show } from "solid-js";
import { Eye, EyeOff, LucideEqualNot } from "lucide-solid";

import { ColorInputCore } from "@/biz/color_input";
import { Input } from "@/components/ui";

export function ColorInput(props: { store: ColorInputCore }) {
  const { store } = props;

  const [state, setState] = createSignal(store.state);
  store.onChange((v) => setState(v));

  return (
    <div class="flex items-center space-x-4">
      <div class="flex items-center space-x-2">
        <input
          value={state().color}
          class="border-0 p-0 w-[24px] h-[24px]"
          type="color"
          onChange={(event) => {
            const value = event.currentTarget.value;
            store.$input.setValue(value);
          }}
        />
        <input
          value={state().color}
          class="w-[96px] border-0 p-0 h-[24px]"
          type="text"
          onChange={(event) => {
            const value = event.currentTarget.value;
            // ...
          }}
        />
        <input
          value={state().opacity}
          class="w-[48px] border-0 p-0 h-[24px]"
          type="text"
          onChange={(event) => {
            const value = event.currentTarget.value;
            const v = Number(value);
            if (Number.isNaN(v)) {
              return;
            }
            store.$opacity.setValue(v);
          }}
        />
      </div>
      <div class="flex items-center space-x-2">
        <div
          class="p-2 rounded-sm cursor-pointer hover:bg-[#ccc]"
          onClick={() => {
            store.toggleVisible();
          }}
        >
          <Show when={state().visible} fallback={<Eye class="w-4 h-4" />}>
            <EyeOff class="w-4 h-4" />
          </Show>
        </div>
        <div
          class="p-2 rounded-sm cursor-pointer hover:bg-[#ccc]"
          onClick={() => {
            store.handleRemove();
          }}
        >
          <LucideEqualNot class="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
