import { PathPoint, PathPointMirrorTypes } from "@/biz/path_point";
import { BezierPath } from "@/biz/bezier_path";
import { base, Handler } from "@/domains/base";
import { BezierPoint } from "@/biz/bezier_point";
import { getSymmetricPoint2, toBase64 } from "@/biz/path_point/utils";

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
  let _points = paths.reduce((prev, cur) => {
    return prev.concat(cur.points);
  }, [] as BezierPoint[]);
  let _mx = 0;
  let _my = 0;
  let _cx = 0;
  let _cy = 0;
  let _ox = 0;
  let _oy = 0;
  let _size = {
    width: 0,
    height: 0,
  };
  let _grid = {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  };
  let _dragging = false;
  let _moving_for_new_line = false;
  let _has_moving_after_down = false;
  let _prev_path_point: PathPoint | null = null;
  let _cur_path_point: PathPoint | null = null;
  let _prev_point: BezierPoint | null = null;
  let _cur_point: BezierPoint | null = null;
  // 编辑、工具等相关状态
  let _pen_editing = 1;
  let _events: (() => void)[] = [];
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
  function inGrid(pos: { x: number; y: number }) {
    if (pos.x >= _grid.x && pos.x <= _grid.x + _grid.width && pos.y >= _grid.y && pos.y <= _grid.y + _grid.height) {
      return true;
    }
    return false;
  }

  return {
    get grid() {
      return _grid;
    },
    drawLine(p1: { x: number; y: number }, p2: { x: number; y: number }) {
      console.log("请实现 drawLine 方法");
    },
    drawCurve(curve: { points: { x: number; y: number }[] }) {
      console.log("请实现 drawCurve 方法");
    },
    drawCircle(point: { x: number; y: number }, radius: number) {
      console.log("请实现 drawCircle 方法");
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
    setGrid(grid: { x: number; y: number; width: number; height: number }) {
      Object.assign(_grid, grid);
    },
    transformPos(pos: { x: number; y: number }, extra: Partial<{ scale: number; precision: number }> = {}) {
      const { scale = 1, precision = 2 } = extra;
      const x = parseFloat(((pos.x - _grid.x) * scale).toFixed(precision));
      const y = parseFloat(((pos.y - _grid.y) * scale).toFixed(precision));
      return [x, y];
    },
    cancelPen() {
      const path = _paths[0];
      if (!path) {
        return;
      }
      if (_pen_editing) {
        path.removeLastPoint();
      }
      _pen_editing = 0;
      _cur_path_point = null;
      _cur_point = null;
      _points = paths.reduce((prev, cur) => {
        return prev.concat(cur.points);
      }, [] as BezierPoint[]);
      bus.emit(Events.Update);
    },
    selectPen() {
      _pen_editing = 1;
    },
    exportSVG() {
      const scale = 1;
      let svg = `<svg width="${_grid.width * scale}" height="${
        _grid.height * scale
      }" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" class="icon" version="1.1"><g class="layer">`;
      let d = "";
      for (let i = 0; i < _paths.length; i += 1) {
        const path = _paths[i];
        const { outline } = path.buildOutline("round");
        const first = outline[0];
        if (!first) {
          svg += "</svg>";
          return svg;
        }
        // ctx.beginPath();
        for (let i = 0; i < outline.length; i += 1) {
          const curve = outline[i];
          const [start, c1, c2, end] = curve.points;
          console.log(i);
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
    handleMouseDown(pos: { x: number; y: number }) {
      const { x, y } = pos;
      const path = _paths[0];
      if (!path) {
        return;
      }
      if (_pen_editing) {
        if (!inGrid(pos)) {
          return;
        }
        if (_moving_for_new_line && _cur_path_point) {
          // 创建点后移动，选择了一个位置，点击
          _dragging = true;
          const to_of_cur_path_point = BezierPoint({
            x,
            y,
          });
          _cur_path_point.setVirtual(false);
          _cur_path_point.setTo(to_of_cur_path_point);
          _cur_point = _cur_path_point.to;
          if (_prev_path_point && _prev_path_point.start) {
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
              to_of_prev_path_point.handleMove({ x: p.x, y: p.y });
            });
            _events.push(unlisten);
            start.setTo(to_of_prev_path_point);
          }
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
        _prev_path_point = start;
        _cur_path_point = end;
        _prev_point = start.point;
        _cur_point = end.point;
        path.appendPoint(start);
        path.appendPoint(end);
        return;
      }
      _mx = x;
      _my = y;
      const found = checkIsClickPoint(pos);
      if (found) {
        _dragging = true;
        _cur_point = found;
        _cx = found.x;
        _cy = found.y;
      }
    },
    handleMouseMove(pos: { x: number; y: number }) {
      //       const found = checkIsClickPoint(position);
      // console.log("[BIZ]canvas/index - handleMouseMove", _dragging, _mp);
      // const grid = [_grid.x, _grid.y, _grid.x + _grid.width, _grid.y + _grid.height];
      if (_pen_editing && !_dragging && !inGrid(pos)) {
        return;
      }
      if (_pen_editing && _moving_for_new_line) {
        if (_cur_point) {
          _ox = pos.x - _mx;
          _oy = pos.y - _my;
          _cur_point.handleMove({
            x: _cx + _ox,
            y: _cy + _oy,
          });
          bus.emit(Events.Update);
        }
        return;
      }
      if (!_dragging) {
        return;
      }
      if (!_cur_point) {
        return;
      }
      _ox = pos.x - _mx;
      _oy = pos.y - _my;
      _cur_point.handleMove({
        x: _cx + _ox,
        y: _cy + _oy,
      });
      bus.emit(Events.Update);
    },
    handleMouseUp(pos: { x: number; y: number }) {
      const { x, y } = pos;
      const path = _paths[0];
      if (!path) {
        return;
      }
      if (_pen_editing) {
        for (let i = 0; i < _events.length; i += 1) {
          _events[i]();
        }
        _events = [];
        const cur = path.getCurPoint();
        if (_moving_for_new_line && _dragging) {
          if (!cur) {
            return;
          }
          if (!cur.from) {
            return;
          }
          // 确定一个点后生成线条，拖动控制点改变线条曲率，然后松开
          _dragging = false;
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
            mirror: PathPointMirrorTypes.MirrorAngleAndLength,
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
            from_of_new_path_point.handleMove({
              x: p.x,
              y: p.y,
            });
          });
          return;
        }
      }
      if (!_dragging) {
        return;
      }
      _dragging = false;
      _cur_point = null;
      _cur_path_point = null;
    },
    handleMouseOut() {},
    onUpdate(handler: Handler<TheTypesOfEvents[Events.Update]>) {
      return bus.on(Events.Update, handler);
    },
  };
}

export type Canvas = ReturnType<typeof Canvas>;
