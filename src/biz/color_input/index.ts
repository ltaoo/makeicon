import { base, Handler } from "@/domains/base";
import { InputCore } from "@/domains/ui";
import { LineCapType, LineJoinType } from "@/biz/path";

type ColorInputCoreProps = {
  onChange?: (values: { color: string; opacity: number; visible: boolean }) => void;
};
export function ColorInputCore(props: ColorInputCoreProps) {
  const { onChange } = props;

  let _value = "#ffffff";
  let _opacity = 100;
  let _visible = true;

  const _state = {
    get color() {
      return _value;
    },
    get opacity() {
      return _opacity;
    },
    get visible() {
      return _visible;
    },
  };

  enum Events {
    Change,
  }
  type TheTypesOfEvents = {
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
    _value = event;
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
    state: _state,
    $input: $hex,
    $opacity,
    setValue(v: { enabled: boolean; color: string }) {
      _value = v.color;
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
    handleRemove() {},
    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.on(Events.Change, handler);
    },
    SymbolTag: "ColorInputCore" as const,
  };
}

export type ColorInputCore = ReturnType<typeof ColorInputCore>;
