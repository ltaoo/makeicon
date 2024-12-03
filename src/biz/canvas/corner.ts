import { Line } from "@/biz/line";
import { LinePath } from "@/biz/path";
import { BezierPoint, CircleCurved } from "@/biz/bezier_point";
import { Point, PointType } from "@/biz/point";

interface Size {
  width: number;
  height: number;
}

interface HerePoint {
  x: number;
  y: number;
}

interface CornerConfig {
  topLeft: boolean;
  topRight: boolean;
  bottomLeft: boolean;
  bottomRight: boolean;
}

/**
 * 计算超椭圆的参数方程
 * @param t 参数方程的变量 t ∈ [0, 2π]
 * @param a 半长轴
 * @param b 半短轴
 * @param n 光滑度参数（n ≥ 2）
 */
function superellipsePoint(t: number, a: number, b: number, n: number): HerePoint {
  const cosT = Math.cos(t);
  const sinT = Math.sin(t);
  const signCosT = Math.sign(cosT);
  const signSinT = Math.sign(sinT);

  return {
    x: a * signCosT * Math.pow(Math.abs(cosT), 2 / n),
    y: b * signSinT * Math.pow(Math.abs(sinT), 2 / n),
  };
}

/**
 * 计算贝塞尔控制点
 * @param start 起始点
 * @param end 结束点
 * @param smoothness 光滑度 (0-1)
 */
function calculateControlPoints(start: HerePoint, end: HerePoint, smoothness: number): [HerePoint, HerePoint] {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const factor = smoothness * 0.5;

  return [
    {
      x: start.x + dx * factor,
      y: start.y + dy * factor,
    },
    {
      x: end.x - dx * factor,
      y: end.y - dy * factor,
    },
  ];
}

/**
 * 绘制改进的光滑圆角矩形
 * @param ctx Canvas 2D 上下文
 * @param size 矩形尺寸
 * @param radius 圆角半径
 * @param smoothness 光滑度 (0-100)
 * @param posX 中心点X坐标
 * @param posY 中心点Y坐标
 * @param corners 四个角的配置
 * @param isFill 是否填充
 */
export function drawSmoothCorners(
  ctx: CanvasRenderingContext2D,
  size: Size,
  radius: number,
  smoothness: number,
  posX: number,
  posY: number,
  corners: CornerConfig = { topLeft: true, topRight: true, bottomLeft: true, bottomRight: true },
  isFill: boolean = false
): void {
  // 调整位置到左上角
  posX -= size.width / 2;
  posY -= size.height / 2;

  // 限制圆角半径
  const maxRadius = Math.min(size.width, size.height) / 2;
  radius = Math.min(radius, maxRadius);

  // 计算光滑度参数 n (2 ≤ n ≤ 4)
  const n = 2 + (smoothness / 100) * 2;

  // 开始绘制路径
  ctx.beginPath();
  ctx.moveTo(posX + radius, posY);

  // 绘制上边
  if (!corners.topRight) {
    ctx.lineTo(posX + size.width, posY);
  } else {
    const cornerPoints: HerePoint[] = [];
    for (let i = 0; i <= Math.PI / 2; i += Math.PI / 8) {
      const point = superellipsePoint(i, radius, radius, n);
      cornerPoints.push({
        x: posX + size.width - radius + point.x,
        y: posY + radius + point.y,
      });
    }

    ctx.lineTo(posX + size.width - radius, posY);
    for (let i = 1; i < cornerPoints.length - 1; i++) {
      const [cp1, cp2] = calculateControlPoints(cornerPoints[i - 1], cornerPoints[i + 1], smoothness / 100);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, cornerPoints[i].x, cornerPoints[i].y);
    }
  }

  // 绘制右边
  if (!corners.bottomRight) {
    ctx.lineTo(posX + size.width, posY + size.height);
  } else {
    const cornerPoints: HerePoint[] = [];
    for (let i = 0; i <= Math.PI / 2; i += Math.PI / 8) {
      const point = superellipsePoint(i + Math.PI / 2, radius, radius, n);
      cornerPoints.push({
        x: posX + size.width - radius + point.x,
        y: posY + size.height - radius + point.y,
      });
    }

    ctx.lineTo(posX + size.width, posY + size.height - radius);
    for (let i = 1; i < cornerPoints.length - 1; i++) {
      const [cp1, cp2] = calculateControlPoints(cornerPoints[i - 1], cornerPoints[i + 1], smoothness / 100);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, cornerPoints[i].x, cornerPoints[i].y);
    }
  }

  // 绘制下边
  if (!corners.bottomLeft) {
    ctx.lineTo(posX, posY + size.height);
  } else {
    const cornerPoints: HerePoint[] = [];
    for (let i = 0; i <= Math.PI / 2; i += Math.PI / 8) {
      const point = superellipsePoint(i + Math.PI, radius, radius, n);
      cornerPoints.push({
        x: posX + radius + point.x,
        y: posY + size.height - radius + point.y,
      });
    }

    ctx.lineTo(posX + radius, posY + size.height);
    for (let i = 1; i < cornerPoints.length - 1; i++) {
      const [cp1, cp2] = calculateControlPoints(cornerPoints[i - 1], cornerPoints[i + 1], smoothness / 100);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, cornerPoints[i].x, cornerPoints[i].y);
    }
  }

  // 绘制左边
  if (!corners.topLeft) {
    ctx.lineTo(posX, posY);
  } else {
    const cornerPoints: HerePoint[] = [];
    for (let i = 0; i <= Math.PI / 2; i += Math.PI / 8) {
      const point = superellipsePoint(i + (3 * Math.PI) / 2, radius, radius, n);
      cornerPoints.push({
        x: posX + radius + point.x,
        y: posY + radius + point.y,
      });
    }

    ctx.lineTo(posX, posY + radius);
    for (let i = 1; i < cornerPoints.length - 1; i++) {
      const [cp1, cp2] = calculateControlPoints(cornerPoints[i - 1], cornerPoints[i + 1], smoothness / 100);
      ctx.bezierCurveTo(cp1.x, cp1.y, cp2.x, cp2.y, cornerPoints[i].x, cornerPoints[i].y);
    }
  }

  ctx.closePath();

  // 绘制样式
  if (!isFill) {
    ctx.strokeStyle = "rgba(10, 10, 10, 0.7)";
    ctx.lineWidth = 4;
    ctx.stroke();
  } else {
    ctx.fillStyle = "rgba(10, 10, 10, 0.7)";
    ctx.fill();
  }
}

/**
 * 使用 Figma 的方式绘制光滑圆角矩形
 * @param ctx Canvas 2D 上下文
 * @param size 矩形尺寸
 * @param radius 圆角半径
 * @param smoothness 光滑度 (0-100)
 * @param posX 中心点X坐标
 * @param posY 中心点Y坐标
 * @param tl 是否绘制左上角
 * @param tr 是否绘制右上角
 * @param bl 是否绘制左下角
 * @param br 是否绘制右下角
 */
export function drawFigmaSmoothCorners(
  size: Size,
  radius: number,
  smoothness: number,
  posX: number,
  posY: number,
  tl: boolean = true,
  tr: boolean = true,
  bl: boolean = true,
  br: boolean = true
) {
  const ANGLE_TO_RADIANS = Math.PI / 180;
  const shortest_l = Math.min(size.width, size.height);
  const smoothnessRatio = smoothness / 100;

  // 计算关键参数
  let p = Math.min(shortest_l / 2, (1 + smoothnessRatio) * radius);
  let angle_alpha: number;
  let angle_beta: number;

  if (radius > shortest_l / 4) {
    const change_percentage = (radius - shortest_l / 4) / (shortest_l / 4);
    angle_beta = 90 * (1 - smoothnessRatio * (1 - change_percentage));
    angle_alpha = 45 * smoothnessRatio * (1 - change_percentage);
  } else {
    angle_beta = 90 * (1 - smoothnessRatio);
    angle_alpha = 45 * smoothnessRatio;
  }

  const angle_theta = (90 - angle_beta) / 2;
  const d_div_c = Math.tan(angle_alpha * ANGLE_TO_RADIANS);
  const h_longest = radius * Math.tan((angle_theta / 2) * ANGLE_TO_RADIANS);
  const l = Math.sin((angle_beta / 2) * ANGLE_TO_RADIANS) * radius * Math.sqrt(2);
  const c = h_longest * Math.cos(angle_alpha * ANGLE_TO_RADIANS);
  const d = c * d_div_c;
  const b = (p - l - (1 + d_div_c) * c) / 3;
  const a = 2 * b;

  const line = Line({ fill: null });
  const path = LinePath({ points: [] });
  line.append(path);
  // ctx.beginPath();
  const x = posX + size.width / 2;
  const y = posY;
  // ctx.moveTo(x, y);
  // console.log("1 起始点", { x, y });
  path.appendPoint(
    BezierPoint({
      start: true,
      point: Point({ type: PointType.Anchor, x, y }),
      from: null,
      to: null,
    })
  );
  // 绘制右上角
  if (!tr) {
    // ctx.lineTo(posX + size.width, posY);
  } else {
    const x1 = posX + Math.max(size.width / 2, size.width - p);
    const y1 = posY;
    // ctx.lineTo(x1, y1);
    const cx1 = posX + size.width - (p - a);
    const cy1 = posY;
    const cx2 = posX + size.width - (p - a - b);
    const cy2 = posY;
    const x2 = posX + size.width - (p - a - b - c);
    const y2 = posY + d;
    // ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
    path.appendPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: x1, y: y1 }),
        from: null,
        to: Point({ type: PointType.Control, x: cx1, y: cy1 }),
      })
    );
    path.appendPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: x2, y: y2 }),
        from: Point({ type: PointType.Control, x: cx2, y: cy2 }),
        to: null,
      })
    );
    const center = {
      x: posX + size.width - radius,
      y: posY + radius,
    };
    const arc = {
      start: (270 + angle_theta) * ANGLE_TO_RADIANS,
      end: (360 - angle_theta) * ANGLE_TO_RADIANS,
    };
    const arcPoints = {
      start: {
        x: center.x + radius * Math.cos(arc.start),
        y: center.y + radius * Math.sin(arc.start),
      },
      end: {
        x: center.x + radius * Math.cos(arc.end),
        y: center.y + radius * Math.sin(arc.end),
      },
    };
    // ctx.arc(center.x, center.y, radius, arc.start, arc.end, false);
    path.appendPoint(
      BezierPoint({
        circle: {
          center,
          radius,
          arc,
          counterclockwise: false,
          extra: {
            start: arcPoints.start,
            rx: radius,
            ry: radius,
            rotate: 0,
            t1: 0,
            t2: 1,
            end: arcPoints.end,
          },
        } as CircleCurved,
        point: Point({ type: PointType.Anchor, x: 0, y: 0 }),
        from: null,
        to: null,
      })
    );
    const cx3 = posX + size.width;
    const cy3 = posY + (p - a - b);
    const cx4 = posX + size.width;
    const cy4 = posY + (p - a);
    const x4 = posX + size.width;
    const y4 = posY + Math.min(size.height / 2, p);
    // ctx.bezierCurveTo(cx3, cy3, cx4, cy4, x4, y4);
    path.appendPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: arcPoints.end.x, y: arcPoints.end.y }),
        from: null,
        to: Point({ type: PointType.Control, x: cx3, y: cy3 }),
      })
    );
    path.appendPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: x4, y: y4 }),
        from: Point({ type: PointType.Control, x: cx4, y: cy4 }),
        to: null,
      })
    );
  }

  // 绘制右下角
  if (!br) {
    // ctx.lineTo(posX + size.width, posY + size.height);
  } else {
    const x1 = posX + size.width;
    const y1 = posY + Math.max(size.height / 2, size.height - p);
    // ctx.lineTo(x1, y1);
    const cx1 = posX + size.width;
    const cy1 = posY + size.height - (p - a);
    const cx2 = posX + size.width;
    const cy2 = posY + size.height - (p - a - b);
    const x2 = posX + size.width - d;
    const y2 = posY + size.height - (p - a - b - c);
    // ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
    path.appendPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: x1, y: y1 }),
        from: null,
        to: Point({ type: PointType.Control, x: cx1, y: cy1 }),
      })
    );
    path.appendPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: x2, y: y2 }),
        from: Point({ type: PointType.Control, x: cx2, y: cy2 }),
        to: null,
      })
    );
    const center = {
      x: posX + size.width - radius,
      y: posY + size.height - radius,
    };
    const arc = {
      start: (0 + angle_theta) * ANGLE_TO_RADIANS,
      end: (90 - angle_theta) * ANGLE_TO_RADIANS,
    };
    const arcPoints = {
      start: {
        x: center.x + radius * Math.cos(arc.start),
        y: center.y + radius * Math.sin(arc.start),
      },
      end: {
        x: center.x + radius * Math.cos(arc.end),
        y: center.y + radius * Math.sin(arc.end),
      },
    };
    // ctx.arc(center.x, center.y, radius, arc.start, arc.end, false);
    path.appendPoint(
      BezierPoint({
        circle: {
          center,
          radius,
          arc,
          counterclockwise: false,
          extra: {
            start: arcPoints.start,
            rx: radius,
            ry: radius,
            rotate: 0,
            t1: 0,
            t2: 1,
            end: arcPoints.end,
          },
        } as CircleCurved,
        point: Point({ type: PointType.Anchor, x: 0, y: 0 }),
        from: null,
        to: null,
      })
    );
    const cx3 = posX + size.width - (p - a - b);
    const cy3 = posY + size.height;
    const cx4 = posX + size.width - (p - a);
    const cy4 = posY + size.height;
    const x4 = posX + Math.max(size.width / 2, size.width - p);
    const y4 = posY + size.height;
    // ctx.bezierCurveTo(cx3, cy3, cx4, cy4, x4, y4);
    path.appendPoint(
      BezierPoint({
        start: false,
        point: Point({ type: PointType.Anchor, x: arcPoints.end.x, y: arcPoints.end.y }),
        from: null,
        to: Point({ type: PointType.Control, x: cx3, y: cy3 }),
      })
    );
    path.appendPoint(
      BezierPoint({
        start: false,
        point: Point({ type: PointType.Anchor, x: x4, y: y4 }),
        from: Point({ type: PointType.Control, x: cx4, y: cy4 }),
        to: null,
      })
    );
  }

  // 绘制左下角
  if (!bl) {
    // ctx.lineTo(posX, posY + size.height);
  } else {
    const x1 = posX + Math.min(size.width / 2, p);
    const y1 = posY + size.height;
    // ctx.lineTo(x1, y1);
    const cx1 = posX + (p - a);
    const cy1 = posY + size.height;
    const cx2 = posX + (p - a - b);
    const cy2 = posY + size.height;
    const x2 = posX + (p - a - b - c);
    const y2 = posY + size.height - d;
    // ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
    path.appendPoint(
      BezierPoint({
        start: false,
        point: Point({ type: PointType.Anchor, x: x1, y: y1 }),
        from: null,
        to: Point({ type: PointType.Control, x: cx1, y: cy1 }),
      })
    );
    path.appendPoint(
      BezierPoint({
        start: false,
        point: Point({ type: PointType.Anchor, x: x2, y: y2 }),
        from: Point({ type: PointType.Control, x: cx2, y: cy2 }),
        to: null,
      })
    );
    const center = {
      x: posX + radius,
      y: posY + size.height - radius,
    };
    const arc = {
      start: (90 + angle_theta) * ANGLE_TO_RADIANS,
      end: (180 - angle_theta) * ANGLE_TO_RADIANS,
    };
    const arcPoints = {
      start: {
        x: center.x + radius * Math.cos(arc.start),
        y: center.y + radius * Math.sin(arc.start),
      },
      end: {
        x: center.x + radius * Math.cos(arc.end),
        y: center.y + radius * Math.sin(arc.end),
      },
    };
    // ctx.arc(center.x, center.y, radius, arc.start, arc.end, false);
    path.appendPoint(
      BezierPoint({
        start: false,
        circle: {
          center,
          radius,
          arc,
          counterclockwise: false,
          extra: {
            start: arcPoints.start,
            rx: radius,
            ry: radius,
            rotate: 0,
            t1: 0,
            t2: 1,
            end: arcPoints.end,
          },
        } as CircleCurved,
        point: Point({ type: PointType.Anchor, x: 0, y: 0 }),
        from: null,
        to: null,
      })
    );
    const cx3 = posX;
    const cy3 = posY + size.height - (p - a - b);
    const cx4 = posX;
    const cy4 = posY + size.height - (p - a);
    const x4 = posX;
    const y4 = posY + Math.max(size.height / 2, size.height - p);
    // ctx.bezierCurveTo(cx3, cy3, cx4, cy4, x4, y4);
    path.appendPoint(
      BezierPoint({
        start: false,
        point: Point({ type: PointType.Anchor, x: arcPoints.end.x, y: arcPoints.end.y }),
        from: null,
        to: Point({ type: PointType.Control, x: cx3, y: cy3 }),
      })
    );
    path.appendPoint(
      BezierPoint({
        start: false,
        point: Point({ type: PointType.Anchor, x: x4, y: y4 }),
        from: Point({ type: PointType.Control, x: cx4, y: cy4 }),
        to: null,
      })
    );
  }

  // 绘制左上角
  if (!tl) {
    // ctx.lineTo(posX, posY);
  } else {
    const x1 = posX;
    const y1 = posY + Math.min(size.height / 2, p);
    // ctx.lineTo(x1, y1);
    const cx1 = posX;
    const cy1 = posY + (p - a);
    const cx2 = posX;
    const cy2 = posY + (p - a - b);
    const x2 = posX + d;
    const y2 = posY + (p - a - b - c);
    // ctx.bezierCurveTo(cx1, cy1, cx2, cy2, x2, y2);
    path.appendPoint(
      BezierPoint({
        start: false,
        point: Point({ type: PointType.Anchor, x: x1, y: y1 }),
        from: null,
        to: Point({ type: PointType.Control, x: cx1, y: cy1 }),
      })
    );
    path.appendPoint(
      BezierPoint({
        start: false,
        point: Point({ type: PointType.Anchor, x: x2, y: y2 }),
        from: Point({ type: PointType.Control, x: cx2, y: cy2 }),
        to: null,
      })
    );
    const center = {
      x: posX + radius,
      y: posY + radius,
    };
    const arc = {
      start: (180 + angle_theta) * ANGLE_TO_RADIANS,
      end: (270 - angle_theta) * ANGLE_TO_RADIANS,
    };
    const arcPoints = {
      start: {
        x: center.x + radius * Math.cos(arc.start),
        y: center.y + radius * Math.sin(arc.start),
      },
      end: {
        x: center.x + radius * Math.cos(arc.end),
        y: center.y + radius * Math.sin(arc.end),
      },
    };
    // ctx.arc(center.x, center.y, radius, arc.start, arc.end, false);
    path.appendPoint(
      BezierPoint({
        start: false,
        circle: {
          center,
          radius,
          arc,
          counterclockwise: false,
          extra: {
            start: arcPoints.start,
            rx: radius,
            ry: radius,
            rotate: 0,
            t1: 0,
            t2: 1,
            end: arcPoints.end,
          },
        } as CircleCurved,
        point: Point({ type: PointType.Anchor, x: 0, y: 0 }),
        from: null,
        to: null,
      })
    );
    const cx3 = posX + (p - a - b);
    const cy3 = posY;
    const cx4 = posX + (p - a);
    const cy4 = posY;
    const x4 = posX + Math.min(size.width / 2, p);
    const y4 = posY;
    // ctx.bezierCurveTo(cx3, cy3, cx4, cy4, x4, y4);
    path.appendPoint(
      BezierPoint({
        start: false,
        point: Point({ type: PointType.Anchor, x: arcPoints.end.x, y: arcPoints.end.y }),
        from: null,
        to: Point({ type: PointType.Control, x: cx3, y: cy3 }),
      })
    );
    path.appendPoint(
      BezierPoint({
        start: false,
        point: Point({ type: PointType.Anchor, x: x4, y: y4 }),
        from: Point({ type: PointType.Control, x: cx4, y: cy4 }),
        to: null,
        end: true,
      })
    );
    path.setClosed();
  }
  // ctx.closePath();
  return path;
}
