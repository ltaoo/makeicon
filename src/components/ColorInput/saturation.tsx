import { createSignal } from "solid-js";
import { JSX } from "solid-js/jsx-runtime";
import { ColorInputCore } from "@/biz/color_input";
import { calcHSVWithPoint } from "@/biz/color_input/utils";

import "./style.css";

export function Saturation(props: { store: ColorInputCore } & JSX.HTMLAttributes<HTMLDivElement>) {
  const { store } = props;

  let $container: undefined | HTMLDivElement;
  const client = { width: 0, height: 0, left: 0, top: 0 };

  const [state, setState] = createSignal(store.state);

  store.onChange((v) => setState(v));

  return (
    <div
      ref={$container}
      class={"__a absolute inset-0"}
      style={{
        background: `hsl(${state().hsl.h}, 100%, 50%)`,
      }}
      onMouseDown={(e) => {
        const x = e.pageX;
        const y = e.pageY;
        const r = calcHSVWithPoint({ x, y }, store.hsv, client);
        store.setHSV(r);
      }}
      //       onMouseMove={(e) => {
      //         const x = e.pageX;
      //         const y = e.pageY;
      //         const r = calcHSVWithPoint(
      //           { x, y },
      //           {
      //             h: 0,
      //             a: 0,
      //           },
      //           client
      //         );
      //         store.setHSV(r);
      //       }}
      //       onTouchMove={handleChange}
      //       onTouchStart={handleChange}
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
      <div class="saturation-white absolute inset-0">
        <div class="saturation-black absolute inset-0" />
        <div
          class="absolute cursor-pointer"
          style={{ top: `${(1 - state().hsv.v) * 100}%`, left: `${state().hsv.s * 100}%` }}
        >
          <div class="saturation__circle w-[4px] h-[4px] rounded-full cursor-pointer translate-x-[-2px] translate-y-[-2px]" />
        </div>
      </div>
    </div>
  );
}
