import { createSignal, For } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";

import { ColorInputCore } from "@/biz/color_input";
import { Plus } from "lucide-solid";
import { cn } from "@/utils";

export function Gradient(props: { store: ColorInputCore } & JSX.HTMLAttributes<HTMLDivElement>) {
  const { store } = props;
  const [state, setState] = createSignal(store.state);
  store.onChange((v) => setState(v));

  return (
    <div>
      <div>
        <div class="relative pt-[24px]">
          <div>
            <For each={state().stops}>
              {(stop) => {
                return (
                  <div>
                    <div
                      class={cn(
                        "absolute top-[8px] w-[12px] h-[12px] border border-2 translate-x-[-6px]",
                        state().selectedStopIndex === stop.id ? "border-blue-500" : ""
                      )}
                      style={{ left: `${stop.offset}%`, "background-color": stop.color }}
                      onClick={() => {
                        store.selectStop(stop.id);
                      }}
                    ></div>
                  </div>
                );
              }}
            </For>
          </div>
          <div
            class="w-full h-[10px]"
            style={{
              background: `linear-gradient(to right, ${state()
                .stops.map((s) => `${s.color} ${s.offset}%`)
                .join(", ")}`,
            }}
          ></div>
        </div>
        <div class="mt-4">
          <div class="flex items-center justify-between">
            <div>Stops</div>
            <div
              onClick={() => {
                store.addStop();
              }}
            >
              <Plus class="w-4 h-4 cursor-pointer" />
            </div>
          </div>
          <div class="mt-2 space-y-1">
            <For each={state().stops}>
              {(stop) => {
                return (
                  <div class="flex items-center">
                    <div class="w-[48px] font-sm" style={{ "line-height": "12px" }}>
                      {stop.offset}%
                    </div>
                    <div>
                      <div class="w-[12px] h-[12px]" style={{ "background-color": stop.color }}></div>
                    </div>
                  </div>
                );
              }}
            </For>
          </div>
        </div>
      </div>
    </div>
  );
}
