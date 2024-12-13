/**
 * @file 纯粹的坐标点
 */
import { base, Handler } from "@/domains/base";
import { BezierPoint } from "@/biz/bezier_point";

enum Events {
  Change,
  Move,
}
type TheTypesOfEvents = {
  [Events.Change]: { x: number; y: number };
  [Events.Move]: { x: number; y: number; dx: number; dy: number };
};
type PointProps = {
  x: number;
  y: number;
  type: PointType;
};
export enum PointType {
  /** 锚点，改变线条位置 */
  Anchor,
  /** 控制点，改变线条曲率 */
  Control,
}
export function Point(props: PointProps) {
  const { x, y, type } = props;

  let _x = x;
  let _y = y;
  let _start: null | { x: number; y: number } = null;
  let _type = type;
  let _selected = false;
  let _highlighted = false;

  const _state = {
    x: _x,
    y: _y,
    selected: false,
  };
  const bus = base<TheTypesOfEvents>();

  return {
    SymbolTag: "Point" as const,
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
    get type() {
      return _type;
    },
    get state() {
      return _state;
    },
    get selected() {
      return _selected;
    },
    select() {
      _selected = true;
    },
    unselect() {
      _selected = false;
    },
    get highlighted() {
      return _selected;
    },
    setHighlight(v: boolean) {
      _highlighted = v;
    },
    // setXY(x: number, y: number, options: Partial<{ silence: boolean }> = {}) {
    //   _x = x;
    //   _y = y;
    //   if (!options.silence) {
    //     bus.emit(Events.Move, { x, y, dx, dy });
    //   }
    // },
    startScale() {
      _start = {
        x: _x,
        y: _y,
      };
      // console.log("[BIZ]point/index - start scale", _start);
    },
    scale(v: number, options: Partial<{ directly: boolean; silence: boolean }> = {}) {
      // console.log("[BIZ]point/index - before scale", _x, _y);
      if (!options.directly && _start) {
        _x = _start.x * v;
        _y = _start.y * v;
      } else {
        _x = _x * v;
        _y = _y * v;
      }
      // console.log("[BIZ]point/index - after scale", _x, _y);
      // bus.emit(Events.Change, { x: _x, y: _y });
    },
    finishScale() {
      _start = null;
    },
    startRotate() {
      _start = {
        x: _x,
        y: _y,
      };
    },
    rotate(pos: { x: number; y: number }, opt: { center: { x: number; y: number }; angle: number }) {
      const { center, angle } = opt;
      if (!_start) {
        return;
      }
      const a = (angle * 180) / Math.PI;
      const x = _start.x - center.x;
      const y = _start.y - center.y;
      // _x = x * Math.cos(a) - y * Math.sin(a) + center.x;
      // _y = x * Math.sin(a) + y * Math.cos(a) + center.y;
      _x = x * Math.cos(angle) - y * Math.sin(angle) + center.x;
      _y = x * Math.sin(angle) + y * Math.cos(angle) + center.y;
      // const cos = Math.cos(angle);
      // const sin = Math.sin(angle);
      // // 平移到原点
      // const translatedX = _start.x - center.x;
      // const translatedY = _start.y - center.y;
      // // 旋转
      // const rotatedX = translatedX * cos - translatedY * sin;
      // const rotatedY = translatedX * sin + translatedY * cos;
      // _x = rotatedX + center.x;
      // _y = rotatedY + center.y;
    },
    finishRotate(pos: { x: number; y: number }) {
      _start = null;
    },
    setXY(pos: { x: number; y: number }) {
      const { x, y } = pos;
      _x = x;
      _y = y;
    },
    /** 移动到指定坐标 */
    moveTo(pos: { x: number; y: number }, opt: Partial<{ normal: { x: number; y: number }; silence: boolean }> = {}) {
      const { x, y } = pos;
      const dx = x - _x;
      const dy = y - _y;
      _x = x;
      _y = y;
      if (opt.normal) {
        // const dotProduct = dx * opt.normal.x + dy * opt.normal.y;
        // _x = dotProduct * opt.normal.x;
        // _y = dotProduct * opt.normal.y;
        // console.log("[BIZ]point - moveTo", pos, dotProduct);
        // _x = x * opt.normal.x;
        // _y = y * opt.normal.y;
      }
      if (opt.silence) {
        return;
      }
      bus.emit(Events.Move, { x, y, dx, dy });
    },
    startMove(pos: { x: number; y: number }) {
      _selected = true;
      _start = {
        x: _x,
        y: _y,
      };
    },
    move(
      distance: { x: number; y: number },
      opt: Partial<{
        min: { x: number; y: number };
        max: { x: number; y: number };
        normal: { x: number; y: number };
        directly: boolean;
        silence: boolean;
      }> = {}
    ) {
      // console.log("[BIZ]point - move", _x, _y, distance, opt.normal);
      const { x, y } = distance;
      if (!_start) {
        return;
      }
      if (opt.directly) {
        _x += x;
        _y += y;
      } else {
        if (opt.normal) {
          const dotProduct = x * opt.normal.x + y * opt.normal.y;
          _x = _start.x + dotProduct * opt.normal.x;
          _y = _start.y + dotProduct * opt.normal.y;
          // console.log("[BIZ]point - point", dotProduct, _x, _y);
          // _x = _start.x + x * opt.normal.x;
          // _y = _start.y + y * opt.normal.y;
        } else {
          _x = _start.x + x;
          _y = _start.y + y;
        }
      }
      if (opt.min) {
        if (_x < opt.min.x) {
          _x = opt.min.x;
        }
        if (_y < opt.min.y) {
          _y = opt.min.y;
        }
      }
      if (opt.max) {
        if (_x > opt.max.x) {
          _x = opt.max.x;
        }
        if (_y > opt.max.y) {
          _y = opt.max.y;
        }
      }
      if (opt.silence) {
        return;
      }
      bus.emit(Events.Move, { x: _x, y: _y, dx: x, dy: y });
    },
    finishMove(pos: { x: number; y: number }) {
      _start = null;
      _selected = false;
    },
    onMove(handler: Handler<TheTypesOfEvents[Events.Move]>) {
      return bus.on(Events.Move, handler);
    },
    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.on(Events.Change, handler);
    },
  };
}

export type Point = ReturnType<typeof Point>;
