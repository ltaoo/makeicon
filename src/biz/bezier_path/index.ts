// @ts-ignore
// import { Bezier } from "bezier-js";
import { Bezier } from "@/utils/bezier/bezier";

import { base } from "@/domains/base";
import { PathPoint } from "@/biz/path_point";
import { BezierPoint } from "@/biz/bezier_point";

enum Events {
  Move,
}
type TheTypesOfEvents = {
  [Events.Move]: { x: number; y: number };
};

type BezierPathProps = {
  points: PathPoint[];
  closed: boolean;
};

export function BezierPath(props: BezierPathProps) {
  const { points } = props;

  const bus = base<TheTypesOfEvents>();

  function mapToBezierPoints(points: PathPoint[]) {
    return points.reduce((t, c) => {
      const points: BezierPoint[] = [c.point];
      if (c.from) {
        points.push(c.from);
      }
      if (c.to) {
        points.push(c.to);
      }
      return t.concat(points).filter(Boolean);
    }, [] as BezierPoint[]);
  }

  let _path_points = points;
  let _bezier_points = mapToBezierPoints(_path_points);
  const _state = {};

  return {
    get points() {
      return _bezier_points;
    },
    // 应该提供绘图的命令，而不是具体的实例
    get skeleton() {
      return _path_points;
    },
    get start() {
      return _path_points[0] ?? null;
    },
    get state() {
      return _state;
    },
    getCurPoint() {
      return _path_points[_path_points.length - 1] ?? null;
    },
    getPrevPoint(point: PathPoint) {
      const index = _path_points.findIndex((p) => p === point);
      if (index === -1) {
        return null;
      }
      return _path_points[index - 1] ?? null;
    },
    findPathPointByPoint(point: BezierPoint) {
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
    deletePoint(point: BezierPoint) {
      const matched = this.findPathPointByPoint(point);
      if (!matched) {
        return;
      }
      if (matched.point === point) {
        return;
      }
      matched.deletePoint(point);
    },
    removeLastPoint() {
      _path_points = _path_points.slice(0, -1);
    },
    appendPoint(point: PathPoint) {
      const prev = _path_points[_path_points.length - 1];
      if (prev) {
        prev.setEnd(false);
      }
      point.setEnd(true);
      _path_points.push(point);
      _bezier_points.push(...mapToBezierPoints(_path_points));
    },
    buildOutline(options: Partial<{ width: number; cap: "round" | "none" | "rect"; scene: number }> = {}): {
      outline: { points: { x: number; y: number }[]; _linear: boolean }[];
    } {
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
              const curve1 = new Bezier(
                [
                  cur.point.x,
                  cur.point.y,
                  cur.to ? cur.to.x : cur.point.x,
                  cur.to ? cur.to.y : cur.point.y,
                  next.from ? next.from.x : null,
                  next.from ? next.from.y : null,
                  next.point.x,
                  next.point.y,
                ].filter(Boolean)
              );
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
                  forward_path.push({
                    points: [prev_last_forward_points[0], forward_intersection, forward_intersection],
                    _linear: true,
                    _3d: false,
                  });
                  tmp_forward.unshift({
                    points: [forward_intersection, cur_first_forward_points[0], cur_first_forward_points[0]],
                    _linear: true,
                    _3d: false,
                  });
                } else {
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
              if (scene === 1) {
                console.log("has back_intersection", curve);
                // console.log("has back_intersection", prev_first_back_points, cur_last_back_points, back_intersection);
              }
              if (curve) {
                const matched = tmp_back[curve.index];
                if (matched) {
                  tmp_back = tmp_back.slice(0, curve.index + 1);
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
            if (scene === 1) {
              console.log("before join forward path", tmp_forward);
            }
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
          const [tl2, tr2] = getHalfCirclePoints(start_cap.points[0], start_cap.points[1], start_cap.points[2]);
          outline.push(tl2);
          outline.push(tr2);
        }
      }
      outline = [...outline, ...forward_path];
      if (end_cap) {
        // console.log("end_cap", end_cap.points);
        if (cap === "round") {
          const [tl1, tr1] = getHalfCirclePoints(end_cap.points[0], end_cap.points[1], end_cap.points[2]);
          outline.push(tl1);
          outline.push(tr1);
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
    getCommands() {
      const commands: {
        c: string;
        a: number[];
      }[] = [];
      // console.log("[BIZ]bezier_path/index - getCommands", _path_points.length, _bezier_points.length);
      for (let i = 0; i < _path_points.length; i += 1) {
        const cur = _path_points[i];
        const prev = _path_points[i - 1];
        const next = _path_points[i + 1];
        if (cur.start) {
          commands.push({
            c: "M",
            a: [cur.x, cur.y],
          });
        }
        (() => {
          if (cur.hidden) {
            return;
          }
          if (prev && prev.to && cur.from) {
            // 说明是一条曲线
            commands.push({
              c: "C",
              a: [prev.to.x, prev.to.y, cur.from.x, cur.from.y, cur.x, cur.y],
            });
            return;
          }
          // if (cur.to && next && next.from) {
          //   // 说明是一条曲线
          //   commands.push({
          //     c: "C",
          //     a: [cur.to.x, cur.to.y, next.from.x, next.from.y, next.x, next.y],
          //   });
          //   return;
          // }
          // 一条直线
          commands.push({
            c: "L",
            a: [cur.x, cur.y],
          });
        })();
      }
      // const buildOutline
      return commands;
    },
    handleMove() {},
  };
}

export type BezierPath = ReturnType<typeof BezierPath>;

function pushIfNoExisting<T>(arr: T[], v: T) {
  if (arr.includes(v)) {
    return arr;
  }
  return arr.push(v);
}
/**
 * 已知两个点，获取连接成线后，垂直该线，并经过 a1，长度为 a1,a2 的 ratio 倍的线的终点坐标
 * 会有两个，一上一下
 */
function getVerticalPoints(a1: { x: number; y: number }, a2: { x: number; y: number }, ratio: number) {
  const dx = a2.x - a1.x;
  const dy = a2.y - a1.y;
  const length_a1a2 = Math.sqrt(dx * dx + dy * dy);
  const length_line1 = ratio * length_a1a2;
  const unit_perpendicular = { x: -dy / length_a1a2, y: dx / length_a1a2 };
  const line1_end_up = {
    x: a1.x + unit_perpendicular.x * length_line1,
    y: a1.y + unit_perpendicular.y * length_line1,
  };
  const line1_end_down = {
    x: a1.x - unit_perpendicular.x * length_line1,
    y: a1.y - unit_perpendicular.y * length_line1,
  };
  return [line1_end_up, line1_end_down];
}
/**
 * 根据给定的三个在一条直线上的点，获取以该直线为直径的，构成圆的四条贝塞尔曲线
 */

export function getHalfCirclePoints(
  f1: { x: number; y: number },
  f5: { x: number; y: number },
  f3: { x: number; y: number }
) {
  const c_ratio = 0.551915024494;
  // 从右往左
  const [rb, rt] = getVerticalPoints(f1, f5, c_ratio);
  const [f2, f4] = getVerticalPoints(f5, f3, 1);
  const [bl, br] = getVerticalPoints(f2, f5, c_ratio);
  const [lt, lb] = getVerticalPoints(f3, f5, c_ratio);
  const [tr, tl] = getVerticalPoints(f4, f5, c_ratio);
  return [
    // new Bezier([f1, rb, br, f2]),
    // new Bezier([f2, bl, lb, f3]),
    // new Bezier([f3, lt, tl, f4]),
    // new Bezier([f4, tr, rt, f1]),
    {
      points: [f1, rb, br, f2],
      _linear: false,
    },
    {
      points: [f2, bl, lb, f3],
      _linear: false,
    },
    {
      points: [f3, lt, tl, f4],
      _linear: false,
    },
    {
      points: [f4, tr, rt, f1],
      _linear: false,
    },
  ];
}

function getOutlineOfRect(cur: PathPoint, next: PathPoint, extra: Partial<{ radius: number }> = {}) {
  const { radius = 20 } = extra;
  const direction = {
    x: next.point.x - cur.point.x,
    y: next.point.y - cur.point.y,
  };
  const length = Math.sqrt(direction.x ** 2 + direction.y ** 2);
  const unitDirection = {
    x: direction.x / length,
    y: direction.y / length,
  };
  const perpendicularDirection = {
    x: -unitDirection.y,
    y: unitDirection.x,
  };
  const offset = {
    x: radius * perpendicularDirection.x,
    y: radius * perpendicularDirection.y,
  };

  // 计算四个坐标
  const a1 = {
    x: cur.point.x + offset.x,
    y: cur.point.y + offset.y,
  };
  const a2 = {
    x: next.point.x + offset.x,
    y: next.point.y + offset.y,
  };
  const a3 = {
    x: cur.point.x - offset.x,
    y: cur.point.y - offset.y,
  };
  const a4 = {
    x: next.point.x - offset.x,
    y: next.point.y - offset.y,
  };
  const a13 = {
    x: (a3.x - a1.x) / 2 + a1.x,
    y: (a3.y - a1.y) / 2 + a1.y,
  };
  const a24 = {
    x: (a4.x - a2.x) / 2 + a2.x,
    y: (a4.y - a2.y) / 2 + a2.y,
  };
  return {
    curves: [
      // new Bezier([a3, a13, a1]),
      // new Bezier([a1, a2, a2]),
      // new Bezier([a2, a24, a4]),
      // new Bezier([a4, a3, a3]),
      {
        points: [a3, a13, a1],
        _linear: true,
      },
      {
        points: [a1, a2, a2],
        _linear: true,
        _3d: false,
      },
      {
        points: [a2, a24, a4],
        _linear: true,
      },
      {
        points: [a4, a3, a3],
        _linear: true,
        _3d: false,
      },
    ],
  };
}

/**
 * 计算两条线段的交点
 */
function getLineIntersection(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  p4: { x: number; y: number }
) {
  const a1 = p2.y - p1.y;
  const b1 = p1.x - p2.x;
  const c1 = a1 * p1.x + b1 * p1.y;
  const a2 = p4.y - p3.y;
  const b2 = p3.x - p4.x;
  const c2 = a2 * p3.x + b2 * p3.y;
  const delta = a1 * b2 - a2 * b1;
  if (delta === 0) {
    return null;
  }
  const intersectionX = (b2 * c1 - b1 * c2) / delta;
  const intersectionY = (a1 * c2 - a2 * c1) / delta;
  return { x: intersectionX, y: intersectionY };
}
function calculateLineLength(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const { x: x1, y: y1 } = p1;
  const { x: x2, y: y2 } = p2;
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  return length;
}
function toFixPoint(pos: { x: number; y: number }) {
  return {
    x: parseFloat(pos.x.toFixed(2)),
    y: parseFloat(pos.y.toFixed(2)),
  };
}
function toFixValue(v: number) {
  return parseFloat(v.toFixed(2));
}
