/**
 * @file 贝塞尔曲线点
 * 概念上
 */
import { base, Handler } from "@/domains/base";
import { Point } from "@/biz/point";

import { findSymmetricPoint } from "./utils";

enum Events {
  Move,
  ToOrFromChange,
}
type TheTypesOfEvents = {
  [Events.Move]: { x: number; y: number };
  [Events.ToOrFromChange]: void;
};
export enum BezierPointMirrorTypes {
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
type BezierPointProps = {
  point: Point;
  from: null | Point;
  to: null | Point;
  // 是个圆。@todo 这样设计不太好，还是按 线条 逻辑，不是 点 逻辑
  circle?: CircleCurved;
  start?: boolean;
  end?: boolean;
  /** 未确定，预览 */
  virtual?: boolean;
  mirror?: null | BezierPointMirrorTypes;
};

export function BezierPoint(props: BezierPointProps) {
  const bus = base<TheTypesOfEvents>();

  const { point, from, to, circle, start = false, end = false, virtual = true, mirror } = props;

  let _point = point;
  let _from = from;
  let _to = to;
  let _mirror = mirror || BezierPointMirrorTypes.Angle;
  /** 表示还在移动，没有确定终点坐标 */
  let _virtual = virtual;
  /** 表示隐藏，不绘制 */
  let _hidden = false;
  if (_mirror === BezierPointMirrorTypes.MirrorAngleAndLength && _from && !_to) {
    const symPoint = findSymmetricPoint({ x: point.x, y: point.y }, _from);
    _to = Point(symPoint);
  }
  if (_mirror === BezierPointMirrorTypes.MirrorAngleAndLength && _to && !_from) {
    const symPoint = findSymmetricPoint({ x: point.x, y: point.y }, _to);
    _from = Point(symPoint);
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
      _from.moveTo(
        {
          x: _from.x + v.dx,
          y: _from.y + v.dy,
        },
        { silence: true }
      );
    }
    if (_to) {
      _to.moveTo(
        {
          x: _to.x + v.dx,
          y: _to.y + v.dy,
        },
        { silence: true }
      );
    }
  });
  if (_mirror === BezierPointMirrorTypes.MirrorAngleAndLength) {
    const f = _from;
    const t = _to;
    if (f && t) {
      f.onMove((v) => {
        const symPoint = findSymmetricPoint({ x: _point.x, y: _point.y }, f);
        t.moveTo({ x: symPoint.x, y: symPoint.y }, { silence: true });
      });
      f.onMove((v) => {
        const symPoint = findSymmetricPoint({ x: _point.x, y: _point.y }, t);
        f.moveTo({ x: symPoint.x, y: symPoint.y }, { silence: true });
      });
    }
  }

  return {
    SymbolTag: "BezierPoint" as const,
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
    setTo(point: Point) {
      _to = point;
      const t = _to;
      // console.log("[BIZ]path_point/index - setTo", _mirror, t);
      if (_mirror === BezierPointMirrorTypes.MirrorAngleAndLength) {
        const symPoint = findSymmetricPoint({ x: _point.x, y: _point.y }, t);
        _from = Point({
          x: symPoint.x,
          y: symPoint.y,
        });
        // const t = _to;
        const f = _from;
        f.onMove(() => {
          const symPoint = findSymmetricPoint({ x: _point.x, y: _point.y }, f);
          t.moveTo({ x: symPoint.x, y: symPoint.y }, { silence: true });
        });
        t.onMove(() => {
          const symPoint = findSymmetricPoint({ x: _point.x, y: _point.y }, t);
          f.moveTo({ x: symPoint.x, y: symPoint.y }, { silence: true });
        });
      }
      bus.emit(Events.ToOrFromChange);
    },
    setFrom(
      point: Point,
      extra: Partial<{
        // 复制一个新的点，而不是使用传入的引用
        copy: boolean;
      }> = {}
    ) {
      _from = point;
      if (extra.copy) {
        _from = Point({
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
      // console.log("[BIZ]path_point - setClosed");
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
    setMirror(type: BezierPointMirrorTypes, extra: Partial<{ silence: boolean }> = {}) {
      const { silence = true } = extra;
      const cur = _mirror;
      if (cur === type) {
        return;
      }
      _mirror = type;
      if (silence) {
        return;
      }
      if (type === BezierPointMirrorTypes.MirrorAngleAndLength) {
      }
      if (type === BezierPointMirrorTypes.MirrorAngle) {
        if (cur === BezierPointMirrorTypes.MirrorAngleAndLength) {
          // 之前是完全对称，改成角度对称，不用任何调整
          return;
        }
      }
      if (type === BezierPointMirrorTypes.NoMirror) {
        return;
      }
      if (type === BezierPointMirrorTypes.Angle) {
        _from = null;
        _to = null;
        bus.emit(Events.ToOrFromChange);
        return;
      }
    },
    state: _state,
    deletePoint(point: Point) {
      if (_from === point) {
        _from = null;
        _mirror = BezierPointMirrorTypes.NoMirror;
      }
      if (_to === point) {
        _to = null;
        _mirror = BezierPointMirrorTypes.NoMirror;
      }
    },
    /** 移动指定距离 */
    startMove(pos: { x: number; y: number }) {
      _point.startMove(pos);
      if (_from) {
        _from.startMove(pos);
      }
      if (_to) {
        _to.startMove(pos);
      }
    },
    /** 移动指定距离 */
    move(distance: { x: number; y: number }) {
      _point.move({
        x: distance.x,
        y: distance.y,
      });
      if (_from) {
        _from.move({
          x: distance.x,
          y: distance.y,
        });
      }
      if (_to) {
        _to.move({
          x: distance.x,
          y: distance.y,
        });
      }
    },
    finishMove(pos: { x: number; y: number }) {
      _point.finishMove(pos);
      if (_from) {
        _from.finishMove(pos);
      }
      if (_to) {
        _to.finishMove(pos);
      }
    },
    onToOrFromChange(handler: Handler<TheTypesOfEvents[Events.ToOrFromChange]>) {
      return bus.on(Events.ToOrFromChange, handler);
    },
  };
}

export type BezierPoint = ReturnType<typeof BezierPoint>;
