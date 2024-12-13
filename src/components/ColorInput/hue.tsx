import { JSX } from "solid-js/jsx-runtime";
import { createSignal } from "solid-js";

import { ColorInputCore } from "@/biz/color_input";
import { calcHSLWithPoint } from "@/biz/color_input/utils";
import { cn } from "@/utils";

export function Hue(props: { store: ColorInputCore } & JSX.HTMLAttributes<HTMLDivElement>) {
  const { store } = props;

  let $container: undefined | HTMLDivElement;
  const client = { width: 0, height: 0, left: 0, top: 0 };

  const [state, setState] = createSignal(store.state);
  store.onChange((v) => setState(v));

  return (
    <div class="absolute inset-0">
      <div
        ref={$container}
        class={cn("__a hue-horizontal px-1 relative h-full")}
        onMouseDown={(e) => {
          const x = e.pageX;
          const y = e.pageY;
          const r = calcHSLWithPoint({ x, y }, "horizontal", store.hsl, client);
          store.setHSL(r);
        }}
        // onTouchMove={this.handleChange}
        // onTouchStart={this.handleChange}
        onAnimationEnd={(event) => {
          const { width, height, left, top } = event.currentTarget.getBoundingClientRect();
          Object.assign(client, {
            width,
            height,
            left,
            top,
          });
        }}
      >
        <div class="absolute" style={{ left: `${(state().hsl.h * 100) / 360}%` }}>
          <div class="hub__slide mt-[1px] h-2 w-[4px] rounded bg-white transform translate-x-[-2px]" />
        </div>
      </div>
    </div>
  );
}
