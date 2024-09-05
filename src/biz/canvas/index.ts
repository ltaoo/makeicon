import { base, Handler } from "@/domains/base";
import { CircleCurved, PathPoint, PathPointMirrorTypes } from "@/biz/path_point";
import {
  calculateCircleCenter,
  getSymmetricPoint2,
  isCollinear,
  toBase64,
  calculateCircleArcs,
  getSymmetricPoints,
} from "@/biz/path_point/utils";
import { BezierPath } from "@/biz/bezier_path";
import { BezierPoint } from "@/biz/bezier_point";
import { SVGParser } from "@/biz/svg/parser";

const AUTO_CONTROLLER_POINT_LENGTH_RATIO = 0.42;

enum Events {
  Update,
  Change,
}
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
  let _dpr = 1;
  /** 网格区域信息 */
  let _grid = {
    x: 0,
    y: 0,
    width: 512,
    height: 512,
    lineWidth: 0.5,
    color: "#cccccc",
    // width: 600,
    // height: 600,
    // width: 1024,
    // height: 1024,
  };
  /** 两种情况，钢笔工具时，确定了坐标点，开始拖动改变控制点位置；移动工具时，点击了点，开始拖动改变点位置 */
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
  let _pen_editing = 0;
  /** 当前是否激活选择工具 */
  let _cursor_editing = 0;
  let _events: (() => void)[] = [];
  let _debug = false;

  let _state = {
    get cursor() {
      return _cursor_editing;
    },
    get pen() {
      return _pen_editing;
    },
  };
  type TheTypesOfEvents = {
    [Events.Update]: void;
    [Events.Change]: typeof _state;
  };
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
    // console.log("_points count", _points.length);
    _path_points = path_points;
    // console.log("_path_points count", _path_points.length);
  }

  return {
    SymbolTag: "Canvas" as const,
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
    get state() {
      return _state;
    },
    get size() {
      return _size;
    },
    setSize(size: { width: number; height: number }) {
      Object.assign(_size, size);
    },
    setDPR(v: number) {
      _dpr = v;
    },
    get grid() {
      return _grid;
    },
    setGrid(grid: { x: number; y: number; width?: number; height?: number }) {
      Object.assign(_grid, grid);
    },
    normalizeX(v: number, extra: Partial<{ scale: number; precision: number; isExport: boolean }> = {}) {
      const { scale = 1, precision = 2, isExport } = extra;
      const offset = 0;
      const v1 = v * scale;
      const v2 = isExport ? v1 - offset : v1 + offset;
      const x = parseFloat(v2.toFixed(precision));
      return x;
      // return v;
    },
    normalizeY(v: number, extra: Partial<{ scale: number; precision: number; isExport: boolean }> = {}) {
      const { scale = 1, precision = 2, isExport } = extra;
      const offset = 0;
      const v1 = v * scale;
      const v2 = isExport ? v1 - offset : v1 + offset;
      const y = parseFloat(v2.toFixed(precision));
      return y;
      // return v;
    },
    translateX(v: number) {
      return v + _grid.x;
      // return v;
    },
    translateY(v: number) {
      return v + _grid.y;
      // return v;
    },
    translate(pos: { x: number; y: number }) {
      return {
        x: this.translateX(pos.x),
        y: this.translateY(pos.y),
      };
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
    cancelPen() {},
    selectPen() {
      _pen_editing = 1;
      bus.emit(Events.Change, { ..._state });
    },
    cancelCursor() {
      _cursor_editing = 0;
      bus.emit(Events.Update);
      bus.emit(Events.Change, { ..._state });
    },
    selectCursor() {
      _cursor_editing = 1;
      if (_pen_editing) {
        const path = _cur_path;
        if (!path) {
          return;
        }
        path.removeLastPoint();
        return;
      }
      _pen_editing = 0;
      _cur_path_point = null;
      _cur_point = null;
      updatePoints();
      bus.emit(Events.Update);
      bus.emit(Events.Change, { ..._state });
    },
    exportSVG(options: Partial<{ cap: "round" | "none" }> = {}) {
      const scale = 1;
      let svg = `<svg width="${_grid.width * scale}" height="${
        _grid.height * scale
      }" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" class="icon" version="1.1"><g class="layer">`;
      let d = "";
      for (let i = 0; i < _paths.length; i += 1) {
        const path = _paths[i];
        // const { outline } = path.buildOutline({ cap: options.cap, scene: 1 });
        // const first = outline[0];
        // if (!first) {
        //   svg += "</svg>";
        //   return svg;
        // }
        // for (let i = 0; i < outline.length; i += 1) {
        //   const curve = outline[i];
        //   const [start, c1, c2, end] = curve.points;
        //   // console.log(start, c1, c2, end);
        //   if (i === 0 && start) {
        //     d += `M${this.transformPos(start, { scale }).join(" ")}`;
        //   }
        //   (() => {
        //     if (curve._linear) {
        //       d += `L${this.transformPos(c2, { scale }).join(" ")}`;
        //       return;
        //     }
        //     if (end) {
        //       d += `C${[
        //         ...this.transformPos(c1, { scale }),
        //         ...this.transformPos(c2, { scale }),
        //         ...this.transformPos(end, { scale }),
        //       ].join(" ")}`;
        //       return;
        //     }
        //     d += `Q${[...this.transformPos(c1, { scale }), ...this.transformPos(c2, { scale })].join(" ")}`;
        //   })();
        // }
        // d += "Z";
        const commands = path.buildCommands();
        for (let i = 0; i < commands.length; i += 1) {
          const { c, a } = commands[i];
          if (i === 0) {
            d += `M${this.transformPos({ x: a[0], y: a[1] }, { scale }).join(" ")}`;
          }
          (() => {
            if (c === "L") {
              d += `L${this.transformPos({ x: a[0], y: a[1] }, { scale }).join(" ")}`;
              return;
            }
            if (c === "C") {
              d += `C${[
                ...this.transformPos({ x: a[0], y: a[1] }, { scale }),
                ...this.transformPos({ x: a[2], y: a[3] }, { scale }),
                ...this.transformPos({ x: a[4], y: a[5] }, { scale }),
              ].join(" ")}`;
              return;
            }
            if (c === "Q") {
              d += `Q${[
                ...this.transformPos({ x: a[0], y: a[1] }, { scale }),
                ...this.transformPos({ x: a[2], y: a[3] }, { scale }),
              ].join(" ")}`;
            }
          })();
        }
      }
      svg += `<path d="${d}" fill="#111111" id="svg_1" />`;
      // if (path.state.stroke.enabled) {
      // }
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
    setPaths(
      paths: BezierPath[],
      extra: Partial<{ transform: boolean; dimensions: { width: number; height: number } }> = {}
    ) {
      _paths = paths;
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
    buildBezierPathsFromPathString(svg: string) {
      const data = SVGParser.parse_svg(svg);
      const paths = [];
      const { dimensions } = data;
      const xExtra = {
        exp: false,
        scale: dimensions ? _grid.width / dimensions.width : 1,
      };
      const yExtra = {
        exp: false,
        scale: dimensions ? _grid.height / dimensions.height : 1,
      };
      // console.log("extra", xExtra.scale, yExtra.scale, dimensions, _grid.width, _grid.height);
      for (let j = 0; j < data.paths.length; j += 1) {
        const pathPayload = data.paths[j];
        const content = pathPayload.d;
        const tokens = SVGParser.parse_path(content);
        let cur_path: BezierPath | null = null;
        let cur_path_point: PathPoint | null = null;
        let prev_path_point: PathPoint | null = null;
        let prev_point = { x: 0, y: 0 };
        let start_path_point: PathPoint | null = null;
        function moveTo(p: { x: number; y: number }, extra: Partial<{ is_relative: boolean }> = {}) {
          p.x += prev_point.x;
          p.y += prev_point.y;
        }
        console.log("tokens", tokens);
        for (let i = 0; i < tokens.length; i += 1) {
          const prev = tokens[i - 1];
          const cur = tokens[i];
          const next = tokens[i + 1];
          const [command, ...args] = cur;
          const values = args.map((v) => Number(v));
          // console.log("cur command is", command);
          if (["M", "m"].includes(command)) {
            let v0 = values[0];
            let v1 = values[1];
            let p = {
              x: this.normalizeX(v0, xExtra),
              y: this.normalizeX(v1, yExtra),
            };
            if (command === "m") {
              moveTo(p);
            } else {
              p = this.translate(p);
            }
            prev_point = p;
            // console.log("create a start point", command, p);
            const point = PathPoint({
              point: BezierPoint(p),
              from: null,
              to: null,
              start: true,
              virtual: false,
            });
            start_path_point = point;
            cur_path_point = point;
            const new_path = BezierPath({
              points: [point],
              fill: pathPayload.fill
                ? {
                    color: pathPayload.fill,
                  }
                : null,
              stroke: pathPayload.stroke
                ? {
                    color: pathPayload.stroke,
                    width: pathPayload.strokeWidth || 1,
                  }
                : null,
            });
            paths.push(new_path);
            if (i !== 0 && cur_path) {
              // 在一个 <path d="" 路径中，有多个开头，就把当前这个和前一个 关联 起来
              // cur_path.setNext(new_path);
              new_path.setPrev(cur_path);
            }
            cur_path = new_path;
          }
          if (["Z", "z"].includes(command) && cur_path && start_path_point) {
            start_path_point.setEnd(true);
            start_path_point.setClosed();
            cur_path.setClosed();
          }
          if (next && cur_path) {
            const [next_command, ...next_args] = next;
            const next_values = next_args.map((v) => Number(v));
            // console.log("next command is", next_command);
            if (["A", "a"].includes(next_command)) {
              const [rx, ry, rotate, t1, t2, x, y] = next_values;
              // @todo 这里是默认必定是圆形，但也可能是椭圆，后面支持吧。
              let p1 = { ...prev_point };
              let p2 = { x: this.normalizeX(x, xExtra), y: this.normalizeY(y, yExtra) };
              const radius = this.normalizeX(rx, xExtra);
              if (next_command === "a") {
                // p2 = {
                //   x: this.normalizeX(x, { ...xExtra, pureValue: true }),
                //   y: this.normalizeY(y, { ...yExtra, pureValue: true }),
                // };
                moveTo(p2);
              } else {
                p2 = this.translate(p2);
              }
              prev_point = p2;
              const is_reverse = p1.x > p2.x;
              const centers = calculateCircleCenter(p1, p2, radius);
              if (centers) {
                const [index1, index2] = (() => {
                  if (t1 === 0 && t2 === 0) {
                    return [0, 1];
                  }
                  if (t1 === 0 && t2 === 1) {
                    return [1, 0];
                  }
                  if (t1 === 1 && t2 === 0) {
                    return [1, 1];
                  }
                  if (t1 === 1 && t2 === 1) {
                    return [0, 0];
                  }
                  return [0, 1];
                })();
                const center = centers[index1];
                // console.log("centers", centers, center, index1);
                const arcs = calculateCircleArcs(center, p1, p2);
                const arc = arcs[index2];
                const circle: CircleCurved = {
                  center,
                  radius,
                  arc,
                  counterclockwise: (() => {
                    if (t1 === 0 && t2 === 0) {
                      // if (is_reverse) {
                      return true;
                      // }
                    }
                    // if (t1 === 0 && t2 === 1) {
                    //   return false;
                    // }
                    if (t1 === 1 && t2 === 0) {
                      if (is_reverse) {
                        return true;
                      }
                    }
                    // if (t1 === 1 && t2 === 1) {
                    // }
                    return false;
                  })(),
                  // start: p1,
                  // opt: [t1, t2],
                  // rotate,
                };
                // console.log("create point", next_command, next_values, p2, circle);
                const next_path_point = PathPoint({
                  point: BezierPoint(p2),
                  from: null,
                  to: null,
                  circle,
                  virtual: false,
                });
                cur_path_point = next_path_point;
                cur_path.appendPoint(next_path_point);
              }
            }
            if (["L", "l"].includes(next_command)) {
              let v0 = next_values[0];
              let v1 = next_values[1];
              let p = {
                x: this.normalizeX(v0, xExtra),
                y: this.normalizeY(v1, xExtra),
              };
              if (["l"].includes(next_command)) {
                // p = {
                //   x: this.normalizeX(v0, { ...xExtra, pureValue: true }),
                //   y: this.normalizeY(v1, { ...xExtra, pureValue: true }),
                // };
                moveTo(p);
              } else {
                p = this.translate(p);
              }
              prev_point = p;
              // console.log("create point", next_command, next, next_values, p);
              const next_path_point = PathPoint({
                point: BezierPoint(p),
                from: null,
                to: null,
                virtual: false,
              });
              cur_path_point = next_path_point;
              cur_path.appendPoint(next_path_point);
            }
            if (["V", "v", "H", "h"].includes(next_command)) {
              let distance = (() => {
                const v = next_values[0];
                if (["H", "h"].includes(next_command)) {
                  return this.normalizeX(v, xExtra);
                }
                if (["V", "v"].includes(next_command)) {
                  return this.normalizeY(v, yExtra);
                }
                return v;
              })();
              let p = {
                x: 0,
                y: 0,
              };
              if (next_command === "H") {
                p.x = this.translateX(distance);
                p.y = prev_point.y;
                // p = this.translate(p);
              }
              if (next_command === "V") {
                p.x = prev_point.x;
                p.y = this.translateY(distance);
                // p = this.translate(p);
              }
              if (next_command === "h") {
                distance += prev_point.x;
                // p.x = this.translateX(distance);
                p.x = distance;
                p.y = prev_point.y;
              }
              if (next_command === "v") {
                distance += prev_point.y;
                p.x = prev_point.x;
                // p.y = this.translateX(distance);
                p.y = distance;
              }
              prev_point = p;
              // console.log("create point", next_command, next, next_values, p);
              const next_path_point = PathPoint({
                point: BezierPoint(p),
                from: null,
                to: null,
                virtual: false,
              });
              cur_path_point = next_path_point;
              cur_path.appendPoint(next_path_point);
            }
            if (["C", "c"].includes(next_command)) {
              let v0 = next_values[0];
              let v1 = next_values[1];
              let v2 = next_values[2];
              let v3 = next_values[3];
              let v4 = next_values[4];
              let v5 = next_values[5];
              let a1 = {
                x: this.normalizeX(v0, xExtra),
                y: this.normalizeY(v1, yExtra),
              };
              let a2 = {
                x: this.normalizeX(v4, xExtra),
                y: this.normalizeY(v5, yExtra),
              };
              let a3 = {
                x: this.normalizeX(v2, xExtra),
                y: this.normalizeY(v3, yExtra),
              };
              if (["c"].includes(next_command)) {
                moveTo(a1);
                moveTo(a2);
                moveTo(a3);
              } else {
                a1 = this.translate(a1);
                a2 = this.translate(a2);
                a3 = this.translate(a3);
              }
              prev_point = a2;
              if (cur_path_point) {
                // 这里 cur_path_point 其实是 prev_path_point ？？？
                cur_path_point.setTo(BezierPoint(a1));
                if (cur_path_point.from) {
                  const collinear = isCollinear(cur_path_point.from.pos, cur_path_point.point.pos, a1);
                  cur_path_point.setMirror(PathPointMirrorTypes.NoMirror);
                  if (collinear.collinear) {
                    cur_path_point.setMirror(PathPointMirrorTypes.MirrorAngle);
                    if (collinear.midpoint) {
                      cur_path_point.setMirror(PathPointMirrorTypes.MirrorAngleAndLength);
                    }
                  }
                }
              }
              // console.log("create point", next_command, a2);
              const next_path_point = PathPoint({
                point: BezierPoint(a2),
                from: BezierPoint(a3),
                to: null,
                virtual: false,
              });
              cur_path_point = next_path_point;
              cur_path.appendPoint(next_path_point);
            }
            if (["S", "s"].includes(next_command)) {
              console.log("command S or s", !!cur_path_point, !!cur_path_point?.from, next_values);
              if (cur_path_point && cur_path_point.from) {
                let v0 = next_values[0];
                let v1 = next_values[1];
                let v2 = next_values[2];
                let v3 = next_values[3];
                let a2 = {
                  x: this.normalizeX(v0, xExtra),
                  y: this.normalizeY(v1, yExtra),
                };
                let a3 = {
                  x: this.normalizeX(v2, xExtra),
                  y: this.normalizeY(v3, yExtra),
                };
                if (["s"].includes(next_command)) {
                  moveTo(a2);
                  moveTo(a3);
                } else {
                  a2 = this.translate(a2);
                  a3 = this.translate(a3);
                }
                prev_point = a3;
                const a1 = getSymmetricPoints(cur_path_point.point.pos, cur_path_point.from.pos);
                cur_path_point.setTo(BezierPoint(a1));
                cur_path_point.setMirror(PathPointMirrorTypes.MirrorAngleAndLength);
                // console.log("before create next_path_point", a2, a3);
                const next_path_point = PathPoint({
                  point: BezierPoint({ x: a3.x, y: a3.y }),
                  from: BezierPoint({ x: a2.x, y: a2.y }),
                  to: null,
                  virtual: false,
                });
                cur_path_point = next_path_point;
                cur_path.appendPoint(next_path_point);
              }
            }
            if (["Q", "q", "T", "t"].includes(next_command)) {
              const v0 = next_values[0];
              const v1 = next_values[1];
              const v4 = next_values[4];
              const v5 = next_values[5];
              let a1 = {
                x: this.normalizeX(v0, xExtra),
                y: this.normalizeY(v1, yExtra),
              };
              let a2 = {
                x: this.normalizeX(v4, xExtra),
                y: this.normalizeY(v5, yExtra),
              };
              if (["q", "t"].includes(next_command)) {
                // a1 = {
                //   x: this.normalizeX(v0, { ...xExtra, pureValue: true }),
                //   y: this.normalizeY(v1, { ...yExtra, pureValue: true }),
                // };
                // a2 = {
                //   x: this.normalizeX(v4, { ...xExtra, pureValue: true }),
                //   y: this.normalizeY(v5, { ...yExtra, pureValue: true }),
                // };
                moveTo(a1);
                moveTo(a2);
              } else {
                a1 = this.translate(a1);
                a2 = this.translate(a2);
              }
              prev_point = a2;
              if (cur_path_point) {
                cur_path_point.setTo(BezierPoint(a1));
                if (cur_path_point.from) {
                  const collinear = isCollinear(cur_path_point.from.pos, cur_path_point.point.pos, a1);
                  cur_path_point.setMirror(PathPointMirrorTypes.NoMirror);
                  if (collinear.collinear) {
                    cur_path_point.setMirror(PathPointMirrorTypes.MirrorAngle);
                    if (collinear.midpoint) {
                      cur_path_point.setMirror(PathPointMirrorTypes.MirrorAngleAndLength);
                    }
                  }
                }
              }
              // console.log("create point", next_command, a2);
              const next_path_point = PathPoint({
                point: BezierPoint(a2),
                from: null,
                to: null,
                virtual: false,
              });
              cur_path_point = next_path_point;
              cur_path.appendPoint(next_path_point);
            }
          }
        }
      }
      return {
        paths,
        dimensions: data.dimensions,
      };
    },
    update() {
      bus.emit(Events.Update);
    },
    handleMouseDown(pos: { x: number; y: number }) {
      const { x, y } = pos;
      console.log("[BIZ]canvas/index - handleMouseDown before if (_pen_editing)", _pen_editing);
      if (_pen_editing) {
        if (!inGrid(pos)) {
          return;
        }
        const found = checkIsClickPathPoint(pos);
        console.log("[BIZ]canvas/index has matched point", found, _cur_path_point, _cur_point);
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
      if (_cursor_editing) {
        _mx = x;
        _my = y;
        const found = checkIsClickPoint(pos);
        console.log("[BIZ]canvas/index - after checkIsClickPoint(pos)", found);
        if (found) {
          _prepare_dragging = true;
          _cur_point = found;
          _cx = found.x;
          _cy = found.y;
        }
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
      if (_cursor_editing) {
        if (!_prepare_dragging) {
          return;
        }
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
      }
    },
    handleMouseUp(pos: { x: number; y: number }) {
      const { x, y } = pos;
      _mx = 0;
      _my = 0;
      _cx = 0;
      _cy = 0;
      _ox = 0;
      _oy = 0;
      if (_pen_editing) {
        const path = _cur_path;
        if (!path) {
          return;
        }
        for (let i = 0; i < _events.length; i += 1) {
          _events[i]();
        }
        _events = [];
        const cur = path.getCurPoint();
        if (!cur) {
          return;
        }
        if (_cur_path_point && _cur_path_point.closed) {
          // console.log("before closed path mouse up");
          // 闭合路径松开
          const start = path.start_point;
          start.setMirror(PathPointMirrorTypes.NoMirror);
          start.setEnd(true);
          // console.log("set from for start point", _cur_path_point.from);
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
      if (_cursor_editing) {
        if (!_prepare_dragging) {
          return;
        }
        _prepare_dragging = false;
        _dragging = false;
        _cur_point = null;
        _cur_path_point = null;
      }
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
