import { base, Handler } from "@/domains/base";

type GradientColorProps = {
  id: string;
};
export function GradientColor(props: GradientColorProps) {
  const { id } = props;

  let _id = id;
  let _d1: { x: number; y: number } = { x: 0, y: 0 };
  let _d2: { x: number; y: number } = { x: 0, y: 0 };
  let _steps: { color: string; offset: number }[] = [];

  const _state = {};

  enum Events {
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();

  const ins = {
    Symbol: "GradientColor" as const,

    get id() {
      return _id;
    },
    get x1() {
      return _d1.x;
    },
    get y1() {
      return _d1.y;
    },
    get x2() {
      return _d2.x;
    },
    get y2() {
      return _d2.y;
    },
    get stops() {
      return _steps;
    },

    setD1AndD2(d1: { x: number; y: number }, d2: { x: number; y: number }) {
      _d1 = d1;
      _d2 = d2;
    },
    setSteps(stops: { color: string; offset: number }[]) {
      _steps = stops;
    },
    getStyle() {},

    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.emit(Events.Change, handler);
    },
  };
  return ins;
}

export type GradientColor = ReturnType<typeof GradientColor>;
