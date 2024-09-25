/**
 * @file 由多条贝塞尔曲线构成的一条路径
 * 用画画来比喻，就是从落笔到收笔绘制的这条线。落笔后，可以画直线，停顿，再画曲线，停顿，再画曲线，直到收笔
 * 那这些停顿过程绘制的一段一段的线，这里称为 segment（后面发现可以叫 Curve）
 * > 当然可以一笔画直线不停顿继续画曲线，但是在计算机里面不可以
 */
import { base, Handler } from "@/domains/base";
import { BezierPoint } from "@/biz/bezier_point";
import { Point } from "@/biz/point";
import {
  calculateLineLength,
  buildFourCurveOfCircle,
  getOutlineOfRect,
  getLineIntersection,
  toFixPoint,
  isCollinear,
  calculateCircleCenter,
  calculateCircleArcs,
  distanceOfPoints,
} from "@/biz/bezier_point/utils";
import { Bezier } from "@/utils/bezier/bezier";

import { PathSegment } from "./segment";

// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linecap
export type LineCapType = "butt" | "round" | "square";
// export type LineJoinType = "miter" | "round" | "bevel" | "miter-clip" | "arcs";
// https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D/lineJoin 只能通过 outline 模拟描边+join样式，才能支持更强的 join 效果
export type LineJoinType = "round" | "bevel" | "miter";
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
export type PathCompositeOperation = "source-over" | "destination-out";

enum Events {
  Move,
  PointCountChange,
  Change,
}
type BezierPathProps = {
  // beziers: Bezier[];
  points: BezierPoint[];
  closed?: boolean;
};

export function LinePath(props: BezierPathProps) {
  const { points } = props;

  function refresh_bezier_points() {
    _bezier_points = mapToBezierPoints(_path_points);
  }
  function mapToBezierPoints(points: BezierPoint[]) {
    return points.reduce((t, c) => {
      const points: Point[] = [c.point];
      if (c.from) {
        points.push(c.from);
      }
      if (c.to) {
        points.push(c.to);
      }
      return t.concat(points).filter(Boolean);
    }, [] as Point[]);
  }

  let _path_points = points;
  let _bezier_points = mapToBezierPoints(_path_points);
  let _segments: PathSegment[] = [];
  let _closed = false;
  let _clockwise = true;
  let _composite = "source-over" as PathCompositeOperation;
  let _min_x = 0;
  let _min_y = 0;
  let _max_x = 0;
  let _max_y = 0;
  const first = points[0];
  if (first) {
    const { x, y } = first.point.pos;
    _max_x = x;
    _max_y = y;
    _min_x = x;
    _min_y = y;
  }
  /** 一个 <path d="" 标签中，可能有多条路径，该变量指向下一条在同个标签内的路径 */
  let _next: unknown | null = null;
  let _prev: unknown | null = null;
  const _state = {};
  type TheTypesOfEvents = {
    [Events.Move]: { x: number; y: number };
    [Events.PointCountChange]: void;
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();

  return {
    SymbolTag: "LinePath" as const,
    get points() {
      return _bezier_points;
    },
    get path_points() {
      return _path_points;
    },
    // 应该提供绘图的命令，而不是具体的实例
    get skeleton() {
      return _path_points;
    },
    get start_point() {
      return _path_points[0] ?? null;
    },
    get closed() {
      return _closed;
    },
    setClosed() {
      _closed = true;
    },
    get clockwise() {
      return _clockwise;
    },
    setClockWise(v: boolean) {
      _clockwise = v;
    },
    get composite() {
      return _composite;
    },
    setComposite(v: PathCompositeOperation) {
      _composite = v;
    },
    get next() {
      const r = _next as LinePath;
      return r;
    },
    setNext(v: unknown) {
      _next = v;
    },
    get prev() {
      const r = _prev as LinePath;
      return r;
    },
    setPrev(v: unknown) {
      _prev = v;
    },
    get size() {
      return {
        x: _min_x,
        y: _min_y,
        width: Math.abs(_max_x - _min_x),
        height: Math.abs(_max_y - _min_y),
        x2: _max_x,
        y2: _max_y,
      };
    },
    isInnerOf(b: unknown) {
      const other = b as LinePath;
      const cur_size = this.size;
      const prev_size = other.size;
      // console.log("cur size compare with prev_size", cur_size, prev_size);
      if (
        cur_size.x > prev_size.x &&
        cur_size.y > prev_size.y &&
        cur_size.x2 < prev_size.x2 &&
        cur_size.y2 < prev_size.y2
      ) {
        return true;
      }
      return false;
    },
    get state() {
      return _state;
    },
    get segments() {
      return _segments;
    },
    /** 获取路径上最后一个坐标点 */
    getCurPoint() {
      return _path_points[_path_points.length - 1] ?? null;
    },
    getPrevPoint(point: BezierPoint) {
      const index = _path_points.findIndex((p) => p === point);
      if (index === -1) {
        return null;
      }
      return _path_points[index - 1] ?? null;
    },
    getLastPoint() {
      return _path_points[_path_points.length - 1] ?? null;
    },
    findBezierPointByPoint(point: Point) {
      for (let i = 0; i < _path_points.length; i += 1) {
        const path_point = _path_points[i];
        if (path_point.point === point) {
          return path_point;
        }
        if (path_point.from === point) {
          return path_point;
        }
        if (path_point.to === point) {
          return path_point;
        }
      }
      return null;
    },
    deletePoint(point: Point) {
      const matched = this.findBezierPointByPoint(point);
      if (!matched) {
        // @todo 删除坐标点，等于将一条路径，拆分成多条
        return;
      }
      if (matched.point === point) {
        return;
      }
      matched.deletePoint(point);
    },
    removeLastVirtualPoint() {
      const last = _path_points[_path_points.length - 1];
      // console.log("[BIZ]bezier_path removeLastVirtualPoint", last?.point.pos, last?.virtual);
      if (!last) {
        return;
      }
      if (last.virtual === false) {
        return;
      }
      // console.log("[BIZ]bezier_path before _path_points.filter", last.virtual);
      _path_points = _path_points.filter((p) => p !== last);
      refresh_bezier_points();
      bus.emit(Events.PointCountChange);
    },
    removeLastPoint() {
      const last = _path_points[_path_points.length - 1];
      if (!last) {
        return;
      }
      // if (last.virtual === false) {
      //   return;
      // }
      // console.log("[BIZ]bezier_path/index - removeLastPoint", last.uid, last.point.pos, last.virtual);
      _path_points = _path_points.filter((p) => p !== last);
      refresh_bezier_points();
      bus.emit(Events.PointCountChange);
    },
    ensureSegment() {
      // const last = _segments[_segments.length - 1];
      // console.log("[BIZ]path/index - ensureSegment", last);
      // if (last) {
      //   last.ensure();
      // }
      let end = _path_points[_path_points.length - 1];
      let start = _path_points[_path_points.length - 2];
      if (start && end) {
        const segment = PathSegment({ start: start.point, end: end.point });
        _segments.push(segment);
        if (start.to && end.from) {
          segment.setControls(start.to, end.from);
        }
        segment.ensure();
      }
    },
    /**
     * 存入了一个锚点，其实就是创建了一条曲线
     */
    appendPoint(point: BezierPoint) {
      const prev = _path_points[_path_points.length - 1];
      console.log("[BIZ]path/index - appendPoint", !!prev);
      if (prev) {
        prev.setEnd(false);
      }
      point.setEnd(true);
      point.onToOrFromChange(() => {
        refresh_bezier_points();
        bus.emit(Events.PointCountChange);
      });
      _path_points.push(point);
      refresh_bezier_points();
      const { x, y } = point.point.pos;
      // console.log("append point", point.start, x, y);
      if (point.start) {
        _max_x = x;
        _max_y = y;
        _min_x = x;
        _min_y = y;
      }
      if (x < _min_x) {
        _min_x = x;
      }
      if (y < _min_y) {
        _min_y = y;
      }
      if (x > _max_x) {
        _max_x = x;
      }
      if (y > _max_y) {
        _max_y = y;
      }
      // _bezier_points.push(...mapToBezierPoints(_path_points));
      bus.emit(Events.PointCountChange);
    },
    checkIsClosed() {
      const first_path_point = _path_points[0];
      const last_path_point = _path_points[_path_points.length - 1];
      // console.log("[BIZ]bezier_path - checkIsClosed", first_path_point.point.pos, last_path_point.point.pos);
      if (first_path_point && last_path_point) {
        if (distanceOfPoints(first_path_point.point.pos, last_path_point.point.pos) <= 0.1) {
          first_path_point.setEnd(true);
          return true;
        }
      }
      return false;
    },
    startMove(pos: { x: number; y: number }) {
      for (let i = 0; i < _path_points.length; i += 1) {
        const point = _path_points[i];
        point.startMove(pos);
      }
    },
    move(distance: { x: number; y: number }) {
      for (let i = 0; i < _path_points.length; i += 1) {
        const point = _path_points[i];
        point.move(distance);
      }
    },
    finishMove(pos: { x: number; y: number }) {
      for (let i = 0; i < _path_points.length; i += 1) {
        const point = _path_points[i];
        point.finishMove(pos);
      }
    },
    buildBox() {
      const rect = {
        x: 0,
        y: 0,
        x1: 0,
        y1: 0,
      };
      console.log("[BIZ]path/index - buildBox", _segments.length);
      for (let i = 0; i < _segments.length; i += 1) {
        const box = _segments[i].box();
        if (box) {
          (() => {
            const { min, max } = box.x;
            if (rect.x === 0 || rect.x > min) {
              rect.x = min;
            }
            if (rect.x1 === 0 || rect.x1 < max) {
              rect.x1 = max;
            }
          })();
          (() => {
            const { min, max } = box.y;
            if (rect.y === 0 || rect.y > min) {
              rect.y = min;
            }
            if (rect.y1 === 0 || rect.y1 < max) {
              rect.y1 = max;
            }
          })();
        }
      }
      return rect;
    },
    buildOutline(options: Partial<{ width: number; cap: LineCapType; scene: number }> = {}) {
      const { cap = "round", width = 20, scene } = options;
      //  const shapes1 = curve1.outline(20);
      // const forward_path: { x: number; y: number }[][] = [];
      let forward_path: Bezier[] = [];
      // const curve: { x: number; y: number }[][] = [];
      let back_path: Bezier[] = [];
      let start_cap: Bezier | null = null;
      let end_cap: Bezier | null = null;
      let prev_linear: {
        // curve: Bezier;
        forward: Bezier[];
        back: Bezier[];
      } | null = null;
      // console.log("[BIZ]bezier_path - buildOutline before i < _path_points.length;", _path_points);
      for (let i = 0; i < _path_points.length; i += 1) {
        const cur = _path_points[i];
        // const prev = _path_points[i - 1];
        const next = _path_points[i + 1];
        let is_linear = false;
        (() => {
          // console.log("[BIZ]bezier_path - buildOutline before next && !next.virtual", next && !next.virtual);
          if (next && !next.virtual) {
            // console.log("[BIZ]bezier_path - buildOutline after new Bezier");
            // curve.push([cur.point, cur.to || { x: 0, y: 0 }, next.from || { x: 0, y: 0 }, cur.point]);
            // curve.push(curve1.points);
            const outline = (() => {
              if (!cur.to && !next.from) {
                is_linear = true;
                // 直线
                const outline = getOutlineOfRect(cur, next, { radius: width });
                return outline;
              }
              // console.log(cur.point.x, cur.point.y);
              // console.log("[BIZ]bezier_path - buildOutline before new Bezier");
              // @ts-ignore
              const points: { x: number; y: number }[] = [
                cur.point,
                cur.to ? cur.to : cur.point,
                next.from ? next.from : null,
                next.point,
              ].filter(Boolean);
              const curve1 = new Bezier(points);
              return curve1.outline(width);
            })();
            if (scene === 1) {
              console.log("cur line is linear?", is_linear);
            }
            let k = 0;
            if (cur.start) {
              start_cap = outline.curves[k];
            }
            k += 1;
            let is_forward = true;
            let tmp_forward: Bezier[] = [];
            let tmp_back: Bezier[] = [];
            while (k < outline.curves.length) {
              const curve = outline.curves[k];
              if (curve._3d === undefined) {
                is_forward = false;
                end_cap = curve;
                break;
                // return;
              }
              if (is_forward) {
                tmp_forward.push(curve);
              }
              k += 1;
            }
            let j = outline.curves.length - 1;
            while (j > k) {
              const curve = outline.curves[j];
              if (!is_forward) {
                // back_path.unshift(curve);
                tmp_back.unshift(curve);
              }
              j -= 1;
            }
            if (scene === 1) {
              console.log("prev line is linear?", prev_linear);
            }
            if (prev_linear) {
              // 如果前一条是直线，就要处理相连点了
              const prev_last_forward = prev_linear.forward[prev_linear.forward.length - 1];
              const cur_first_forward = tmp_forward[0];
              const prev_last_forward_points = prev_last_forward.points;
              const cur_first_forward_points = cur_first_forward.points;
              const forward_intersection = getLineIntersection(
                prev_last_forward_points[1],
                prev_last_forward_points[0],
                cur_first_forward_points[0],
                cur_first_forward_points[1]
              );
              if (forward_intersection) {
                const l1 = calculateLineLength(prev_last_forward_points[0], prev_last_forward_points[1]);
                const l2 = calculateLineLength(prev_last_forward_points[1], forward_intersection);
                if (l2 <= l1 * 0.3) {
                  // @ts-ignore
                  forward_path.push({
                    points: [prev_last_forward_points[0], forward_intersection, forward_intersection],
                    _linear: true,
                    _3d: false,
                  });
                  // @ts-ignore
                  tmp_forward.unshift({
                    points: [forward_intersection, cur_first_forward_points[0], cur_first_forward_points[0]],
                    _linear: true,
                    _3d: false,
                  });
                } else {
                  // @ts-ignore
                  tmp_forward.unshift({
                    points: [prev_last_forward_points[0], cur_first_forward_points[0], cur_first_forward_points[0]],
                    _linear: true,
                    _3d: false,
                  });
                }
                // prev_last_forward_points[2] = prev_last_forward_points[1] = forward_intersection;
                // cur_first_forward_points[0] = forward_intersection;
              }
              // 计算反面相交点
              const prev_first_back = prev_linear.back[0];
              const prev_first_back_points = prev_first_back.points;
              const curve = (() => {
                let z = tmp_back.length - 1;
                while (z >= 0) {
                  const b = tmp_back[z];
                  if (typeof b.intersects === "function") {
                    // 是曲线
                    // if (scene === 1) {
                    //   debugger;
                    // }
                    b.points = b.points.map((p: { x: number; y: number }) => toFixPoint(p));
                    const t = b.intersects({
                      p1: prev_first_back_points[0],
                      p2: prev_first_back_points[1],
                    });
                    if (scene === 1) {
                      console.log("cur is curves, find intersection", t, b.points, prev_first_back_points);
                    }
                    if (t.length !== 0) {
                      const p = b.get(t[0]);
                      // console.log(p);
                      const part = b.split(0, t[0]);
                      return { index: z, intersection: p, curve: part };
                    }
                  } else {
                    // 是直线
                    const back_intersection = getLineIntersection(
                      prev_first_back_points[1],
                      prev_first_back_points[0],
                      b.points[0],
                      b.points[1]
                    );
                    if (back_intersection) {
                      b.points[1] = b.points[2] = back_intersection;
                      return {
                        index: z,
                        intersection: back_intersection,
                        curve: b,
                      };
                    }
                  }
                  z -= 1;
                }
                return null;
              })();
              // if (scene === 1) {
              // console.log("has back_intersection", curve);
              // console.log("has back_intersection", prev_first_back_points, cur_last_back_points, back_intersection);
              // }
              if (curve) {
                const matched = tmp_back[curve.index];
                if (matched) {
                  tmp_back = tmp_back.slice(0, curve.index + 1);
                  // @ts-ignore
                  matched.points = curve.curve.points;
                  prev_first_back_points[0] = matched.points[0];
                }
              }
              prev_linear = null;
            }
            if (is_linear) {
              prev_linear = {
                forward: tmp_forward,
                back: tmp_back,
              };
            }
            // if (scene === 1) {
            //   console.log("before join forward path", tmp_forward);
            // }
            forward_path = [...forward_path, ...tmp_forward];
            back_path = [...tmp_back, ...back_path];
            return;
          }
        })();
      }
      // const outline = forward_path;
      let outline: Bezier[] = [];
      if (start_cap) {
        // console.log("start_cap", start_cap.points);
        if (cap === "round") {
          const [tl2, tr2] = buildFourCurveOfCircle(start_cap.points[0], start_cap.points[1], start_cap.points[2]);
          outline.push(tl2);
          outline.push(tr2);
        }
        if (cap === "butt") {
          outline.push(start_cap);
        }
      }
      outline = [...outline, ...forward_path];
      if (end_cap) {
        // console.log("end_cap", end_cap.points);
        if (cap === "round") {
          const [tl1, tr1] = buildFourCurveOfCircle(end_cap.points[0], end_cap.points[1], end_cap.points[2]);
          outline.push(tl1);
          outline.push(tr1);
        }
        if (cap === "butt") {
          outline.push(end_cap);
        }
      }
      outline = [...outline, ...back_path];
      // console.log("out lines", outline);
      // for (let i = 0; i < outline.length; i += 1) {
      //   const curve = outline[i];
      //   const next = outline[i + 1];
      //   (() => {
      //     if (!next) {
      //       return;
      //     }
      //     if (curve._linear && next._linear) {

      //     }
      //   })();
      // }
      return {
        // curve,
        outline,
      };
    },
    // buildCommands() {
    //   const commands: {
    //     c: string;
    //     a: number[];
    //     a2?: number[];
    //     end: null | { x: number; y: number };
    //     start: null | { x: number; y: number };
    //   }[] = [];
    //   for (let i = 0; i < _segments.length; i += 1) {}
    // },
    buildCommands() {
      const commands: {
        c: string;
        a: number[];
        a2?: number[];
        end: null | { x: number; y: number };
        start: null | { x: number; y: number };
      }[] = [];
      // console.log("[BIZ]bezier_path/index - getCommands", _path_points);
      let is_closed: null | BezierPoint = null;
      for (let i = 0; i < _path_points.length; i += 1) {
        const prev = _path_points[i - 1];
        const cur = _path_points[i];
        const next = _path_points[i + 1];
        if (cur.start) {
          if (cur.end) {
            is_closed = cur;
          }
          commands.push({
            c: "M",
            a: [cur.x, cur.y],
            end: prev ? prev.point.pos : null,
            start: null,
          });
        }
        (() => {
          if (cur.hidden) {
            return;
          }
          if (prev) {
            if (prev.to && cur.from) {
              // 三次贝塞尔
              commands.push({
                c: "C",
                a: [prev.to.x, prev.to.y, cur.from.x, cur.from.y, cur.x, cur.y],
                end: prev ? prev.point.pos : null,
                start: next && !next.from ? cur.point.pos : null,
              });
              return;
            }
            if (!prev.to && cur.from) {
              // 二次贝塞尔
              commands.push({
                c: "Q",
                a: [cur.from.x, cur.from.y, cur.point.x, cur.point.y],
                end: prev ? prev.point.pos : null,
                start: next && !next.from ? cur.point.pos : null,
              });
              return;
            }
          }
          if (cur.circle) {
            // 弧线
            // console.log("[BIZ]bezier_path - index - after if (cur.circle", cur.circle.center, cur.circle.arc);
            const { counterclockwise, extra } = cur.circle;
            commands.push({
              c: "A",
              // 这个是给 canvas 绘制
              a: [
                cur.circle.center.x,
                cur.circle.center.y,
                cur.circle.radius,
                counterclockwise ? cur.circle.arc.end : cur.circle.arc.start,
                counterclockwise ? cur.circle.arc.start : cur.circle.arc.end,
                Number(counterclockwise),
              ],
              // 这个是给 SVG 绘制
              a2: [
                // extra.start.x,
                // extra.start.y,
                extra.rx,
                extra.ry,
                extra.rotate,
                extra.t1,
                extra.t2,
                cur.point.pos.x,
                cur.point.pos.y,
              ],
              end: next && next.from ? cur.point.pos : null,
              start: extra.start,
            });
            return;
          }
          if (prev && !prev.to && !cur.from) {
            // 直线
            commands.push({
              c: "L",
              a: [cur.x, cur.y],
              end: prev ? prev.point.pos : null,
              start: null,
            });
            return;
          }
        })();
        if (!next && is_closed) {
          if (cur.to && is_closed.from) {
            // 比如 起点，一条曲线，然后再一条曲线直接回到起点，形成闭合
            // 那么作为最后一个点，是没有 next，但是路径又闭合了，此时是还需要一条路径的
            commands.push({
              c: "C",
              a: [cur.to.x, cur.to.y, is_closed.from.x, is_closed.from.y, is_closed.point.x, is_closed.point.y],
              end: prev ? prev.point.pos : null,
              start: null,
            });
          }
          if (!cur.to && !is_closed.from) {
            commands.push({
              c: "L",
              a: [is_closed.point.x, is_closed.point.y],
              end: prev ? prev.point.pos : null,
              start: null,
            });
          }
          commands.push({
            c: "Z",
            a: [],
            end: prev ? prev.point.pos : null,
            start: null,
          });
        }
      }
      // const buildOutline
      // console.log("before return commands", commands);
      return commands;
    },
    onPointCountChange(handler: Handler<TheTypesOfEvents[Events.PointCountChange]>) {
      return bus.on(Events.PointCountChange, handler);
    },
  };
}

export type LinePath = ReturnType<typeof LinePath>;
