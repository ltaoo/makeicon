import { Point } from "@/biz/point";
import { Bezier } from "@/utils/bezier/bezier";

type PathSegmentProps = {
  start: Point;
  end: Point;
};
export function PathSegment(props: PathSegmentProps) {
  const { start, end } = props;

  let _linear = true;
  let _start = start;
  let _end = end;
  let _c1: null | Point = null;
  let _c2: null | Point = null;
  let _virtual = true;
  let _bezier: null | Bezier = null;

  start.onMove(() => {
    if (_bezier) {
      console.log("[BIZ]path/segment - start onMove");
      _bezier.points[0] = start.pos;
      _bezier.update();
    }
  });
  end.onMove(() => {
    if (_bezier) {
      _bezier.points[_bezier.points.length - 1] = end.pos;
      _bezier.update();
    }
  });

  return {
    Symbol: "PathSegment" as const,
    get bezier() {
      return _bezier;
    },
    setC1(point: Point) {
      _c1 = point;
      _linear = false;
    },
    setC2(point: Point) {
      _c2 = point;
      _linear = false;
    },
    setControls(c1: Point, c2: Point) {
      _c1 = c1;
      _c2 = c2;
      _linear = false;
      _c1.onMove(() => {
        if (_bezier) {
          _bezier.points[1] = c1.pos;
          _bezier.update();
        }
      });
      _c2.onMove(() => {
        if (_bezier && _bezier.points[2]) {
          _bezier.points[2] = c2.pos;
          _bezier.update();
        }
      });
    },
    box() {
      // console.log("[BIZ]path/segment - box", _virtual, !!_bezier);
      if (_virtual) {
        return null;
      }
      if (!_bezier) {
        // 直线
        const x1 = _start.x;
        const y1 = _start.y;
        const x2 = _end.x;
        const y2 = _end.y;
        const isReverse = x1 > x2 || y1 > y2;
        return {
          x: {
            min: isReverse ? x2 : x1,
            max: isReverse ? x1 : x2,
            size: isReverse ? x1 - x2 : x2 - x1,
          },
          y: {
            min: isReverse ? y2 : y1,
            max: isReverse ? y1 : y2,
            size: isReverse ? y1 - y2 : y2 - y1,
          },
        };
      }
      _bezier.update();
      // console.log("[BIZ]path/segment - box", _bezier.points);
      return _bezier.bbox();
    },
    /** 一条线段的终点确定下来了 */
    ensure() {
      _virtual = false;
      if (!_linear && _c1 && _c2) {
        _bezier = new Bezier([_start.pos, _c1.pos, _c2.pos, _end.pos]);
      }
    },
  };
}

export type PathSegment = ReturnType<typeof PathSegment>;
