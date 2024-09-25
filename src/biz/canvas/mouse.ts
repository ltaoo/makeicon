import { base, Handler } from "@/domains/base";
import { CircleCurved, BezierPoint, BezierPointMirrorTypes } from "@/biz/bezier_point";
import {
  calculateCircleCenter,
  getSymmetricPoint2,
  isCollinear,
  toBase64,
  calculateCircleArcs,
  findSymmetricPoint,
  distanceOfPoints,
  arc_to_curve,
  checkIsClockwise,
} from "@/biz/bezier_point/utils";
import { LinePath } from "@/biz/path";
import { LineCapType, LineJoinType, PathCompositeOperation } from "@/biz/line";
import { Point } from "@/biz/point";
import { Line } from "@/biz/line";

import { Canvas } from "./index";
import { CanvasModeManage } from "./mode";

/**
 * 画布上鼠标相关逻辑
 * 是否按下、移动距离等等
 */
export function CanvasPointer(props: { canvas: Canvas; mode: CanvasModeManage }) {
  const { canvas: _$canvas, mode: _$mode } = props;
  let _lines: Line[] = [];
  let _paths = _lines.reduce((prev, cur) => {
    return prev.concat(cur.paths);
  }, [] as LinePath[]);
  let _points: Point[] = [];
  let _path_points: BezierPoint[] = [];

  /** 按下时的位置 */
  let _mx = 0;
  let _my = 0;
  let _cx = 0;
  let _cy = 0;
  let _ox = 0;
  let _oy = 0;
  /** 移动时的位置 */
  let _mx2 = 0;
  let _my2 = 0;

  let _pressing = false;
  /** 当前是否处于拖动 */
  let _dragging = false;
  let _out_grid = true;

  function updatePoints() {
    const points: Point[] = [];
    const path_points: BezierPoint[] = [];
    for (let i = 0; i < _paths.length; i += 1) {
      const path = _paths[i];
      points.push(...path.points);
      path_points.push(...path.path_points);
    }
    _points = points;
    // console.log("_points count", _points.length);
    _path_points = path_points;
    // console.log("_path_points count", _path_points.length);
  }

  enum Events {
    PointerDown,
    PointerMove,
    PointerUp,
    LeaveGrid,
    EnterGrid,
    Update,
  }
  type TheTypesOfEvents = {
    [Events.PointerDown]: void;
    [Events.PointerMove]: void;
    [Events.PointerUp]: void;
    [Events.LeaveGrid]: void;
    [Events.EnterGrid]: void;
    [Events.Update]: void;
  };
  const bus = base<TheTypesOfEvents>();

  return {
    get pressing() {
      return _pressing;
    },
    get dragging() {
      return _dragging;
    },
    //     getCurPath() {
    //       return _cur_line_path;
    //     },
    getMousePoint() {
      return {
        x: _mx2,
        y: _my2,
        // text: `${_mx2 - _grid.x},${_my2 - _grid.y}`,
        text: `${_mx2},${_my2}`,
      };
    },
    get paths() {
      return _lines;
    },
    /** 处理路径嵌套，哪个路径是正常绘制，哪个是减去 */
    format(paths: Line[]) {
      for (let i = 0; i < paths.length; i += 1) {
        const path = paths[i];
        const sub_paths = path.paths;
        let composite_relative_path: LinePath | null = null;
        for (let j = 0; j < sub_paths.length; j += 1) {
          const cur_sub_path = sub_paths[j];
          const next_sub_path = sub_paths[j + 1];
          // console.log("process sub_path", i, j, cur_sub_path.clockwise, next_sub_path?.clockwise);
          if (next_sub_path) {
            if (next_sub_path.clockwise && !cur_sub_path.clockwise) {
              // 这一个是逆时针，下一个是顺时针
              if (cur_sub_path.isInnerOf(next_sub_path)) {
                // 当前这个，在下一个的里面，那这一个的混合模式需要 减去
                cur_sub_path.setComposite("destination-out");
                // 并且，两个还要调换顺序！！！
                sub_paths[j + 1] = cur_sub_path;
                sub_paths[j] = next_sub_path;
                j += 1;
              }
              if (next_sub_path.isInnerOf(cur_sub_path)) {
                composite_relative_path = cur_sub_path;
                // 当前这个，包裹了下一个，
                next_sub_path.setComposite("destination-out");
                j += 1;
              }
            }
            if (cur_sub_path.clockwise && !next_sub_path.clockwise) {
              // 这一个是顺时针，下一个是逆时针，这属于最标准的画法
              if (next_sub_path.isInnerOf(cur_sub_path)) {
                composite_relative_path = cur_sub_path;
                next_sub_path.setComposite("destination-out");
                j += 1;
              }
            }
          }
          if (composite_relative_path) {
            if (cur_sub_path.clockwise !== composite_relative_path.clockwise) {
              if (cur_sub_path.isInnerOf(composite_relative_path)) {
                cur_sub_path.setComposite("destination-out");
              }
            }
          }
        }
      }
      return paths;
    },
    setPaths(
      paths: Line[],
      extra: Partial<{ transform: boolean; dimensions: { width: number; height: number } }> = {}
    ) {
      // console.log("[BIZ]canvas/index - setPaths", paths);
      _lines = this.format(paths);
      _paths = _lines.reduce((prev, cur) => {
        return prev.concat(cur.paths);
      }, [] as LinePath[]);
      updatePoints();
      // if (extra.transform) {
      //   for (let i = 0; i < _paths.length; i += 1) {
      //     const path = _paths[i];
      //     const circle_point = path.path_points.find((p) => p.circle);
      //     if (circle_point && circle_point.circle) {
      //       circle_point.setCircle({
      //         center: {
      //           x: this.normalizeX(circle_point.circle.center.x, {
      //             exp: false,
      //             scale: extra.dimensions ? extra.dimensions.width / _grid.width : 1,
      //           }),
      //           y: this.normalizeY(circle_point.circle.center.y, {
      //             exp: false,
      //             scale: extra.dimensions ? extra.dimensions.height / _grid.height : 1,
      //           }),
      //         },
      //         counterclockwise: circle_point.circle.counterclockwise,
      //         radius: circle_point.circle.radius * (extra.dimensions ? extra.dimensions.width / _grid.width : 1),
      //         arc: circle_point.circle.arc,
      //       });
      //     }
      //     console.log('points count is', path.points.length);
      //     path.points.forEach((point) => {
      //       point.setXY({
      //         x: this.normalizeX(point.x, {
      //           exp: false,
      //           scale: extra.dimensions ? extra.dimensions.width / _grid.width : 1,
      //         }),
      //         y: this.normalizeY(point.y, {
      //           exp: false,
      //           scale: extra.dimensions ? extra.dimensions.height / _grid.height : 1,
      //         }),
      //       });
      //     });
      //   }
      // }
      bus.emit(Events.Update);
    },
    handleMouseDown(pos: { x: number; y: number }) {
      _mx = pos.x;
      _my = pos.y;
      _pressing = true;
      bus.emit(Events.PointerDown);
    },
    handleMouseMove(pos: { x: number; y: number }) {
      const { x, y } = pos;
      _mx2 = x;
      _my2 = y;
      const in_grid = _$canvas.inGrid(pos);
      if (!in_grid) {
        if (_out_grid === false) {
          bus.emit(Events.LeaveGrid);
        }
        _out_grid = true;
      }
      if (in_grid) {
        if (_out_grid === true) {
          bus.emit(Events.EnterGrid);
        }
        _out_grid = false;
      }
      if (!_pressing) {
        return;
      }
      /** x方向移动的距离 */
      _ox = pos.x - _mx;
      /** y方向移动的距离 */
      _oy = pos.y - _my;
      _dragging = true;
      bus.emit(Events.PointerMove);
    },
    handleMouseUp(pos: { x: number; y: number }) {
      _pressing = false;
      _dragging = false;
      _mx = 0;
      _my = 0;
      _mx2 = 0;
      _my2 = 0;
      _ox = 0;
      _oy = 0;
      bus.emit(Events.PointerUp);
    },

    onEnterGrid(handler: Handler<TheTypesOfEvents[Events.EnterGrid]>) {
      return bus.on(Events.EnterGrid, handler);
    },
    onLeaveGrid(handler: Handler<TheTypesOfEvents[Events.LeaveGrid]>) {
      return bus.on(Events.LeaveGrid, handler);
    },
  };
}

export type CanvasPointer = ReturnType<typeof CanvasPointer>;
