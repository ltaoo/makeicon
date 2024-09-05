import { Bezier } from "@/utils/bezier/bezier";

import { PathPoint } from "./index";

export function getSymmetricPoints(point2: { x: number; y: number }, point: { x: number; y: number }) {
  const symmetricPoint = {
    x: 2 * point2.x - point.x,
    y: 2 * point2.y - point.y,
  };
  return symmetricPoint;
}

export function getSymmetricPoint2(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  a3: { x: number; y: number },
  ratio = 1
) {
  // console.log(a1, a2, a3);
  const m1 = {
    x: (a1.x + a2.x) / 2,
    y: (a1.y + a2.y) / 2,
  };
  // console.log("m1", m1);
  // 计算对称点 a4'
  const a4_prime = {
    x: 2 * m1.x - a3.x,
    y: 2 * m1.y - a3.y,
  };
  // console.log("a4_prime", a4_prime);
  // 计算与 m1 到 a4' 的距离
  const d = Math.sqrt((m1.x - a3.x) ** 2 + (m1.y - a3.y) ** 2);
  // 计算点 a4
  const a4 = {
    x: m1.x + ratio * (a4_prime.x - m1.x),
    y: m1.y + ratio * (a4_prime.y - m1.y),
  };
  return a4;
}

const prefix = "data:image/";
const svg = prefix + "svg+xml,";
const space = "%20";
const quotes = "%22";
const equal = "%3D";

export function toBase64(template: string, options: Partial<{ doubleQuote: boolean }> = {}) {
  const { doubleQuote = false } = options;
  // if (template.indexOf(svg) === 0) {
  //   const str = template.replace(new RegExp(svg.replace(/\+/, "\\+")), "").replace(/'/g, '"');
  //   return {
  //     data: decodeURIComponent(str),
  //     input: template,
  //   };
  // }
  if (template.indexOf(prefix) === 0) {
    return template;
  }
  const data = encodeURIComponent(template)
    .replace(new RegExp(space, "g"), " ")
    .replace(new RegExp(quotes, "g"), doubleQuote ? '"' : "'")
    .replace(new RegExp(equal, "g"), "=");
  return svg + data;
}

export function pushIfNoExisting<T>(arr: T[], v: T) {
  if (arr.includes(v)) {
    return arr;
  }
  return arr.push(v);
}

/**
 * 已知两个点，获取连接成线后，垂直该线，并经过 a1，长度为 a1,a2 的 ratio 倍的线的终点坐标
 * 会有两个，一上一下
 */
export function getVerticalPoints(a1: { x: number; y: number }, a2: { x: number; y: number }, ratio: number) {
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
    new Bezier([f1, rb, br, f2]),
    new Bezier([f2, bl, lb, f3]),
    new Bezier([f3, lt, tl, f4]),
    new Bezier([f4, tr, rt, f1]),
    // {
    //   points: [f1, rb, br, f2],
    //   _linear: false,
    // },
    // {
    //   points: [f2, bl, lb, f3],
    //   _linear: false,
    // },
    // {
    //   points: [f3, lt, tl, f4],
    //   _linear: false,
    // },
    // {
    //   points: [f4, tr, rt, f1],
    //   _linear: false,
    // },
  ];
}

export function getOutlineOfRect(
  cur: PathPoint,
  next: PathPoint,
  extra: Partial<{ radius: number }> = {}
): { curves: Bezier[] } {
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
      // @ts-ignore
      {
        points: [a3, a13, a1],
        _linear: true,
      },
      // @ts-ignore
      {
        points: [a1, a2, a2],
        _linear: true,
        _3d: false,
      },
      // @ts-ignore
      {
        points: [a2, a24, a4],
        _linear: true,
      },
      // @ts-ignore
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
export function getLineIntersection(
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
export function calculateLineLength(p1: { x: number; y: number }, p2: { x: number; y: number }) {
  const { x: x1, y: y1 } = p1;
  const { x: x2, y: y2 } = p2;
  const length = Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
  return length;
}
export function toFixPoint(pos: { x: number; y: number }) {
  return {
    x: parseFloat(pos.x.toFixed(2)),
    y: parseFloat(pos.y.toFixed(2)),
  };
}
export function toFixValue(v: number) {
  return parseFloat(v.toFixed(2));
}

/**
 * 计算三个点，是否在一条直线上。以及，a2 是否是该直线的中点
 */
export function isCollinear(a1: { x: number; y: number }, a2: { x: number; y: number }, a3: { x: number; y: number }) {
  const x1 = a1.x;
  const y1 = a1.y;
  const x2 = a2.x;
  const y2 = a2.y;
  const x3 = a3.x;
  const y3 = a3.y;
  // 判断是否共线
  const collinear = (y2 - y1) * (x3 - x2) === (y3 - y2) * (x2 - x1);
  // 判断是否是中点
  // const midpoint = x2 == (x1 + x3) / 2 && y2 == (y1 + y3) / 2;
  const midpoint = x2 - x1 === x3 - x2 && y2 - y1 === y3 - y2;
  return {
    collinear,
    midpoint,
  };
}

/**
 * 已知一个圆的半径，和任意圆上两个点坐标，计算圆心位置
 */
export function calculateCircleCenter(a1: { x: number; y: number }, a2: { x: number; y: number }, r: number) {
  const x1 = a1.x,
    y1 = a1.y,
    x2 = a2.x,
    y2 = a2.y;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const d = Math.sqrt(dx * dx + dy * dy);
  if (d > 2 * r) {
    console.log("The points are too far apart for the given radius.");
    return null;
  }
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const h = Math.sqrt(r * r - (d / 2) * (d / 2));
  const unitX = -dy / d;
  const unitY = dx / d;
  const center1 = { x: mx + h * unitX, y: my + h * unitY };
  const center2 = { x: mx - h * unitX, y: my - h * unitY };
  return [center2, center1];
}

export function calculateCircleArcs(
  center: { x: number; y: number },
  pointA: { x: number; y: number },
  pointB: { x: number; y: number }
) {
  const centerX = center.x,
    centerY = center.y;
  const angleA = Math.atan2(pointA.y - centerY, pointA.x - centerX);
  const angleB = Math.atan2(pointB.y - centerY, pointB.x - centerX);
  const startAngle = angleA;
  let endAngle = angleB;
  if (startAngle > endAngle) {
    endAngle += 2 * Math.PI;
  }
  return [
    {
      start: startAngle,
      end: endAngle,
    },
    {
      start: endAngle,
      end: startAngle + 2 * Math.PI,
    },
  ];
}
