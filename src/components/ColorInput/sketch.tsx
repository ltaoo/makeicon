import { JSX } from "solid-js/jsx-runtime";

import { ColorInputCore } from "@/biz/color_input";
import { cn } from "@/utils";

import { Saturation } from "./saturation";
import { Hue } from "./hue";
import { Gradient } from "./gradient";

export function SketchColorPicker(props: { store: ColorInputCore } & JSX.HTMLAttributes<HTMLDivElement>) {
  const { store } = props;

  return (
    <div class={cn("sketch-picker py-2 px-2 box-border bg-white rounded-md shadow-lg w-[120px]", props.class)}>
      <div class="relative overflow-hidden w-full pb-[75%]">
        <Saturation store={store} />
      </div>
      <div class="flexbox-fix flex">
        <div class="py-1 flex-1">
          <div class="relative h-[10px] overflow-hidden">
            <Hue store={store} />
          </div>
          {/* <div style={styles.alpha}>
            <Alpha style={styles.Alpha} rgb={rgb} hsl={hsl} renderers={renderers} onChange={onChange} />
          </div> */}
        </div>
        {/* <div style={styles.color}>
          <Checkboard />
          <div style={styles.activeColor} />
        </div> */}
      </div>
      <Gradient store={store} />
      {/* <SketchFields rgb={rgb} hsl={hsl} hex={hex} onChange={onChange} disableAlpha={disableAlpha} /> */}
      {/* <SketchPresetColors colors={presetColors} onClick={onChange} onSwatchHover={onSwatchHover} /> */}
    </div>
  );
}
