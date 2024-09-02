// @ts-ignore
import { Bezier } from "bezier-js";
// import { Bezier } from "@/utils/bezier/bezier";

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
    buildOutline(cap: "none" | "round") {
      //  const shapes1 = curve1.outline(20);
      // const forward_path: { x: number; y: number }[][] = [];
      const forward_path: Bezier[] = [];
      // const curve: { x: number; y: number }[][] = [];
      const back_path: Bezier[] = [];
      let start_cap: Bezier | null = null;
      let end_cap: Bezier | null = null;
      for (let i = 0; i < _path_points.length; i += 1) {
        const cur = _path_points[i];
        // const prev = _path_points[i - 1];
        const next = _path_points[i + 1];
        (() => {
          if (next && !next.virtual) {
            // console.log(cur.point.x, cur.point.y);
            const curve1 = new Bezier([
              cur.point.x,
              cur.point.y,
              cur.to ? cur.to.x : cur.point.x,
              cur.to ? cur.to.y : cur.point.y,
              next.from ? next.from.x : next.point.x,
              next.from ? next.from.y : next.point.y,
              next.point.x,
              next.point.y,
            ]);
            // curve.push([cur.point, cur.to || { x: 0, y: 0 }, next.from || { x: 0, y: 0 }, cur.point]);
            // curve.push(curve1.points);
            const lines = curve1.outline(20);
            // console.log(lines);
            // forward_path.push(...lines.curves);
            let k = 0;
            if (cur.start) {
              start_cap = lines.curves[k];
            }
            k += 1;
            let is_forward = true;
            while (k < lines.curves.length) {
              const curve = lines.curves[k];
              if (curve._3d === undefined) {
                is_forward = false;
                end_cap = curve;
                break;
                // return;
              }
              if (is_forward) {
                forward_path.push(curve);
              }
              k += 1;
            }
            let j = lines.curves.length - 1;
            while (j > k) {
              const curve = lines.curves[j];
              if (!is_forward) {
                back_path.unshift(curve);
              }
              j -= 1;
            }
            return;
          }
        })();
      }
      // const outline = forward_path;
      let outline = [];
      if (start_cap) {
        // console.log("start_cap", start_cap.points);
        const [tl2, tr2] = getHalfCirclePoints(start_cap.points[0], start_cap.points[1], start_cap.points[2]);
        outline.push(tl2);
        outline.push(tr2);
      }
      outline = [...outline, ...forward_path];
      if (end_cap) {
        // console.log("end_cap", end_cap.points);
        const [tl1, tr1] = getHalfCirclePoints(end_cap.points[0], end_cap.points[1], end_cap.points[2]);
        outline.push(tl1);
        outline.push(tr1);
      }
      outline = [...outline, ...back_path];
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
    {
      points: [f1, rb, br, f2],
    },
    {
      points: [f2, bl, lb, f3],
    },
    {
      points: [f3, lt, tl, f4],
    },
    {
      points: [f4, tr, rt, f1],
    },
  ];
}
