import { base, Handler } from "@/domains/base";
import { BezierPoint } from "@/biz/bezier_point";

import { findSymmetricPoint } from "./utils";

enum Events {
  Move,
  ToOrFromChange,
}
type TheTypesOfEvents = {
  [Events.Move]: { x: number; y: number };
  [Events.ToOrFromChange]: void;
};
export enum PathPointMirrorTypes {
  /** 不对称，角度和长度都不同 */
  NoMirror = 1,
  /** 角度对称，长度可以不同 */
  MirrorAngle = 2,
  /** 完全对称，角度和长度完全相同 */
  MirrorAngleAndLength = 3,
  /** 直角，没有控制点 */
  Angle = 4,
}
export type CircleCurved = {
  // start: { x: number; y: number };
  center: { x: number; y: number };
  radius: number;
  arc: { start: number; end: number };
  /** 是否逆时针 */
  counterclockwise: boolean;
  extra: { start: { x: number; y: number }; rx: number; ry: number; rotate: number; t1: number; t2: number };
};
type PathPointProps = {
  point: BezierPoint;
  from: null | BezierPoint;
  to: null | BezierPoint;
  // 是个圆。@todo 这样设计不太好，还是按 线条 逻辑，不是 点 逻辑
  circle?: CircleCurved;
  start?: boolean;
  end?: boolean;
  /** 未确定，预览 */
  virtual?: boolean;
  mirror?: null | PathPointMirrorTypes;
};

export function PathPoint(props: PathPointProps) {
  const bus = base<TheTypesOfEvents>();

  const { point, from, to, circle, start = false, end = false, virtual = true, mirror } = props;

  let _point = point;
  let _from = from;
  let _to = to;
  let _mirror = mirror || PathPointMirrorTypes.Angle;
  /** 表示还在移动，没有确定的坐标 */
  let _virtual = virtual;
  /** 表示隐藏，不绘制 */
  let _hidden = false;
  if (_mirror === PathPointMirrorTypes.MirrorAngleAndLength && _from && !_to) {
    const symPoint = findSymmetricPoint({ x: point.x, y: point.y }, _from);
    _to = BezierPoint(symPoint);
  }
  if (_mirror === PathPointMirrorTypes.MirrorAngleAndLength && _to && !_from) {
    const symPoint = findSymmetricPoint({ x: point.x, y: point.y }, _to);
    _from = BezierPoint(symPoint);
  }
  let _circle = circle;
  let _start = start;
  let _end = end;
  let _closed = false;
  // const bus = base();
  let _uid = bus.uid();

  const _state = {
    from: _from,
    to: _to,
    selected: false,
  };

  point.onMove((v) => {
    if (_from) {
      _from.move(
        {
          x: _from.x + v.dx,
          y: _from.y + v.dy,
        },
        { silence: true }
      );
    }
    if (_to) {
      _to.move(
        {
          x: _to.x + v.dx,
          y: _to.y + v.dy,
        },
        { silence: true }
      );
    }
  });
  if (_mirror === PathPointMirrorTypes.MirrorAngleAndLength) {
    const f = _from;
    const t = _to;
    if (f && t) {
      f.onMove((v) => {
        const symPoint = findSymmetricPoint({ x: _point.x, y: _point.y }, f);
        t.move({ x: symPoint.x, y: symPoint.y }, { silence: true });
      });
      f.onMove((v) => {
        const symPoint = findSymmetricPoint({ x: _point.x, y: _point.y }, t);
        f.move({ x: symPoint.x, y: symPoint.y }, { silence: true });
      });
    }
  }

  return {
    SymbolTag: "PathPoint" as const,
    get uid() {
      return _uid;
    },
    get x() {
      return _point.x;
    },
    get y() {
      return _point.y;
    },
    /** 坐标点 */
    get point() {
      return _point;
    },
    /** 控制点1 */
    get from() {
      return _from;
    },
    /** 控制点2 */
    get to() {
      return _to;
    },
    setTo(point: BezierPoint) {
      _to = point;
      const t = _to;
      // console.log("[BIZ]path_point/index - setTo", _mirror, t);
      if (_mirror === PathPointMirrorTypes.MirrorAngleAndLength) {
        const symPoint = findSymmetricPoint({ x: _point.x, y: _point.y }, t);
        _from = BezierPoint({
          x: symPoint.x,
          y: symPoint.y,
        });
        // const t = _to;
        const f = _from;
        f.onMove(() => {
          const symPoint = findSymmetricPoint({ x: _point.x, y: _point.y }, f);
          t.move({ x: symPoint.x, y: symPoint.y }, { silence: true });
        });
        t.onMove(() => {
          const symPoint = findSymmetricPoint({ x: _point.x, y: _point.y }, t);
          f.move({ x: symPoint.x, y: symPoint.y }, { silence: true });
        });
      }
      bus.emit(Events.ToOrFromChange);
    },
    setFrom(
      point: BezierPoint,
      extra: Partial<{
        // 复制一个新的点，而不是使用传入的引用
        copy: boolean;
      }> = {}
    ) {
      _from = point;
      if (extra.copy) {
        _from = BezierPoint({
          x: point.x,
          y: point.y,
        });
      }
      bus.emit(Events.ToOrFromChange);
    },
    get circle() {
      return _circle;
    },
    setCircle(v: CircleCurved) {
      _circle = v;
    },
    /** 是否是路径的起点 */
    get start() {
      return _start;
    },
    setStart(is: boolean) {
      _start = is;
    },
    get end() {
      return _end;
    },
    setEnd(is: boolean) {
      _end = is;
    },
    get closed() {
      return _closed;
    },
    setClosed() {
      console.log("[BIZ]path_point - setClosed");
      _closed = true;
    },
    get virtual() {
      return _virtual;
    },
    setVirtual(v: boolean) {
      _virtual = v;
    },
    get hidden() {
      return _hidden;
    },
    setHidden(v: boolean) {
      _hidden = v;
    },
    get mirror() {
      return _mirror;
    },
    setMirror(type: PathPointMirrorTypes, extra: Partial<{ silence: boolean }> = {}) {
      const { silence = true } = extra;
      const cur = _mirror;
      if (cur === type) {
        return;
      }
      _mirror = type;
      if (silence) {
        return;
      }
      if (type === PathPointMirrorTypes.MirrorAngleAndLength) {
      }
      if (type === PathPointMirrorTypes.MirrorAngle) {
        if (cur === PathPointMirrorTypes.MirrorAngleAndLength) {
          // 之前是完全对称，改成角度对称，不用任何调整
          return;
        }
      }
      if (type === PathPointMirrorTypes.NoMirror) {
        return;
      }
      if (type === PathPointMirrorTypes.Angle) {
        _from = null;
        _to = null;
        bus.emit(Events.ToOrFromChange);
        return;
      }
    },
    state: _state,
    deletePoint(point: BezierPoint) {
      if (_from === point) {
        _from = null;
        _mirror = PathPointMirrorTypes.NoMirror;
      }
      if (_to === point) {
        _to = null;
        _mirror = PathPointMirrorTypes.NoMirror;
      }
    },
    onToOrFromChange(handler: Handler<TheTypesOfEvents[Events.ToOrFromChange]>) {
      return bus.on(Events.ToOrFromChange, handler);
    },
  };
}

export type PathPoint = ReturnType<typeof PathPoint>;
