import { base, Handler } from "@/domains/base";
import { BezierPoint, BezierPointMirrorTypes } from "@/biz/bezier_point";
import { LinePath } from "@/biz/path";
import { Point } from "@/biz/point";
import { Line } from "@/biz/line";
import { distanceOfPoints, getSymmetricPoint2 } from "@/biz/bezier_point/utils";
import { Bezier } from "@/utils/bezier/bezier";

import { Canvas } from "./index";
import { CanvasModeManage } from "./mode";
import { CanvasPointer } from "./mouse";
import { AUTO_CONTROLLER_POINT_LENGTH_RATIO } from "./constants";

type PathEditingProps = {
  canvas: Canvas;
  mode: CanvasModeManage;
  pointer: CanvasPointer;
};
export function PathEditing(props: PathEditingProps) {
  const { canvas: _$canvas, mode: _$mode, pointer: _$pointer } = props;

  _$pointer.onLeaveGrid(() => {
    if (!_$pointer.dragging && _moving_for_new_line && _cur_path_point) {
      _cur_path_point.setHidden(true);
      bus.emit(Events.Refresh);
    }
  });
  _$pointer.onEnterGrid(() => {
    if (_cur_path_point && _cur_path_point.hidden) {
      _cur_path_point.setHidden(false);
    }
  });

  /** 曲线锚点（一个坐标点+入控制点+出控制点） */
  let _path_points: BezierPoint[] = [];
  /** 路径的 坐标点 + 控制点 */
  let _points: Point[] = [];
  /** 路径编辑相关状态 Start ------------------ */
  /** 两种情况，钢笔工具时，确定了坐标点，开始拖动改变控制点位置；移动工具时，点击了点，开始拖动改变点位置 */
  //   let _prepare_dragging = false;
  let _moving_for_new_line = false;
  /** 之前拖动过的路径点 */
  let _prev_path_point: BezierPoint | null = null;
  /** 当前拖动的路径点 */
  let _cur_path_point: BezierPoint | null = null;
  /** 之前拖动过的点，可能是 锚点、坐标点 */
  let _prev_point: Point | null = null;
  /** 当前拖动的点，可能是 锚点、坐标点 */
  let _cur_point: Point | null = null;
  let _cur_line_path: LinePath | null = null;
  let _closing = false;
  let _line: Line | null = null;
  /** 路径编辑相关状态 End ------------------ */
  let _events: (() => void)[] = [];

  const _state = {};

  //   function updatePoints() {
  //     const points: Point[] = [];
  //     const path_points: BezierPoint[] = [];
  //     for (let i = 0; i < _paths.length; i += 1) {
  //       const path = _paths[i];
  //       points.push(...path.points);
  //       path_points.push(...path.path_points);
  //     }
  //     console.log("_points count", _points.length);
  //     console.log("_path_points count", _path_points.length);
  //     _points = points;
  //     _path_points = path_points;
  //   }
  function checkIsClickPoint(pos: { x: number; y: number }) {
    const matched = _points.find((p) => {
      if (Math.abs(pos.x - p.x) < 10 && Math.abs(pos.y - p.y) < 10) {
        return true;
      }
      return false;
    });
    if (matched) {
      return matched;
    }
    return null;
  }
  function checkIsClickPathPoint(pos: { x: number; y: number }) {
    const matched = _path_points.find((p) => {
      if (Math.abs(pos.x - p.x) < 10 && Math.abs(pos.y - p.y) < 10) {
        return true;
      }
      return false;
    });
    if (matched) {
      return matched;
    }
    return null;
  }
  function updatePoints() {
    const points: Point[] = [];
    const path_points: BezierPoint[] = [];
    if (!_line) {
      return;
    }
    for (let i = 0; i < _line.paths.length; i += 1) {
      const path = _line.paths[i];
      points.push(...path.points);
      path_points.push(...path.path_points);
    }
    _points = points;
    _path_points = path_points;
  }

  enum Events {
    CreateLine,
    Refresh,
    Change,
  }
  type TheTypesOfEvents = {
    [Events.CreateLine]: Line;
    [Events.Refresh]: void;
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();

  return {
    get line() {
      return _line;
    },
    setBezierPoints(points: BezierPoint[]) {
      _path_points = points;
    },
    complete() {
      if (_cur_line_path) {
        _cur_line_path.removeLastVirtualPoint();
      }
      _cur_line_path = null;
    },
    setPath(path: LinePath) {
      _cur_line_path = path;
    },
    handleMouseDown(pos: { x: number; y: number }) {
      //       if (_$canvas.state.mode === "default") {
      //         return;
      //       }
      console.log(`[BIZ]canvas/index - handleMouseDown before if (is("path_editing.pen"))`, _$canvas.state.mode);
      if (_$mode.value === "path_editing.pen") {
        if (!_$canvas.inGrid(pos)) {
          return;
        }
        const clicked_point = checkIsClickPathPoint(pos);
        console.log("[BIZ]canvas/index has matched point", clicked_point, _cur_path_point, _cur_point);
        if (clicked_point && _cur_path_point && clicked_point !== _cur_path_point) {
          if (clicked_point.start) {
            // 点击了开始点，闭合路径
            clicked_point.setEnd(true);
            _closing = true;
            _cur_path_point.setClosed();
            _cur_path_point.point.moveTo(clicked_point.point);
            if (_cur_line_path) {
              _cur_line_path.setClosed();
            }
          }
          return;
        }
        console.log("[BIZ]canvas/path is moving for new line", _moving_for_new_line, _cur_path_point);
        if (_moving_for_new_line && _cur_path_point) {
          // 创建点后移动，选择了一个位置，按下，看准备拖动创建曲线，还是松开直接创建直线
          _cur_point = _cur_path_point.to;
          return;
        }
      }
      if (_$mode.value === "path_editing.select") {
        const found = checkIsClickPoint(pos);
        console.log("[BIZ]canvas/path_editing - after checkIsClickPoint(pos)", found);
        if (!found) {
          return;
        }
        _cur_point = found;
      }
    },
    handleMouseMove(pos: { x: number; y: number }) {
      // console.log("[BIZ]canvas/path_editing - handleMouseMove", pos);
      if (_$mode.value === "path_editing.pen") {
        // if (!_cur_path_point) {
        //   return;
        // }
        if (_$pointer.dragging && _cur_path_point) {
          if (!_cur_path_point.to) {
            const to_of_cur_path_point = Point({
              x: pos.x,
              y: pos.y,
            });
            _cur_point = to_of_cur_path_point;
            _cur_path_point.setVirtual(false);
            _cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngleAndLength);
            _cur_path_point.setTo(to_of_cur_path_point);
          }
          if (_prev_path_point && _prev_path_point.start) {
            // 开始拖动后，如果前一个点是「起点」，需要同步更新起点的「出控制点」
            const start = _prev_path_point;
            const p = getSymmetricPoint2(
              start.point,
              { x: _cur_path_point.point.x, y: _cur_path_point.point.y },
              { x: pos.x, y: pos.y },
              AUTO_CONTROLLER_POINT_LENGTH_RATIO
            );
            const to_of_prev_path_point = Point({
              x: p.x,
              y: p.y,
            });
            if (_cur_path_point.to) {
              const unlisten = _cur_path_point.to.onMove(() => {
                if (!_cur_path_point) {
                  return;
                }
                if (!_cur_path_point.to) {
                  return;
                }
                const p = getSymmetricPoint2(
                  start.point,
                  { x: _cur_path_point.point.x, y: _cur_path_point.point.y },
                  { x: _cur_path_point.to.x, y: _cur_path_point.to.y },
                  AUTO_CONTROLLER_POINT_LENGTH_RATIO
                );
                to_of_prev_path_point.moveTo({ x: p.x, y: p.y });
              });
              _events.push(unlisten);
            }
            start.setTo(to_of_prev_path_point);
          }
          if (_prev_path_point && _prev_path_point.to === null && _prev_path_point.from === null) {
            // 直线后，接曲线
            const prev_path_point = _prev_path_point;
            const p = getSymmetricPoint2(
              prev_path_point.point,
              { x: _cur_path_point.point.x, y: _cur_path_point.point.y },
              { x: pos.x, y: pos.y },
              AUTO_CONTROLLER_POINT_LENGTH_RATIO
            );
            const to_of_prev_path_point = Point({
              x: p.x,
              y: p.y,
            });
            // const unlisten = to_of_cur_path_point.onMove(() => {
            //   if (!_cur_path_point) {
            //     return;
            //   }
            //   if (!_cur_path_point.to) {
            //     return;
            //   }
            //   const p = getSymmetricPoint2(
            //     prev_path_point.point,
            //     { x: _cur_path_point.point.x, y: _cur_path_point.point.y },
            //     { x: _cur_path_point.to.x, y: _cur_path_point.to.y },
            //     AUTO_CONTROLLER_POINT_LENGTH_RATIO
            //   );
            //   to_of_prev_path_point.moveTo({ x: p.x, y: p.y });
            // });
            // _events.push(unlisten);
            prev_path_point.setTo(to_of_prev_path_point);
          }
        }
        if (_moving_for_new_line && _cur_point) {
          console.log("[BIZ]canvas/path_editing - before _cur_point.moveTo", pos);
          _cur_point.moveTo({
            x: pos.x,
            y: pos.y,
          });
          bus.emit(Events.Refresh);
        }
        return;
      }
      if (_$mode.value === "path_editing.select") {
        if (!_cur_point) {
          return;
        }
        if (!_$pointer.dragging) {
          return;
        }
        _cur_point.moveTo({
          x: pos.x,
          y: pos.y,
        });
        bus.emit(Events.Refresh);
      }
      //       if (_global_cursor) {
      //         if (_moving_object) {
      //           const path = _paths[0];
      //           if (path) {
      //             console.log("[BIZ]canvas/index - before move path", _ox, _oy);
      //             path.move({
      //               x: _ox,
      //               y: _oy,
      //             });
      //             bus.emit(Events.Update);
      //           }
      //         }
      //       }
    },
    handleMouseUp(pos: { x: number; y: number }) {
      console.log("[BIZ]canvas/path_editing - handleMouseUp", pos);
      if (_$mode.value === "path_editing.pen") {
        for (let i = 0; i < _events.length; i += 1) {
          _events[i]();
        }
        _events = [];
        console.log("[BIZ]canvas/path_editing - handleMouseUp before if (!_cur_path_point ", _cur_path_point);
        if (!_cur_line_path) {
          // 新路径，创建起点
          const start = BezierPoint({
            point: Point({
              x: pos.x,
              y: pos.y,
            }),
            from: null,
            to: null,
            start: true,
            virtual: false,
            mirror: null,
          });
          const end = BezierPoint({
            point: Point({
              x: pos.x + 10,
              y: pos.y + 10,
            }),
            from: null,
            to: null,
            mirror: BezierPointMirrorTypes.MirrorAngleAndLength,
          });
          _cur_line_path = LinePath({
            points: [],
            closed: false,
          });
          // _cur_line.append(_cur_line_path);
          _line = Line({
            fill: {
              color: "#111111",
            },
          });
          _line.append(_cur_line_path);
          console.log("[BIZ]canvas/path_editing - create line");
          bus.emit(Events.CreateLine, _line);
          _cur_line_path.onPointCountChange(() => {
            updatePoints();
          });
          _prev_path_point = start;
          _cur_path_point = end;
          _prev_point = start.point;
          _cur_point = end.point;
          _moving_for_new_line = true;
          _cur_line_path.appendPoint(start);
          _cur_line_path.appendPoint(end);
          bus.emit(Events.Refresh);
          return;
        }
        if (!_cur_line_path) {
          return;
        }
        console.log("[BIZ]canvas/path_editing - handleMouseUp before if (_closing", _cur_path_point, _closing);
        if (_closing && _cur_path_point) {
          console.log("[BIZ]canvas/path_editing - handleMouseUp close the path", {
            x: _cur_path_point.x,
            y: _cur_path_point.y,
          });
          // 闭合路径松开
          const start_point = _cur_line_path.start_point;
          start_point.setMirror(BezierPointMirrorTypes.NoMirror);
          start_point.setEnd(true);
          _cur_path_point.setVirtual(false);
          // console.log("[BIZ]canvas - before if (_cur_path_point.from", _cur_path_point.from);
          if (_cur_path_point.from) {
            // 因为待会要删掉最后一个坐标点及其控制点，所以这里是 copy
            start_point.setFrom(_cur_path_point.from, { copy: true });
          }
          // console.log("_prev_path_point", _prev_path_point?.uid, _prev_path_point?.point.pos, _prev_path_point?.to);
          if (_cur_line_path) {
            _cur_line_path.removeLastPoint();
          }
          if (_prev_path_point) {
            _cur_line_path.createSegmentFromTwoPoint(_prev_path_point, start_point);
          }
          _cur_line_path = null;
          _prev_path_point = null;
          _cur_path_point = null;
          _prev_point = null;
          _cur_point = null;
          _moving_for_new_line = false;
          _closing = false;
          //   this.format(_lines);
          bus.emit(Events.Refresh);
          return;
        }
        console.log("[BIZ]canvas/path_editing - handleMouseUp before if (_$pointer.dragging", _$pointer.dragging);
        if (_$pointer.dragging) {
          // 点击确定曲线终点，生成曲线，拖动控制点改变曲线曲率，然后松开
          // 两件事
          // 1. 确定了一条曲线的终点和控制点2
          // 2. 创建了一条未确定「终点跟着鼠标移动」的曲线
          if (!_cur_path_point) {
            return;
          }
          if (!_cur_path_point.from) {
            return;
          }
          _moving_for_new_line = true;
          if (_cur_path_point) {
            _cur_path_point.setVirtual(false);
            _cur_line_path.createSegment(_cur_path_point);
          }
          const from_point_pos = getSymmetricPoint2(
            _cur_path_point.point,
            { x: pos.x, y: pos.y },
            _cur_path_point.from,
            AUTO_CONTROLLER_POINT_LENGTH_RATIO
          );
          const from_of_new_path_point = Point({
            x: from_point_pos.x,
            y: from_point_pos.y,
          });
          // 下一个锚点，这个锚点会跟着鼠标动，还没确定落点
          const next_path_point = BezierPoint({
            point: Point({
              x: pos.x,
              y: pos.y,
            }),
            from: from_of_new_path_point,
            to: null,
            end: true,
            mirror: BezierPointMirrorTypes.NoMirror,
          });
          _prev_path_point = _cur_path_point;
          _prev_point = _cur_path_point.point;
          _cur_path_point = next_path_point;
          _cur_point = next_path_point.point;
          // console.log("[BIZ]canvas/index - before path.appendPoint", { x: pos.x, y: pos.y });
          _cur_line_path.appendPoint(next_path_point);
          _cur_point.onMove(() => {
            if (!_cur_path_point) {
              return;
            }
            if (!_cur_path_point.from) {
              return;
            }
            const p = getSymmetricPoint2(
              _cur_path_point.point,
              { x: _cur_path_point.x, y: _cur_path_point.y },
              { x: _cur_path_point.from.x, y: _cur_path_point.from.y },
              AUTO_CONTROLLER_POINT_LENGTH_RATIO
            );
            from_of_new_path_point.moveTo({
              x: p.x,
              y: p.y,
            });
          });
          return;
        }
        // console.log("[BIZ]canvas - handleMouseUp before if (_prepare_dragging ", _prepare_dragging, _dragging);
        if (_$pointer.pressing && !_$pointer.dragging) {
          // 点击确定曲线终点，生成曲线，没有拖动控制点改变曲线曲率，直接松开。这里直线曲线都可能
          // @todo 如果本来是创建曲线，结果实际上创建了直线，应该移除曲线的控制点，变成真正的直线
          // console.log("初始化下一个坐标点", _cur_path_point?.mirror);
          if (!_cur_path_point) {
            return;
          }
          _moving_for_new_line = true;
          if (_cur_path_point) {
            _cur_path_point.setVirtual(false);
            _cur_path_point.setMirror(BezierPointMirrorTypes.NoMirror);
          }
          const new_path_point = BezierPoint({
            point: Point({
              x: pos.x,
              y: pos.y,
            }),
            from: null,
            to: null,
            end: true,
          });
          _prev_path_point = _cur_path_point;
          _prev_point = _cur_path_point.point;
          _cur_path_point = new_path_point;
          _cur_point = new_path_point.point;
          _cur_line_path.appendPoint(new_path_point);
          return;
        }
        return;
      }
      if (_$mode.value === "path_editing.select") {
        if (!_$pointer.dragging) {
          return;
        }
        _cur_point = null;
        _cur_path_point = null;
      }
      //       if (_global_cursor) {
      //         if (_moving_object) {
      //           _moving_object = false;
      //           const path = _paths[0];
      //           if (path) {
      //             path.finishMove({
      //               x: pos.x,
      //               y: pos.y,
      //             });
      //             bus.emit(Events.Update);
      //           }
      //         }
      //       }
    },
    onCreateLine(handler: Handler<TheTypesOfEvents[Events.CreateLine]>) {
      return bus.on(Events.CreateLine, handler);
    },
    onRefresh(handler: Handler<TheTypesOfEvents[Events.Refresh]>) {
      return bus.on(Events.Refresh, handler);
    },
  };
}

export type PathEditing = ReturnType<typeof PathEditing>;
