import { base, Handler } from "@/domains/base";
import { PathPoint, PathPointMirrorTypes } from "@/biz/path_point";
import { getSymmetricPoint2, toBase64 } from "@/biz/path_point/utils";
import { BezierPath } from "@/biz/bezier_path";
import { BezierPoint } from "@/biz/bezier_point";

const AUTO_CONTROLLER_POINT_LENGTH_RATIO = 0.42;

enum Events {
  Update,
}
type TheTypesOfEvents = {
  [Events.Update]: void;
};
type CanvasProps = {
  paths: BezierPath[];
};
export function Canvas(props: CanvasProps) {
  const { paths } = props;

  let _paths = paths;
  let _points: BezierPoint[] = [];
  let _path_points: PathPoint[] = [];
  /** 按下时的位置 */
  let _mx = 0;
  let _my = 0;
  let _cx = 0;
  let _cy = 0;
  let _ox = 0;
  let _oy = 0;
  let _mx2 = 0;
  let _my2 = 0;
  let _size = {
    width: 0,
    height: 0,
  };
  /** 网格区域信息 */
  let _grid = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  let _prepare_dragging = false;
  let _moving_for_new_line = false;
  /** 当前是否处于拖动 坐标点或锚点 */
  let _dragging = false;
  let _out_grid = true;
  /** 之前拖动过的路径点，包含了 坐标点和锚点 */
  let _prev_path_point: PathPoint | null = null;
  /** 当前拖动的路径点，包含了 坐标点和锚点 */
  let _cur_path_point: PathPoint | null = null;
  /** 之前拖动过的点，可能是 锚点、坐标点 */
  let _prev_point: BezierPoint | null = null;
  /** 当前拖动的点，可能是 锚点、坐标点 */
  let _cur_point: BezierPoint | null = null;
  let _cur_path: BezierPath | null = null;
  /** 当前是否激活钢笔工具 */
  let _pen_editing = 1;
  let _events: (() => void)[] = [];
  let _debug = false;
  // 事件
  const bus = base<TheTypesOfEvents>();

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
  function inGrid(pos: { x: number; y: number }) {
    if (pos.x >= _grid.x && pos.x <= _grid.x + _grid.width && pos.y >= _grid.y && pos.y <= _grid.y + _grid.height) {
      return true;
    }
    return false;
  }
  function updatePoints() {
    const points: BezierPoint[] = [];
    const path_points: PathPoint[] = [];
    for (let i = 0; i < _paths.length; i += 1) {
      const path = _paths[i];
      points.push(...path.points);
      path_points.push(...path.path_points);
    }
    _points = points;
    _path_points = path_points;
  }

  return {
    drawLine(p1: { x: number; y: number }, p2: { x: number; y: number }) {
      console.log("请实现 drawLine 方法");
    },
    drawCurve(curve: { points: { x: number; y: number }[] }) {
      console.log("请实现 drawCurve 方法");
    },
    drawCircle(point: { x: number; y: number }, radius: number) {
      console.log("请实现 drawCircle 方法");
    },
    drawLabel(point: { x: number; y: number }) {
      console.log("请实现 drawLabel 方法");
    },
    drawDiamondAtLineEnd(p1: { x: number; y: number }, p2: { x: number; y: number }) {
      console.log("请实现 drawDiamondAtLineEnd 方法");
    },
    drawPoints() {
      console.log("请实现 drawPoints 方法");
    },
    drawGrid() {
      console.log("请实现 drawGrid 方法");
    },
    clear() {
      console.log("请实现 clear 方法");
    },
    setSize(size: { width: number; height: number }) {
      Object.assign(_size, size);
    },
    get grid() {
      return _grid;
    },
    setGrid(grid: { x: number; y: number; width: number; height: number }) {
      Object.assign(_grid, grid);
    },
    normalizeX(v: number, extra: Partial<{ scale: number; precision: number; exp: boolean }> = {}) {
      const { scale = 1, precision = 2, exp = true } = extra;
      const x = parseFloat(
        (
          (() => {
            if (exp) {
              return v - _grid.x;
            }
            return v + _grid.x;
          })() * scale
        ).toFixed(precision)
      );
      return x;
    },
    normalizeY(v: number, extra: Partial<{ scale: number; precision: number; exp: boolean }> = {}) {
      const { scale = 1, precision = 2, exp = true } = extra;
      const y = parseFloat(
        (
          (() => {
            if (exp) {
              return v - _grid.y;
            }
            return v + _grid.y;
          })() * scale
        ).toFixed(precision)
      );
      return y;
    },
    transformPos(pos: { x: number; y: number }, extra: Partial<{ scale: number; precision: number }> = {}) {
      const x = this.normalizeX(pos.x, extra);
      const y = this.normalizeY(pos.y, extra);
      return [x, y];
    },
    deleteCurPoint() {
      if (!_cur_point) {
        return;
      }
      for (let i = 0; i < paths.length; i += 1) {
        const path = paths[i];
        path.deletePoint(_cur_point);
      }
      bus.emit(Events.Update);
    },
    getCurPath() {
      return _cur_path;
    },
    cancelPen() {
      const path = _cur_path;
      if (!path) {
        return;
      }
      if (_pen_editing) {
        path.removeLastPoint();
      }
      _pen_editing = 0;
      _cur_path_point = null;
      _cur_point = null;
      updatePoints();
      bus.emit(Events.Update);
    },
    selectPen() {
      _pen_editing = 1;
    },
    exportSVG(options: Partial<{ cap: "round" | "none" }> = {}) {
      const scale = 1;
      let svg = `<svg width="${_grid.width * scale}" height="${
        _grid.height * scale
      }" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" class="icon" version="1.1"><g class="layer">`;
      let d = "";
      for (let i = 0; i < _paths.length; i += 1) {
        const path = _paths[i];
        const { outline } = path.buildOutline({ cap: options.cap, scene: 1 });
        const first = outline[0];
        if (!first) {
          svg += "</svg>";
          return svg;
        }
        // ctx.beginPath();
        for (let i = 0; i < outline.length; i += 1) {
          const curve = outline[i];
          const [start, c1, c2, end] = curve.points;
          // console.log(start, c1, c2, end);
          if (i === 0 && start) {
            d += `M${this.transformPos(start, { scale }).join(" ")}`;
          }
          (() => {
            if (curve._linear) {
              d += `L${this.transformPos(c2, { scale }).join(" ")}`;
              return;
            }
            if (end) {
              d += `C${[
                ...this.transformPos(c1, { scale }),
                ...this.transformPos(c2, { scale }),
                ...this.transformPos(end, { scale }),
              ].join(" ")}`;
              return;
            }
            d += `Q${[...this.transformPos(c1, { scale }), ...this.transformPos(c2, { scale })].join(" ")}`;
          })();
        }
        d += "Z";
      }
      svg += `<path d="${d}" fill="#111111" id="svg_1" />`;
      svg += "</g></svg>";
      return svg;
    },
    exportWeappCode() {
      const svg = this.exportSVG();
      const url = toBase64(svg, { doubleQuote: true });
      const template = `.icon-example {\n-webkit-mask:url('${url}') no-repeat 50% 50%;\n-webkit-mask-size:cover;\n}`;
      return template;
    },
    getMousePoint() {
      return {
        x: _mx2,
        y: _my2,
        // text: `${_mx2 - _grid.x},${_my2 - _grid.y}`,
        text: `${_mx2},${_my2}`,
      };
    },
    get paths() {
      return _paths;
    },
    setPaths(paths: BezierPath[], extra: Partial<{ transform: boolean }> = {}) {
      _paths = paths;
      if (extra.transform) {
        for (let i = 0; i < _paths.length; i += 1) {
          const path = _paths[i];
          path.points.forEach((point) => {
            point.setXY({
              x: this.normalizeX(point.x, { exp: false }),
              y: this.normalizeY(point.y, { exp: false }),
            });
          });
        }
      }
      updatePoints();
      bus.emit(Events.Update);
    },
    update() {
      bus.emit(Events.Update);
    },
    handleMouseDown(pos: { x: number; y: number }) {
      const { x, y } = pos;
      if (_pen_editing) {
        if (!inGrid(pos)) {
          return;
        }
        const found = checkIsClickPathPoint(pos);
        console.log("has matched point", pos);
        if (found && _cur_path_point && found !== _cur_path_point && _cur_path) {
          if (found.start) {
            // 点击了开始点，闭合路径
            found.setEnd(true);
            _cur_path.setClosed();
            _cur_path_point.setClosed();
            _cur_path_point.point.move(found.point);
            _prepare_dragging = true;
            _moving_for_new_line = false;
          }
          return;
        }
        if (_moving_for_new_line && _cur_path_point) {
          // 创建点后移动，选择了一个位置，按下，看准备拖动创建曲线，还是松开直接创建直线
          _prepare_dragging = true;
          _cur_point = _cur_path_point.to;
          return;
        }
        // 画布空白，第一次点击，创建起点
        _moving_for_new_line = true;
        const start = PathPoint({
          point: BezierPoint({
            x,
            y,
          }),
          from: null,
          to: null,
          start: true,
          virtual: false,
          mirror: null,
        });
        const end = PathPoint({
          point: BezierPoint({
            x: x + 10,
            y: y + 10,
          }),
          from: null,
          to: null,
          mirror: PathPointMirrorTypes.MirrorAngleAndLength,
        });
        _cur_path = BezierPath({
          points: [],
          closed: false,
        });
        _paths.push(_cur_path);
        _cur_path.onPointCountChange(() => {
          updatePoints();
        });
        _prev_path_point = start;
        _cur_path_point = end;
        _prev_point = start.point;
        _cur_point = end.point;
        _cur_path.appendPoint(start);
        _cur_path.appendPoint(end);
        return;
      }
      _mx = x;
      _my = y;
      const found = checkIsClickPoint(pos);
      if (found) {
        _prepare_dragging = true;
        _cur_point = found;
        _cx = found.x;
        _cy = found.y;
      }
    },
    handleMouseMove(pos: { x: number; y: number }) {
      const { x, y } = pos;
      _mx2 = x;
      _my2 = y;
      if (_debug) {
        bus.emit(Events.Update);
      }
      // if (_pen_editing && !_prepare_dragging && !inGrid(pos)) {
      //   return;
      // }
      if (_pen_editing) {
        const _inGrid = inGrid(pos);
        if (!_inGrid) {
          if (_out_grid === false) {
            // 出去的那刻
            if (!_dragging && _moving_for_new_line && _cur_path_point) {
              _cur_path_point.setHidden(true);
              bus.emit(Events.Update);
            }
          }
          _out_grid = true;
          if (!_dragging) {
            return;
          }
        }
        if (_inGrid) {
          if (_out_grid === true) {
            // 进入的那刻
            if (_cur_path_point && _cur_path_point.hidden) {
              _cur_path_point.setHidden(false);
            }
          }
          _out_grid = false;
        }
        if (_prepare_dragging && _cur_path_point) {
          // console.log("start dragging");
          _dragging = true;
          _prepare_dragging = false;
          const to_of_cur_path_point = BezierPoint({
            x,
            y,
          });
          _cur_point = to_of_cur_path_point;
          _cur_path_point.setVirtual(false);
          _cur_path_point.setMirror(PathPointMirrorTypes.MirrorAngleAndLength);
          _cur_path_point.setTo(to_of_cur_path_point);
          if (_prev_path_point && _prev_path_point.start) {
            // 特殊情况
            const start = _prev_path_point;
            const p = getSymmetricPoint2(
              start.point,
              { x: _cur_path_point.point.x, y: _cur_path_point.point.y },
              { x, y },
              AUTO_CONTROLLER_POINT_LENGTH_RATIO
            );
            const to_of_prev_path_point = BezierPoint({
              x: p.x,
              y: p.y,
            });
            const unlisten = to_of_cur_path_point.onMove(() => {
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
              to_of_prev_path_point.move({ x: p.x, y: p.y });
            });
            _events.push(unlisten);
            start.setTo(to_of_prev_path_point);
          }
          if (_prev_path_point && _prev_path_point.to === null && _prev_path_point.from === null) {
            // 直线后，接曲线
            const prev_path_point = _prev_path_point;
            const p = getSymmetricPoint2(
              prev_path_point.point,
              { x: _cur_path_point.point.x, y: _cur_path_point.point.y },
              { x, y },
              AUTO_CONTROLLER_POINT_LENGTH_RATIO
            );
            const to_of_prev_path_point = BezierPoint({
              x: p.x,
              y: p.y,
            });
            const unlisten = to_of_cur_path_point.onMove(() => {
              if (!_cur_path_point) {
                return;
              }
              if (!_cur_path_point.to) {
                return;
              }
              const p = getSymmetricPoint2(
                prev_path_point.point,
                { x: _cur_path_point.point.x, y: _cur_path_point.point.y },
                { x: _cur_path_point.to.x, y: _cur_path_point.to.y },
                AUTO_CONTROLLER_POINT_LENGTH_RATIO
              );
              to_of_prev_path_point.move({ x: p.x, y: p.y });
            });
            _events.push(unlisten);
            prev_path_point.setTo(to_of_prev_path_point);
          }
        }
        if (_cur_point) {
          _ox = pos.x - _mx;
          _oy = pos.y - _my;
          _cur_point.move({
            x: _cx + _ox,
            y: _cy + _oy,
          });
          bus.emit(Events.Update);
        }
        return;
      }
      // if (!_prepare_dragging) {
      //   return;
      // }
      if (!_cur_point) {
        return;
      }
      _ox = pos.x - _mx;
      _oy = pos.y - _my;
      _cur_point.move({
        x: _cx + _ox,
        y: _cy + _oy,
      });
      bus.emit(Events.Update);
    },
    handleMouseUp(pos: { x: number; y: number }) {
      const { x, y } = pos;
      const path = _cur_path;
      if (!path) {
        return;
      }
      if (_pen_editing) {
        for (let i = 0; i < _events.length; i += 1) {
          _events[i]();
        }
        _events = [];
        const cur = path.getCurPoint();
        if (!cur) {
          return;
        }
        if (_cur_path_point && _cur_path_point.closed) {
          console.log("before closed path mouse up");
          // 闭合路径松开
          const start = path.start_point;
          start.setMirror(PathPointMirrorTypes.NoMirror);
          start.setEnd(true);
          console.log("set from for start point", _cur_path_point.from);
          if (_cur_path_point.from) {
            start.setFrom(_cur_path_point.from, { copy: true });
          }
          path.removeLastPoint();
          _prepare_dragging = false;
          _dragging = false;
          _moving_for_new_line = false;
          _cur_point = null;
          _cur_path_point = null;
          _pen_editing = 0;
          // if (_dragging) {
          // }
          bus.emit(Events.Update);
          return;
        }
        // console.log("_prepare_dragging / ", _prepare_dragging, _dragging, _cur_path_point);
        if (_dragging) {
          // 确定一个点后生成线条，拖动控制点改变线条曲率，然后松开
          if (!cur.from) {
            return;
          }
          _prepare_dragging = false;
          _dragging = false;
          _moving_for_new_line = true;
          const p = getSymmetricPoint2(cur.point, { x, y }, cur.from, AUTO_CONTROLLER_POINT_LENGTH_RATIO);
          const from_of_new_path_point = BezierPoint({
            x: p.x,
            y: p.y,
          });
          const new_path_point = PathPoint({
            point: BezierPoint({
              x: pos.x,
              y: pos.y,
            }),
            from: from_of_new_path_point,
            to: null,
            end: true,
            mirror: PathPointMirrorTypes.NoMirror,
          });
          _prev_path_point = cur;
          _prev_point = cur.point;
          _cur_path_point = new_path_point;
          _cur_point = new_path_point.point;
          path.appendPoint(new_path_point);
          _cur_point.onMove(() => {
            if (!_cur_point) {
              return;
            }
            if (!cur.from) {
              return;
            }
            const p = getSymmetricPoint2(
              cur.point,
              { x: _cur_point.x, y: _cur_point.y },
              { x: cur.from.x, y: cur.from.y },
              AUTO_CONTROLLER_POINT_LENGTH_RATIO
            );
            from_of_new_path_point.move({
              x: p.x,
              y: p.y,
            });
          });
          return;
        }
        if (_prepare_dragging && !_dragging) {
          // 确定一个点后生成线条，没有拖动控制点改变线条曲率，直接松开。这里直线曲线都可能
          // @todo 如果本来是创建曲线，结果实际上创建了直线，应该移除曲线的控制点，变成真正的直线
          console.log("初始化下一个坐标点", _cur_path_point?.mirror);
          _moving_for_new_line = true;
          _prepare_dragging = false;
          _dragging = false;
          if (_cur_path_point) {
            _cur_path_point.setVirtual(false);
            _cur_path_point.setMirror(PathPointMirrorTypes.NoMirror);
          }
          const new_path_point = PathPoint({
            point: BezierPoint({
              x: pos.x,
              y: pos.y,
            }),
            from: null,
            to: null,
            end: true,
          });
          _prev_path_point = cur;
          _prev_point = cur.point;
          _cur_path_point = new_path_point;
          _cur_point = new_path_point.point;
          path.appendPoint(new_path_point);
          return;
        }
        return;
      }
      if (!_prepare_dragging) {
        return;
      }
      _prepare_dragging = false;
      _dragging = false;
      // _cur_point = null;
      _cur_path_point = null;
    },
    get debug() {
      return _debug;
    },
    setDebug() {
      _debug = !_debug;
    },
    handleMouseOut() {},
    onUpdate(handler: Handler<TheTypesOfEvents[Events.Update]>) {
      return bus.on(Events.Update, handler);
    },
  };
}

export type Canvas = ReturnType<typeof Canvas>;
