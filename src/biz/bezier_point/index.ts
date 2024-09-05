import { base, Handler } from "@/domains/base";

enum Events {
  Move,
}
type TheTypesOfEvents = {
  [Events.Move]: { x: number; y: number; dx: number; dy: number };
};
type BezierPointProps = {
  x: number;
  y: number;
};

export function BezierPoint(props: BezierPointProps) {
  const bus = base<TheTypesOfEvents>();

  const { x, y } = props;

  let _uid = bus.uid();
  let _x = x;
  let _y = y;

  const _state = {
    x: _x,
    y: _y,
    selected: false,
  };

  return {
    SymbolTag: "BezierPoint" as const,
    get uid() {
      return _uid;
    },
    get x() {
      return _x;
    },
    get y() {
      return _y;
    },
    get pos() {
      return {
        x: _x,
        y: _y,
      };
    },
    get state() {
      return _state;
    },
    // setXY(x: number, y: number, options: Partial<{ silence: boolean }> = {}) {
    //   _x = x;
    //   _y = y;
    //   if (!options.silence) {
    //     bus.emit(Events.Move, { x, y, dx, dy });
    //   }
    // },
    setXY(pos: { x: number; y: number }) {
      const { x, y } = pos;
      _x = x;
      _y = y;
    },
    move(pos: { x: number; y: number }, options: Partial<{ silence: boolean }> = {}) {
      const { x, y } = pos;
      const dx = x - _x;
      const dy = y - _y;
      _x = x;
      _y = y;
      if (!options.silence) {
        bus.emit(Events.Move, { x, y, dx, dy });
      }
    },
    onMove(handler: Handler<TheTypesOfEvents[Events.Move]>) {
      return bus.on(Events.Move, handler);
    },
    // unlisten() {
    //   bus.destroy();
    // },
  };
}

export type BezierPoint = ReturnType<typeof BezierPoint>;
