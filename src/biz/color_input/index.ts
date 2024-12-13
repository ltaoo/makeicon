import { base, Handler } from "@/domains/base";
import { uuidFactory } from "@/domains/base";
import { InputCore } from "@/domains/ui";
import { LineCapType, LineJoinType } from "@/biz/path";

import { HSLToColor, HSVToColor, colorToHSLAndMore, getGradientColorBetweenStop } from "./utils";

type ColorInputCoreProps = {
  onChange?: (values: { color: string; opacity: number; visible: boolean }) => void;
};
export function ColorInputCore(props: ColorInputCoreProps) {
  const { onChange } = props;

  const uid = uuidFactory();
  let _color = "#ffffff";
  let _opacity = 100;
  let _visible = true;
  let _colorPickerVisible = false;
  /**
   * 色相（Hue） ：表示颜色的类型，通常以角度表示（0°到360°），其中红色为0°，绿色为120°，蓝色为240°，依此类推。
   * 饱和度（Saturation） ：表示颜色的纯度或强度，范围通常为0%到100%。0%表示灰色（没有颜色），而100%表示完全纯净的颜色。
   * 明度（Lightness） ：表示颜色的亮度，范围也是0%到100%。0%表示黑色，100%表示白色，50%表示该颜色的标准亮度。
   */
  let _hsl = { h: 0, s: 1, l: 0.5, a: 1 };
  /**
   * 色相（Hue） ：与 HSL 一样，表示颜色的类型，以角度表示。
   * 饱和度（Saturation） ：表示颜色的纯度或强度，范围同样是0%到100%。
   * 明度（Value） ：与 HSL 中的明度略有不同，HSV 中的明度又称为“明亮度”或“值”，范围为0%到100%。0%表示黑色，100%表示该颜色的最亮程度，而不特指白色。
   */
  let _hsv = { h: 0, s: 1, v: 1, a: 1 };
  /** 渐变色的分段 */
  let _stops: { id: number; offset: number; color: string }[] = [
    { id: uid(), offset: 0, color: "#000000" },
    { id: uid(), offset: 100, color: "#666666" },
  ];
  let _selectedStopIndex = _stops[0].id;

  const _state = {
    get color() {
      return _color;
    },
    get opacity() {
      return _opacity;
    },
    get visible() {
      return _visible;
    },
    get hsv() {
      return _hsv;
    },
    get hsl() {
      return _hsl;
    },
    get stops() {
      return _stops;
    },
    get selectedStopIndex() {
      return _selectedStopIndex;
    },
  };

  enum Events {
    ColorPickerVisibleChange,
    Change,
  }
  type TheTypesOfEvents = {
    [Events.ColorPickerVisibleChange]: boolean;
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();

  const $hex = new InputCore({
    type: "color",
    // value: "#000000",
    defaultValue: "#000000",
  });
  const $opacity = new InputCore({
    type: "number",
    defaultValue: 100,
  });
  $hex.onChange((event) => {
    _color = event;
    bus.emit(Events.Change, { ..._state });
  });
  $opacity.onChange((event) => {
    _opacity = event;
    bus.emit(Events.Change, { ..._state });
  });

  if (onChange) {
    bus.on(Events.Change, onChange);
  }

  return {
    SymbolTag: "ColorInputCore" as const,
    state: _state,
    $input: $hex,
    $opacity,
    get hsl() {
      return _hsl;
    },
    get hsv() {
      return _hsv;
    },
    setValue(v: { enabled: boolean; color: string }) {
      _color = v.color;
      _visible = v.enabled;
      bus.emit(Events.Change, { ..._state });
    },
    setOpacity(v: number) {
      _opacity = v;
      bus.emit(Events.Change, { ..._state });
    },
    toggleVisible() {
      _visible = !_visible;
      bus.emit(Events.Change, { ..._state });
    },
    setColor(color: string) {
      const r = colorToHSLAndMore(color);
      _hsl = r.hsl;
      _hsv = r.hsv;
      _color = color;
      bus.emit(Events.Change, { ..._state });
    },
    setHSV(hsv: { h: number; s: number; v: number; a: number }) {
      _hsv = hsv;
      _hsl.s = hsv.s;
      _color = `#${HSVToColor(hsv)}`;
      bus.emit(Events.Change, { ..._state });
    },
    setHSL(hsl: { h: number; s: number; l: number; a: number } | null) {
      if (hsl === null) {
        return;
      }
      _hsl.h = hsl.h;
      _hsv.h = hsl.h;
      // _hsv.s = hsl.s;
      _color = `#${HSLToColor(hsl)}`;
      bus.emit(Events.Change, { ..._state });
    },
    addStop() {
      let index = _stops.findIndex((s) => s.id === _selectedStopIndex);
      if (index === _stops.length - 1) {
        index = _stops.length - 2;
      }
      const prevStop = _stops[index];
      const nextIndex = index + 1;
      const nextStop = _stops[nextIndex];
      const offset = (nextStop.offset - prevStop.offset) / 2 + prevStop.offset;
      const color = getGradientColorBetweenStop(offset, [prevStop, nextStop]);
      console.log("[BIZ]color_input - addStop", index, offset, color);
      _selectedStopIndex = uid();
      _stops.splice(index + 1, 0, {
        id: _selectedStopIndex,
        color,
        offset,
      });
      bus.emit(Events.Change, { ..._state });
    },
    addStopWithOffset(offset: number) {},
    selectStop(id: number) {
      const matched = _stops.find((s) => s.id === id);
      if (!matched) {
        return;
      }
      _selectedStopIndex = id;
      bus.emit(Events.Change, { ..._state });
    },
    showColorPicker() {
      _colorPickerVisible = true;
    },
    hideColorPicker() {
      _colorPickerVisible = false;
    },
    handleRemove() {},
    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.on(Events.Change, handler);
    },
    onColorPickerVisibleChange(handler: Handler<TheTypesOfEvents[Events.ColorPickerVisibleChange]>) {
      return bus.on(Events.ColorPickerVisibleChange, handler);
    },
  };
}

export type ColorInputCore = ReturnType<typeof ColorInputCore>;
