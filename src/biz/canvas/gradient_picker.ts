import { base, Handler } from "@/domains/base";
import { Point, PointType } from "@/biz/point";
import { LinePath } from "@/biz/path";
import { BezierPoint } from "@/biz/bezier_point";

import { calcMinAndMaxPoint, calcNorm, calcPercentAtLine, calculateTangent, checkPosInBox } from "./utils";
import { CanvasPointer } from "./mouse";
import { CursorType } from "./constants";
import { GradientColor } from "./gradient_color";

type GradientColorPickerProps = {
  start?: Point;
  end?: Point;
  d1?: {
    color: string;
    v: number;
  };
  d2?: {
    color: string;
    v: number;
  };
  pointer: CanvasPointer;
};
export function GradientColorPicker(props: GradientColorPickerProps) {
  const { start = null, end = null, d1 = null, d2 = null, pointer: _$pointer } = props;
  /** 颜色矩形距离直线的距离 */
  const distance = 24;
  /** 颜色矩形宽高 */
  const size = 12;

  function checkPosInPointBox(pos: { x: number; y: number }, point: Point, size: number) {
    const { x, y } = point;
    return checkPosInBox(pos, {
      x: x - size,
      y: y - size,
      x1: x + size,
      y1: y + size,
    });
  }
  function refreshD1AndD2(
    d1: { color: string; v: number },
    d2: { color: string; v: number },
    opt: Partial<{ ignorePoint: boolean }> = {}
  ) {
    if (_start === null || _end === null) {
      return;
    }
    const normal = calcNorm(_start, _end);
    const { x: nx, y: ny, dx, dy, ux, uy } = normal;
    const targetX1 = _start.x + dx * d1.v;
    const targetY1 = _start.y + dy * d1.v;
    // 切向量
    const unitVector = {
      x: dy / normal.length,
      y: -dx / normal.length,
    };
    const center = {
      x: targetX1 + unitVector.x * distance,
      y: targetY1 + unitVector.y * distance,
    };
    _center = center;
    const topLeft = {
      x: center.x + nx * size - ux * size,
      y: center.y + ny * size - uy * size,
    };
    const topRight = {
      x: center.x - nx * size - ux * size,
      y: center.y - ny * size - uy * size,
    };
    const bottomLeft = {
      x: center.x + nx * size + ux * size,
      y: center.y + ny * size + uy * size,
    };
    const bottomRight = {
      x: center.x - nx * size + ux * size,
      y: center.y - ny * size + uy * size,
    };
    _d1.point.setXY({
      x: targetX1 + unitVector.x,
      y: targetY1 + unitVector.y,
    });
    const points1 = [topLeft, topRight, bottomRight, bottomLeft];
    _d1 = {
      color: d1.color,
      v: d1.v,
      points: points1,
      point: _d1.point,
      box: {
        x: Math.min(...points1.map((p) => p.x)),
        y: Math.min(...points1.map((p) => p.y)),
        x1: Math.max(...points1.map((p) => p.x)),
        y1: Math.max(...points1.map((p) => p.y)),
      },
    };
    const targetX2 = _start.x + dx * d2.v;
    const targetY2 = _start.y + dy * d2.v;
    const center2 = {
      x: targetX2 + unitVector.x * distance,
      y: targetY2 + unitVector.y * distance,
    };
    const topLeft2 = {
      x: center2.x + nx * size - ux * size,
      y: center2.y + ny * size - uy * size,
    };
    const topRight2 = {
      x: center2.x - nx * size - ux * size,
      y: center2.y - ny * size - uy * size,
    };
    const bottomLeft2 = {
      x: center2.x + nx * size + ux * size,
      y: center2.y + ny * size + uy * size,
    };
    const bottomRight2 = {
      x: center2.x - nx * size + ux * size,
      y: center2.y - ny * size + uy * size,
    };
    const points2 = [topLeft2, topRight2, bottomRight2, bottomLeft2];
    _d2.point.setXY({
      x: targetX2 + unitVector.x,
      y: targetY2 + unitVector.y,
    });
    _d2 = {
      color: d2.color,
      v: d2.v,
      points: points2,
      point: _d2.point,
      box: {
        x: Math.min(...points2.map((p) => p.x)),
        y: Math.min(...points2.map((p) => p.y)),
        x1: Math.max(...points2.map((p) => p.x)),
        y1: Math.max(...points2.map((p) => p.y)),
      },
    };
  }
  function refreshD1AndD2Points() {
    if (_start === null || _end === null) {
      return;
    }
    const normal = calcNorm(_start, _end);
    const { x: nx, y: ny, dx, dy, ux, uy } = normal;
    const targetX1 = _start.x + dx * _d1.v;
    const targetY1 = _start.y + dy * _d1.v;
    // 切向量
    const unitVector = {
      x: dy / normal.length,
      y: -dx / normal.length,
    };
    const center = {
      x: targetX1 + unitVector.x * distance,
      y: targetY1 + unitVector.y * distance,
    };
    _center = center;
    const topLeft = {
      x: center.x + nx * size - ux * size,
      y: center.y + ny * size - uy * size,
    };
    const topRight = {
      x: center.x - nx * size - ux * size,
      y: center.y - ny * size - uy * size,
    };
    const bottomLeft = {
      x: center.x + nx * size + ux * size,
      y: center.y + ny * size + uy * size,
    };
    const bottomRight = {
      x: center.x - nx * size + ux * size,
      y: center.y - ny * size + uy * size,
    };
    const points1 = [topLeft, topRight, bottomRight, bottomLeft];
    _d1 = {
      color: _d1.color,
      v: _d1.v,
      points: points1,
      point: _d1.point,
      box: {
        x: Math.min(...points1.map((p) => p.x)),
        y: Math.min(...points1.map((p) => p.y)),
        x1: Math.max(...points1.map((p) => p.x)),
        y1: Math.max(...points1.map((p) => p.y)),
      },
    };
    const targetX2 = _start.x + dx * _d2.v;
    const targetY2 = _start.y + dy * _d2.v;
    const center2 = {
      x: targetX2 + unitVector.x * distance,
      y: targetY2 + unitVector.y * distance,
    };
    const topLeft2 = {
      x: center2.x + nx * size - ux * size,
      y: center2.y + ny * size - uy * size,
    };
    const topRight2 = {
      x: center2.x - nx * size - ux * size,
      y: center2.y - ny * size - uy * size,
    };
    const bottomLeft2 = {
      x: center2.x + nx * size + ux * size,
      y: center2.y + ny * size + uy * size,
    };
    const bottomRight2 = {
      x: center2.x - nx * size + ux * size,
      y: center2.y - ny * size + uy * size,
    };
    const points2 = [topLeft2, topRight2, bottomRight2, bottomLeft2];
    _d2 = {
      color: _d2.color,
      v: _d2.v,
      points: points2,
      point: _d2.point,
      box: {
        x: Math.min(...points2.map((p) => p.x)),
        y: Math.min(...points2.map((p) => p.y)),
        x1: Math.max(...points2.map((p) => p.x)),
        y1: Math.max(...points2.map((p) => p.y)),
      },
    };
  }

  let _start: Point | null = start;
  let _end: Point | null = end;
  let _cur_point: Point | null = null;
  /** 在线条上的点 */
  let _cur_point2: Point | null = null;
  let _$path: LinePath | null = null;
  let _normal: {
    length: number;
    x: number;
    y: number;
    dx: number;
    dy: number;
    ux: number;
    uy: number;
  } = {
    length: 0,
    x: 0,
    y: 0,
    dx: 0,
    dy: 0,
    ux: 0,
    uy: 0,
  };
  let _d1_point: { x: number; y: number } | null = null;
  let _d2_point: { x: number; y: number } | null = null;
  let _center: { x: number; y: number } | null = null;
  let _mounted = false;
  let _active = false;
  let _visible = false;
  let _d1: {
    points: { x: number; y: number }[];
    box: { x: number; y: number; x1: number; y1: number };
    point: Point;
    color: string;
    v: number;
  } = {
    points: [],
    box: { x: 0, y: 0, x1: 0, y1: 0 },
    point: Point({ type: PointType.Anchor, x: 0, y: 0 }),
    color: "#ffffff",
    v: 0,
  };
  let _d2: {
    points: { x: number; y: number }[];
    box: { x: number; y: number; x1: number; y1: number };
    point: Point;
    color: string;
    v: number;
  } = {
    points: [],
    box: { x: 0, y: 0, x1: 0, y1: 0 },
    point: Point({ type: PointType.Anchor, x: 0, y: 0 }),
    color: "#000000",
    v: 1,
  };

  const _state = {
    get points() {
      if (!_d1 || !_d2) {
        return {
          x1: 0,
          y1: 0,
          x2: 0,
          y2: 0,
        };
      }
      return {
        x1: _d1.point.x,
        y1: _d1.point.y,
        x2: _d2.point.x,
        y2: _d2.point.y,
      };
    },
    get colors(): { value: string; step: number; color: string; offset: number }[] {
      if (!_d1 || !_d2) {
        return [];
      }
      return [
        {
          value: _d1.color,
          step: _d1.v,
          color: _d1.color,
          offset: _d1.v,
        },
        {
          value: _d2.color,
          step: _d2.v,
          color: _d2.color,
          offset: _d2.v,
        },
      ];
    },
  };
  enum Events {
    Refresh,
    CursorChange,
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Refresh]: void;
    [Events.CursorChange]: CursorType;
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();
  const ins = {
    Symbol: "GradientColor" as const,
    state: _state,
    get $path() {
      return _$path;
    },
    get mounted() {
      return _mounted;
    },
    get active() {
      return _active;
    },
    get visible() {
      return _visible;
    },
    get norm() {
      return _normal;
    },
    get center() {
      return _center;
    },
    get d1() {
      return _d1;
    },
    get d2() {
      return _d2;
    },

    setStartAndEnd(start: Point, end: Point) {
      _start = start;
      _end = end;
      const $path = LinePath({
        points: [
          BezierPoint({ point: _start, from: null, to: null }),
          BezierPoint({ point: _end, from: null, to: null }),
        ],
      });
      _normal = calcNorm(start, end);
      _$path = $path;
    },
    setColorStartAndEnd(d1: { color: string; v: number }, d2: { color: string; v: number }) {
      if (!_start) {
        return;
      }
      refreshD1AndD2(d1, d2);
      _mounted = true;
    },
    getColor(id: string) {
      const r = GradientColor({ id });
      r.setD1AndD2(_d1.point.pos, _d2.point.pos);
      r.setSteps(_state.colors);
      return r;
    },
    refresh() {
      bus.emit(Events.Refresh);
    },

    handleMouseDown(pos: { x: number; y: number }) {
      if (_visible === false) {
        return;
      }
      if (!_start || !_end) {
        return;
      }
      const isClickStart = checkPosInPointBox(pos, _start, 5);
      const isClickEnd = checkPosInPointBox(pos, _end, 5);
      if (_d1) {
        const isHoverD1 = checkPosInBox(pos, _d1.box);
        if (isHoverD1) {
          _normal = calcNorm(_start, _end);
          _d1.point.startMove(pos);
          _active = true;
          return;
        }
      }
      if (_d2) {
        const isHoverD2 = checkPosInBox(pos, _d2.box);
        if (isHoverD2) {
          _normal = calcNorm(_start, _end);
          _d2.point.startMove(pos);
          _active = true;
          return;
        }
      }
      if (isClickStart) {
        _cur_point = _start;
      }
      if (isClickEnd) {
        _cur_point = _end;
      }
      if (_cur_point) {
        _cur_point.startMove(pos);
        _active = true;
      }
    },
    handleMousemove(pos: { x: number; y: number }) {
      //       console.log("[BIZ]canvas/gradient - handleMousemove", pos);
      if (_visible === false) {
        return;
      }
      if (!_start || !_end) {
        return;
      }
      if (!_$pointer.pressing) {
        const isClickStart = checkPosInPointBox(pos, _start, 5);
        const isClickEnd = checkPosInPointBox(pos, _end, 5);
        let isHoverD1 = false;
        if (_d1) {
          isHoverD1 = checkPosInBox(pos, _d1.box);
        }
        let isHoverD2 = false;
        if (_d2) {
          isHoverD2 = checkPosInBox(pos, _d2.box);
        }
        if (isClickStart || isClickEnd) {
          bus.emit(Events.CursorChange, "move");
          return;
        }
        if (isHoverD1 || isHoverD2) {
          bus.emit(Events.CursorChange, "move");
          return;
        }
        bus.emit(Events.CursorChange, "select-default");
        return;
      }
      if (_d1 && _d1.point.selected) {
        // console.log("[BIZ]canvas/gradient - move d1");
        // 优化从 _normal 取，不要移动的时候实时算
        const unitVector = calculateTangent(_start, _end);
        _d1.point.move(_$pointer.instanceOfMoving, { normal: unitVector, ...calcMinAndMaxPoint(_start, _end) });
        _d1.v = calcPercentAtLine(_start.pos, _end.pos, _d1.point.pos);
        refreshD1AndD2Points();
        bus.emit(Events.Refresh);
        return;
      }
      if (_d2 && _d2.point.selected) {
        // console.log("[BIZ]canvas/gradient - move d2");
        const unitVector = calculateTangent(_start, _end);
        _d2.point.move(_$pointer.instanceOfMoving, { normal: unitVector, ...calcMinAndMaxPoint(_start, _end) });
        _d2.v = calcPercentAtLine(_start.pos, _end.pos, _d2.point.pos);
        refreshD1AndD2Points();
        bus.emit(Events.Refresh);
        return;
      }
      if (_cur_point === null) {
        return;
      }
      //       if (_start === _cur_point) {
      //         _normal = calcNorm(_cur_point, _end);
      //       }
      //       if (_end === _cur_point) {
      //         _normal = calcNorm(_start, _cur_point);
      //       }
      _cur_point.moveTo(pos);
      refreshD1AndD2({ color: _d1.color, v: _d1.v }, { color: _d2.color, v: _d2.v });
      bus.emit(Events.Refresh);
    },
    handleMouseUp(pos: { x: number; y: number }) {
      if (_visible === false) {
        return;
      }
      if (!_start || !_end) {
        return;
      }
      if (_cur_point) {
        _cur_point.finishMove(pos);
        _cur_point = null;
      }
      if (_d1) {
        _d1.point.finishMove(pos);
        _d1.v = calcPercentAtLine(_start.pos, _end.pos, _d1.point.pos);
      }
      if (_d2) {
        _d2.point.finishMove(pos);
        _d2.v = calcPercentAtLine(_start.pos, _end.pos, _d2.point.pos);
      }
      _active = true;
      bus.emit(Events.Change, { ..._state });
    },

    onRefresh(handler: Handler<TheTypesOfEvents[Events.Refresh]>) {
      return bus.on(Events.Refresh, handler);
    },
    onCursorChange(handler: Handler<TheTypesOfEvents[Events.CursorChange]>) {
      return bus.on(Events.CursorChange, handler);
    },
    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.on(Events.Change, handler);
    },
  };

  return ins;
}

export type GradientColorPicker = ReturnType<typeof GradientColorPicker>;
