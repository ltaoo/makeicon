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
import { PathParser } from "@/biz/svg/path-parser";
import { objectToHTML } from "@/utils";

import { CanvasLayer } from "./layer";
import { Position } from "./types";
import { CanvasRangeSelection } from "./range";

const AUTO_CONTROLLER_POINT_LENGTH_RATIO = 0.42;
export type CursorType = "select" | "pen";
const debug = false;
export enum CanvasModes {
  Default = 1,
}

type CanvasProps = {
  paths: Line[];
};
export function Canvas(props: CanvasProps) {
  const { paths } = props;

  let _mounted = false;
  let _lines = paths;
  let _paths = _lines.reduce((prev, cur) => {
    return prev.concat(cur.paths);
  }, [] as LinePath[]);
  let _points: Point[] = [];
  let _path_points: BezierPoint[] = [];
  let _layers: CanvasLayer[] = [
    // 最顶上的图层，绘制了网格线
    CanvasLayer({
      index: 1,
      zIndex: 999,
      disabled: true,
      onMounted(layer) {
        layer.drawGrid(() => {
          console.log("The Grid has Draw");
        });
      },
    }),
    // 绘制了锚点、路径
    CanvasLayer({
      index: 2,
      zIndex: 99,
    }),
    // 绘制了填充、描边
    CanvasLayer({
      index: 3,
      zIndex: 9,
    }),
  ];
  const _$selection = CanvasRangeSelection();
  let _cur_layer = _layers[_layers.length - 1];
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
    unit: 16,
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
  let _moving_object = false;
  /** 当前是否处于拖动 坐标点或锚点 */
  let _dragging = false;
  let _out_grid = true;
  /** 之前拖动过的路径点 */
  let _prev_path_point: BezierPoint | null = null;
  /** 当前拖动的路径点 */
  let _cur_path_point: BezierPoint | null = null;
  /** 之前拖动过的点，可能是 锚点、坐标点 */
  let _prev_point: Point | null = null;
  /** 当前拖动的点，可能是 锚点、坐标点 */
  let _cur_point: Point | null = null;
  let _cur_line_path: LinePath | null = null;
  let _cur_line: Line = _lines[0];
  // if (!_cur_path) {
  //   _cur_path = Path({});
  //   _paths.push(_cur_path);
  // }
  /** 物体编辑模式/选择工具 */
  let _global_cursor = 0;
  /** 路径编辑模式/钢笔工具 */
  let _editing_pen = 0;
  /** 路径编辑模式/选择工具 */
  let _editing_cursor = 1;
  /** 画布上的图形 */
  let _objects: {}[] = [];
  let _events: (() => void)[] = [];
  let _debug = false;

  const _state = {
    get mode() {
      if (_editing_cursor) {
        return 3;
      }
      if (_editing_pen) {
        return 2;
      }
      return 1;
    },
    get cursor(): CursorType {
      if (_editing_cursor) {
        return "select";
      }
      if (_editing_pen) {
        return "pen";
      }
      return "select";
    },
    get pen() {
      return _editing_pen;
    },
  };

  enum Events {
    Update,
    Change,
  }
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

  return {
    SymbolTag: "Canvas" as const,
    state: _state,
    get layers() {
      return _layers;
    },
    $selection: _$selection,
    createLayer() {},
    appendLayer(layer: CanvasLayer) {
      if (_layers.includes(layer)) {
        return;
      }
      _layers.push(layer);
    },
    get layer() {
      return _cur_layer;
    },
    get size() {
      return _size;
    },
    setSize(size: { width: number; height: number }) {
      Object.assign(_size, size);
    },
    get mounted() {
      return _mounted;
    },
    setMounted() {
      _mounted = true;
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
      if (debug) {
        return v;
      }
      const { scale = 1, precision = 3, isExport } = extra;
      const offset = 0;
      const v1 = v * scale;
      const v2 = isExport ? v1 - offset : v1 + offset;
      const x = parseFloat(v2.toFixed(precision));
      return x;
    },
    normalizeY(v: number, extra: Partial<{ scale: number; precision: number; isExport: boolean }> = {}) {
      if (debug) {
        return v;
      }
      const { scale = 1, precision = 3, isExport } = extra;
      const offset = 0;
      const v1 = v * scale;
      const v2 = isExport ? v1 - offset : v1 + offset;
      const y = parseFloat(v2.toFixed(precision));
      return y;
    },
    translateX(v: number) {
      if (debug) {
        return v;
      }
      return v + _grid.x;
    },
    translateY(v: number) {
      if (debug) {
        return v;
      }
      return v + _grid.y;
    },
    translate(pos: { x: number; y: number }) {
      if (_editing_pen) {
        return {
          x: pos.x,
          y: pos.y,
        };
      }
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
    transformPos2(pos: { x: number; y: number }, extra: Partial<{ scale: number; precision: number }> = {}) {
      const { precision = 2 } = extra;
      // const x = this.normalizeX(pos.x, extra);
      // const y = this.normalizeY(pos.y, extra);
      const x = parseFloat((pos.x - _grid.x).toFixed(precision));
      const y = parseFloat((pos.y - _grid.y).toFixed(precision));
      return [x, y];
    },
    deleteCurPoint() {
      if (!_cur_point) {
        return;
      }
      // for (let i = 0; i < _bezier_paths.length; i += 1) {
      //   const path = paths[i];
      //   path.deletePoint(_cur_point);
      // }
      bus.emit(Events.Update);
    },
    getCurPath() {
      return _cur_line_path;
    },
    selectPen() {
      _editing_cursor = 0;
      _editing_pen = 1;
      _global_cursor = 0;
      _cur_line = Line({
        fill: {
          color: "#111111",
        },
      });
      _lines.push(_cur_line);
      bus.emit(Events.Change, { ..._state });
    },
    selectCursor() {
      if (_editing_pen && _cur_line_path) {
        _cur_line_path.removeLastVirtualPoint();
      }
      _editing_pen = 0;
      _editing_cursor = 1;
      _global_cursor = 0;
      _cur_path_point = null;
      _cur_point = null;
      updatePoints();
      bus.emit(Events.Update);
      bus.emit(Events.Change, { ..._state });
    },
    /**
     * 画布模式
     * 对画布上的物体进行位置、大小等属性调整
     */
    selectObject() {
      _editing_cursor = 0;
      _editing_pen = 0;
      _global_cursor = 1;
      bus.emit(Events.Update);
      bus.emit(Events.Change, { ..._state });
    },
    buildSVGPaths(options: Partial<{ scale: number }> = {}) {
      const { scale } = options;
      const path_string_arr: (Line["state"] & { d: string })[] = [];
      // console.log("[BIZ]canvas/index - buildSVGPaths before for(let i", paths.length);
      for (let i = 0; i < _lines.length; i += 1) {
        const path = _lines[i];
        let d = "";
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
        for (let j = 0; j < path.paths.length; j += 1) {
          const commands = path.paths[j].buildCommands();
          for (let i = 0; i < commands.length; i += 1) {
            const { c, a, a2 } = commands[i];
            if (i === 0) {
              d += `M${this.transformPos2({ x: a[0], y: a[1] }, { scale }).join(" ")}`;
            }
            (() => {
              if (c === "L") {
                d += `L${this.transformPos2({ x: a[0], y: a[1] }, { scale }).join(" ")}`;
                return;
              }
              if (c === "A" && a2) {
                const end = [a2[5], a2[6]];
                const rrr = [
                  a2[0],
                  a2[1],
                  a2[2],
                  a2[3],
                  a2[4],
                  ...this.transformPos2({ x: end[0], y: end[1] }, { scale }),
                ].join(" ");
                d += `A${rrr}`;
                return;
              }
              if (c === "C") {
                d += `C${[
                  ...this.transformPos2({ x: a[0], y: a[1] }, { scale }),
                  ...this.transformPos2({ x: a[2], y: a[3] }, { scale }),
                  ...this.transformPos2({ x: a[4], y: a[5] }, { scale }),
                ].join(" ")}`;
                return;
              }
              if (c === "Q") {
                d += `Q${[
                  ...this.transformPos2({ x: a[0], y: a[1] }, { scale }),
                  ...this.transformPos2({ x: a[2], y: a[3] }, { scale }),
                ].join(" ")}`;
              }
            })();
          }
        }
        path_string_arr.push({
          d,
          fill: path.state.fill,
          stroke: path.state.stroke,
          composite: path.state.composite,
        });
      }
      return path_string_arr;
    },
    buildSVGJSON(options: Partial<{ cap: LineCapType; join: LineJoinType; width: number; height: number }> = {}) {
      const scale = 1;
      const box = {
        width: _grid.width * scale,
        height: _grid.height * scale,
      };
      const size = {
        width: options.width || box.width,
        height: options.height || box.height,
      };
      const arr = this.buildSVGPaths({ scale });
      // console.log("[BIZ]canvas/index - buildSVGJSON after this.buildSVGPaths", arr);
      if (arr.length === 0) {
        return null;
      }
      const paths: Record<string, string>[] = arr.map((d, i) => {
        const data: {
          id: string;
          tag: string;
          d: string;
          fill?: string;
          stroke?: string;
          "stroke-width"?: string;
          "stroke-linecap"?: string;
          "stroke-linejoin"?: string;
        } = {
          id: `svg_${i + 1}`,
          tag: "path",
          d: d.d,
        };
        if (d.fill.enabled) {
          data.fill = d.fill.color;
        }
        if (d.stroke.enabled) {
          data.stroke = d.stroke.color;
          if (d.stroke.width) {
            data["stroke-width"] = String(d.stroke.width * _grid.unit);
          }
          if (d.stroke.start_cap) {
            data["stroke-linecap"] = d.stroke.start_cap;
          }
          if (d.stroke.join) {
            data["stroke-linejoin"] = d.stroke.join;
          }
        }
        return data;
      });
      const svg = {
        tag: "svg",
        viewBox: `0 0 ${box.width} ${box.height}`,
        width: size.width,
        height: size.height,
        xmlns: "http://www.w3.org/2000/svg",
        "xmlns:svg": "http://www.w3.org/2000/svg",
        class: "icon",
        version: "1.1",
        fill: "none",
        children: paths,
      };
      // path.fill = "#111111";
      // const svg = `<svg viewBox="0 0 ${box.width} ${box.height}" width="${size.width}" height="${size.height}" xmlns="http://www.w3.org/2000/svg" xmlns:svg="http://www.w3.org/2000/svg" class="icon" version="1.1"><g class="layer">`;
      // svg += `<path d="${d}" fill="#111111" id="svg_1" />`;
      // if (path.state.stroke.enabled) {
      // }
      return svg;
    },
    buildSVG(options: Partial<{ cap: LineCapType; join: LineJoinType; width: number; height: number }> = {}) {
      const r = this.buildSVGJSON(options);
      if (!r) {
        return null;
      }
      return objectToHTML(r);
    },
    buildWeappCode() {
      const svg = this.buildSVGJSON();
      if (!svg) {
        return null;
      }
      const str = objectToHTML(svg);
      const url = toBase64(str, { doubleQuote: true });
      const template = `.icon-example {\n\t-webkit-mask:url('${url}') no-repeat 50% 50%;\n\t-webkit-mask-size: cover;\n}`;
      return template;
    },
    preview() {
      const svg = this.buildSVGJSON();
      if (!svg) {
        return [];
      }
      console.log("[BIZ]canvas - preview", svg);
      svg.width = 64;
      svg.height = 64;
      const str1 = objectToHTML(svg);
      svg.width = 32;
      svg.height = 32;
      const str2 = objectToHTML(svg);
      svg.width = 24;
      svg.height = 24;
      const str3 = objectToHTML(svg);
      return [
        { content: str3, text: "24x24", width: "24px", height: "24px" },
        { content: str2, text: "32x32", width: "32px", height: "32px" },
        { content: str1, text: "64x64", width: "64px", height: "64px" },
      ];
    },
    getMousePoint() {
      return {
        x: _mx2,
        y: _my2,
        // text: `${_mx2 - _grid.x},${_my2 - _grid.y}`,
        text: `${_mx2},${_my2}`,
      };
    },
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
    get paths() {
      return _lines;
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
    buildBezierPathsFromPathString(svg: string) {
      if (!svg.startsWith("<svg")) {
        return null;
      }
      const data = PathParser.parse_svg(svg);
      const paths: Line[] = [];
      const { dimensions } = data;
      const xExtra = {
        exp: false,
        scale: dimensions ? _grid.width / dimensions.width : 1,
      };
      const yExtra = xExtra;
      // console.log("extra", xExtra.scale, yExtra.scale, dimensions, _grid.width, _grid.height);
      for (let j = 0; j < data.paths.length; j += 1) {
        const payload = data.paths[j];
        const content = payload.d;
        const tokens = PathParser.parse(content);
        const pppp = Line({
          fill: payload.fill
            ? {
                color: payload.fill,
              }
            : null,
          stroke: payload.stroke
            ? {
                color: payload.stroke,
                width: payload.strokeWidth || 1,
                cap: payload.lineCap,
                join: payload.lineJoin,
              }
            : null,
        });
        this.buildPath(pppp, tokens, xExtra);
        paths.push(pppp);
      }
      return {
        paths,
        dimensions: data.dimensions,
      };
    },
    buildPath(path: Line, tokens: string[][], xExtra: { exp: boolean; scale: number }) {
      const yExtra = xExtra;

      let composite_relative_path: LinePath | null = null;
      let cur_path: LinePath | null = null;
      let cur_path_point: BezierPoint | null = null;
      let prev_path_point: BezierPoint | null = null;
      let prev_point = { x: 0, y: 0 };
      let start_path_point: BezierPoint | null = null;
      let prev_start = { x: 0, y: 0 };
      function moveTo(p: { x: number; y: number }, extra: Partial<{ is_relative: boolean }> = {}) {
        p.x += prev_point.x;
        p.y += prev_point.y;
      }
      // console.log("tokens", tokens, payload);
      for (let i = 0; i < tokens.length; i += 1) {
        const prev = tokens[i - 1];
        const cur = tokens[i];
        const next = tokens[i + 1];
        const [command, ...args] = cur;
        const values = args.map((v) => Number(v));
        // console.log("cur command is", command);
        if (i === tokens.length - 1) {
          if (cur_path) {
            if (cur_path.checkIsClosed()) {
              cur_path.setClosed();
              const clockwise = checkIsClockwise(cur_path.path_points);
              cur_path.setClockWise(clockwise);
              // console.log("check is clockwise", clockwise);
            }
          }
        }
        if (["M", "m"].includes(command)) {
          if (cur_path) {
            if (cur_path.path_points.length === 1) {
              // 如果路径只有一个 moveTo，就抛弃这个 path
              //
            }
            if (cur_path.checkIsClosed()) {
              cur_path.setClosed();
              const clockwise = checkIsClockwise(cur_path.path_points);
              cur_path.setClockWise(clockwise);
              // console.log("check is clockwise 2", clockwise);
            }
          }
          let v0 = values[0];
          let v1 = values[1];
          let p = {
            x: this.normalizeX(v0, xExtra),
            y: this.normalizeY(v1, yExtra),
          };
          if (command === "m") {
            // moveTo(p);
            p.x += prev_start.x;
            p.y += prev_start.y;
            if (i === 0) {
              p = this.translate(p);
            }
          } else {
            p = this.translate(p);
          }
          Object.assign(prev_start, p);
          // console.log("[BIZ]before new start point", v0, v1, prev_point);
          prev_point = p;
          const point = BezierPoint({
            point: Point(p),
            from: null,
            to: null,
            start: true,
            virtual: false,
          });
          start_path_point = point;
          cur_path_point = point;
          const new_path = LinePath({
            points: [point],
          });
          path.append(new_path);
          if (cur_path) {
            // const cur_size = new_path.size;
            // const prev_size = cur_path.size;
            // console.log("cur size compare with prev_size", cur_size, prev_size);
            // if (
            //   cur_size.x > prev_size.x &&
            //   cur_size.y > prev_size.y &&
            //   cur_size.x2 < prev_size.x2 &&
            //   cur_size.y2 < prev_size.y2
            // ) {
            //   // 当前这个，在前面那个的里面
            //   if (cur_path.composite === "source-over") {
            //     new_path.setComposite("destination-out");
            //   }
            //   if (cur_path.composite === "destination-out") {
            //     composite_relative_path = new_path;
            //     new_path.setComposite("source-over");
            //   }
            // }
            // // 如果前面那个，在当前这个的里面
            // if (composite_relative_path) {
            //   const cur_size = new_path.size;
            //   const prev_size = composite_relative_path.size;
            //   if (
            //     cur_size.x > prev_size.x &&
            //     cur_size.y > prev_size.y &&
            //     cur_size.x2 < prev_size.x2 &&
            //     cur_size.y2 < prev_size.y2
            //   ) {
            //     if (composite_relative_path.composite === "source-over") {
            //       new_path.setComposite("destination-out");
            //     }
            //     if (composite_relative_path.composite === "destination-out") {
            //     }
            //   }
            // }
          }
          if (i === 0) {
            composite_relative_path = new_path;
          }
          cur_path = new_path;
        }
        if (["Z", "z"].includes(command)) {
          console.log("[BIZ]command is Z", cur_path);
          if (start_path_point) {
            start_path_point.setEnd(true);
            start_path_point.setClosed();
          }
          if (cur_path) {
            cur_path.setClosed();
            const clockwise = checkIsClockwise(cur_path.path_points);
            cur_path.setClockWise(clockwise);
            // console.log("check is clockwise 3", clockwise);
          }
          // cur_path.setClosed();
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
            let radius = this.normalizeX(rx, xExtra);
            if (next_command === "a") {
              moveTo(p2);
            } else {
              p2 = this.translate(p2);
            }
            prev_point = p2;
            const start = p1;
            const arc = {
              rx: radius,
              ry: radius,
              rotate,
              t1,
              t2,
              end: p2,
            };
            console.log("[BIZ]canvas / before arc_to_curve", start, arc);
            const pointsArr = arc_to_curve(start, arc);
            console.log("after arc_to_curve", start, pointsArr);
            let inner_cur_path_point: BezierPoint | null = null;
            for (let k = 0; k < pointsArr.length; k += 1) {
              const inner_cur = pointsArr[k];
              // console.log("inner_cur", inner_cur);
              const inner_next = pointsArr[k + 1];
              if (cur_path_point) {
                cur_path_point.setTo(Point(inner_cur[1]));
                cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngleAndLength);
                // if (cur_path_point.start) {
                // }
                // if (cur_path_point.from) {
                //   cur_path_point.setTo(BezierPoint(inner_cur[1]));
                // }
              }
              if (inner_cur_path_point && inner_cur_path_point.from) {
                inner_cur_path_point.setTo(Point(inner_cur[1]));
                inner_cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngleAndLength);
              }
              const new_cur_path_point = BezierPoint({
                point: Point(inner_cur[3]),
                from: Point(inner_cur[2]),
                to: inner_next ? Point(inner_next[1]) : null,
                mirror: inner_next ? BezierPointMirrorTypes.MirrorAngleAndLength : null,
                virtual: false,
              });
              cur_path_point = new_cur_path_point;
              inner_cur_path_point = new_cur_path_point;
              cur_path.appendPoint(new_cur_path_point);
            }

            // const is_reverse = p1.x > p2.x;
            // const distance = distanceOfPoints(p1, p2);
            // if (radius < distance / 2) {
            //   radius = distance / 2;
            // }
            // const centers = calculateCircleCenter(p1, p2, radius);
            // if (centers) {
            //   const [index1, index2] = (() => {
            //     if (t1 === 0 && t2 === 0) {
            //       return [0, 1];
            //     }
            //     if (t1 === 0 && t2 === 1) {
            //       return [1, 0];
            //     }
            //     if (t1 === 1 && t2 === 0) {
            //       return [1, 1];
            //     }
            //     if (t1 === 1 && t2 === 1) {
            //       return [0, 0];
            //     }
            //     return [0, 1];
            //   })();
            //   const center = centers[index1];
            //   const arcs = calculateCircleArcs(center, p1, p2);
            //   const arc = arcs[index2];
            //   // console.log("[BIZ]canvas/index - after calculateCircleArcs(center", center, p1, p2, arc);
            //   const circle: CircleCurved = {
            //     center,
            //     radius,
            //     arc,
            //     counterclockwise: (() => {
            //       if (t1 === 0 && t2 === 0) {
            //         // if (is_reverse) {
            //         return true;
            //         // }
            //       }
            //       // if (t1 === 0 && t2 === 1) {
            //       //   return false;
            //       // }
            //       if (t1 === 1 && t2 === 0) {
            //         if (is_reverse) {
            //           return true;
            //         }
            //       }
            //       // if (t1 === 1 && t2 === 1) {
            //       // }
            //       return false;
            //     })(),
            //     extra: { start: p1, rx, ry, rotate, t1, t2 },
            //   };
            //   // console.log("create point", next_command, next_values, p2, circle);
            //   const next_path_point = PathPoint({
            //     point: BezierPoint(p2),
            //     from: null,
            //     to: null,
            //     circle,
            //     virtual: false,
            //   });
            //   cur_path_point = next_path_point;
            //   cur_path.appendPoint(next_path_point);
            // }
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
            const next_path_point = BezierPoint({
              point: Point(p),
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
            const next_path_point = BezierPoint({
              point: Point(p),
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
              cur_path_point.setTo(Point(a1));
              if (cur_path_point.from) {
                const collinear = isCollinear(cur_path_point.from.pos, cur_path_point.point.pos, a1);
                cur_path_point.setMirror(BezierPointMirrorTypes.NoMirror);
                if (collinear.collinear) {
                  cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngle);
                  if (collinear.midpoint) {
                    cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngleAndLength);
                  }
                }
              }
            }
            // console.log("create point", next_command, a2);
            const next_path_point = BezierPoint({
              point: Point(a2),
              from: Point(a3),
              to: null,
              virtual: false,
            });
            cur_path_point = next_path_point;
            cur_path.appendPoint(next_path_point);
          }
          if (["S", "s"].includes(next_command)) {
            // console.log("command S or s", !!cur_path_point, !!cur_path_point?.from, next_values);
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
              const a1 = findSymmetricPoint(cur_path_point.point.pos, cur_path_point.from.pos);
              cur_path_point.setTo(Point(a1));
              cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngleAndLength);
              // console.log("before create next_path_point", a2, a3);
              const next_path_point = BezierPoint({
                point: Point({ x: a3.x, y: a3.y }),
                from: Point({ x: a2.x, y: a2.y }),
                to: null,
                virtual: false,
              });
              cur_path_point = next_path_point;
              cur_path.appendPoint(next_path_point);
            }
          }
          if (["Q", "q"].includes(next_command)) {
            const v0 = next_values[0];
            const v1 = next_values[1];
            const v2 = next_values[2];
            const v3 = next_values[3];
            let a1 = {
              x: this.normalizeX(v0, xExtra),
              y: this.normalizeY(v1, yExtra),
            };
            let a2 = {
              x: this.normalizeX(v2, xExtra),
              y: this.normalizeY(v3, yExtra),
            };
            if (["q"].includes(next_command)) {
              moveTo(a1);
              moveTo(a2);
            } else {
              a1 = this.translate(a1);
              a2 = this.translate(a2);
            }
            prev_point = a2;
            const next_path_point = BezierPoint({
              point: Point(a2),
              from: Point(a1),
              to: null,
              virtual: false,
            });
            cur_path_point = next_path_point;
            cur_path.appendPoint(next_path_point);
          }
          if (["T", "t"].includes(next_command)) {
            const v0 = next_values[0];
            const v1 = next_values[1];
            let a2 = {
              x: this.normalizeX(v0, xExtra),
              y: this.normalizeY(v1, yExtra),
            };
            if (["t"].includes(next_command)) {
              moveTo(a2);
            } else {
              a2 = this.translate(a2);
            }
            prev_point = a2;
            if (cur_path_point && cur_path_point.from) {
              // const a1 = getSymmetricPoints(cur_path_point.point.pos, cur_path_point.from.pos);
              const prev_x = cur_path_point.point.pos.x;
              const prev_from_x = cur_path_point.from.pos.x;
              const prev_y = cur_path_point.point.pos.y;
              const prev_from_y = cur_path_point.from.pos.y;
              const a1 = {
                x: prev_x + (prev_x - prev_from_x),
                y: prev_y + (prev_y - prev_from_y),
              };
              const next_path_point = BezierPoint({
                point: Point(a2),
                from: Point(a1),
                to: null,
                virtual: false,
              });
              cur_path_point = next_path_point;
              cur_path.appendPoint(next_path_point);
            }
          }
        }
      }
    },

    /**
     * 检查是否有靠近可以吸附的线条
     */
    // checkAttachLinesBeforeDrag(curRect: RectShape): [RectShape, LineShape[]] {
    //   const { things: contents } = this.values;
    //   const rectLines: LineShape[] = [];
    //   if (this.client === null) {
    //     return [curRect, []];
    //   }
    //   const { width, height } = this.client;
    //   const [nextRect, lines] = findNearbyLinesAtRect(
    //     curRect,
    //     rectLines.concat([
    //       {
    //         type: LineDirectionTypes.Horizontal,
    //         origin: 0,
    //         y: height / 2,
    //         length: width,
    //       },
    //       {
    //         type: LineDirectionTypes.Vertical,
    //         origin: 0,
    //         x: width / 2,
    //         length: height,
    //       },
    //     ])
    //   );
    //   return [nextRect, lines];
    // },

    update() {
      bus.emit(Events.Update);
    },
    handleMouseDown(pos: { x: number; y: number }) {
      const { x, y } = pos;
      console.log("[BIZ]canvas/index - handleMouseDown before if (_pen_editing)", _editing_pen);
      if (_editing_pen) {
        if (!inGrid(pos)) {
          return;
        }
        const found = checkIsClickPathPoint(pos);
        console.log("[BIZ]canvas/index has matched point", found, _cur_path_point, _cur_point);
        if (found && _cur_path_point && found !== _cur_path_point && _cur_line_path) {
          if (found.start) {
            // 点击了开始点，闭合路径
            found.setEnd(true);
            _cur_line_path.setClosed();
            _cur_path_point.setClosed();
            _cur_path_point.point.moveTo(found.point);
            _prepare_dragging = true;
            _moving_for_new_line = false;
          }
          return;
        }
        console.log("[BIZ]canvas/index is moving for new line", _moving_for_new_line, _cur_path_point);
        if (_moving_for_new_line && _cur_path_point) {
          // 创建点后移动，选择了一个位置，按下，看准备拖动创建曲线，还是松开直接创建直线
          _prepare_dragging = true;
          _cur_point = _cur_path_point.to;
          return;
        }
        // 画布空白，第一次点击，创建起点
        // @todo 移到 mouseup 中
        _moving_for_new_line = true;
        const start = BezierPoint({
          point: Point({
            x,
            y,
          }),
          from: null,
          to: null,
          start: true,
          virtual: false,
          mirror: null,
        });
        const end = BezierPoint({
          point: Point({
            x: x + 10,
            y: y + 10,
          }),
          from: null,
          to: null,
          mirror: BezierPointMirrorTypes.MirrorAngleAndLength,
        });
        // console.log("create BezierPath");
        _cur_line_path = LinePath({
          points: [],
          closed: false,
        });
        _cur_line.append(_cur_line_path);
        _paths.push(_cur_line_path);
        _cur_line_path.onPointCountChange(() => {
          updatePoints();
        });
        _prev_path_point = start;
        _cur_path_point = end;
        _prev_point = start.point;
        _cur_point = end.point;
        _cur_line_path.appendPoint(start);
        _cur_line_path.appendPoint(end);
        return;
      }
      _mx = x;
      _my = y;
      if (_editing_cursor) {
        const found = checkIsClickPoint(pos);
        // console.log("[BIZ]canvas/index - after checkIsClickPoint(pos)", found);
        if (found) {
          _prepare_dragging = true;
          _cur_point = found;
          _cx = found.x;
          _cy = found.y;
        }
      }
      if (_global_cursor) {
        _moving_object = true;
        const path = _paths[0];
        if (path) {
          path.startMove({
            x: _mx,
            y: _my,
          });
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
      if (_editing_pen) {
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
          const to_of_cur_path_point = Point({
            x,
            y,
          });
          _cur_point = to_of_cur_path_point;
          _cur_path_point.setVirtual(false);
          _cur_path_point.setMirror(BezierPointMirrorTypes.MirrorAngleAndLength);
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
            const to_of_prev_path_point = Point({
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
              to_of_prev_path_point.moveTo({ x: p.x, y: p.y });
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
            const to_of_prev_path_point = Point({
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
              to_of_prev_path_point.moveTo({ x: p.x, y: p.y });
            });
            _events.push(unlisten);
            prev_path_point.setTo(to_of_prev_path_point);
          }
        }
        if (_cur_point) {
          _ox = pos.x - _mx;
          _oy = pos.y - _my;
          _cur_point.moveTo({
            x: _cx + _ox,
            y: _cy + _oy,
          });
          bus.emit(Events.Update);
        }
        return;
      }
      /** x方向移动的距离 */
      _ox = pos.x - _mx;
      /** y方向移动的距离 */
      _oy = pos.y - _my;
      if (_editing_cursor) {
        if (!_prepare_dragging) {
          return;
        }
        if (!_cur_point) {
          return;
        }
        _cur_point.moveTo({
          x: _cx + _ox,
          y: _cy + _oy,
        });
        bus.emit(Events.Update);
      }
      if (_global_cursor) {
        if (_moving_object) {
          const path = _paths[0];
          if (path) {
            console.log("[BIZ]canvas/index - before move path", _ox, _oy);
            path.move({
              x: _ox,
              y: _oy,
            });
            bus.emit(Events.Update);
          }
        }
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
      // console.log("[BIZ]canvas - handleMouseUp", _pen_editing);
      if (_editing_pen) {
        const path = _cur_line_path;
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
        // console.log("[BIZ]canvas - handleMouseUp before if (_cur_path_point ", _cur_path_point);
        if (_cur_path_point && _cur_path_point.closed) {
          // console.log("[BIZ]canvas - handleMouseUp close path", _cur_path_point, _cur_path_point.point.pos);
          // console.log("before closed path mouse up");
          // 闭合路径松开
          const start = path.start_point;
          start.setMirror(BezierPointMirrorTypes.NoMirror);
          start.setEnd(true);
          _cur_path_point.setVirtual(false);
          // console.log("[BIZ]canvas - before if (_cur_path_point.from", _cur_path_point.from);
          if (_cur_path_point.from) {
            // 因为待会要删掉最后一个坐标点及其控制点，所以这里是 copy
            start.setFrom(_cur_path_point.from, { copy: true });
          }
          // console.log("_prev_path_point", _prev_path_point?.uid, _prev_path_point?.point.pos, _prev_path_point?.to);
          if (_cur_line_path) {
            _cur_line_path.removeLastPoint();
          }
          _prepare_dragging = false;
          _dragging = false;
          _moving_for_new_line = false;
          _cur_point = null;
          _cur_path_point = null;
          this.format(_lines);
          bus.emit(Events.Update);
          return;
        }
        // console.log("_prepare_dragging / ", _prepare_dragging, _dragging, _cur_path_point);
        // console.log("[BIZ]canvas - handleMouseUp before if (_dragging ", _dragging);
        if (_dragging) {
          // 点击确定曲线终点，生成曲线，拖动控制点改变曲线曲率，然后松开
          // 两件事
          // 1. 确定了一条曲线的终点和控制点2
          // 2. 创建了一条未确定「终点跟着鼠标移动」的曲线
          if (!cur.from) {
            return;
          }
          _prepare_dragging = false;
          _dragging = false;
          _moving_for_new_line = true;
          if (_cur_path_point) {
            _cur_path_point.setVirtual(false);
          }
          path.ensureSegment();
          const p = getSymmetricPoint2(cur.point, { x, y }, cur.from, AUTO_CONTROLLER_POINT_LENGTH_RATIO);
          const from_of_new_path_point = Point({
            x: p.x,
            y: p.y,
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
          _prev_path_point = cur;
          _prev_point = cur.point;
          _cur_path_point = next_path_point;
          _cur_point = next_path_point.point;
          // console.log("[BIZ]canvas/index - before path.appendPoint", { x: pos.x, y: pos.y });
          path.appendPoint(next_path_point);
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
            from_of_new_path_point.moveTo({
              x: p.x,
              y: p.y,
            });
          });
          return;
        }
        // console.log("[BIZ]canvas - handleMouseUp before if (_prepare_dragging ", _prepare_dragging, _dragging);
        if (_prepare_dragging && !_dragging) {
          // 点击确定曲线终点，生成曲线，没有拖动控制点改变曲线曲率，直接松开。这里直线曲线都可能
          // @todo 如果本来是创建曲线，结果实际上创建了直线，应该移除曲线的控制点，变成真正的直线
          // console.log("初始化下一个坐标点", _cur_path_point?.mirror);
          _moving_for_new_line = true;
          _prepare_dragging = false;
          _dragging = false;
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
          _prev_path_point = cur;
          _prev_point = cur.point;
          _cur_path_point = new_path_point;
          _cur_point = new_path_point.point;
          path.appendPoint(new_path_point);
          return;
        }
        return;
      }
      if (_editing_cursor) {
        if (!_prepare_dragging) {
          return;
        }
        _prepare_dragging = false;
        _dragging = false;
        _cur_point = null;
        _cur_path_point = null;
      }
      if (_global_cursor) {
        if (_moving_object) {
          _moving_object = false;
          const path = _paths[0];
          if (path) {
            path.finishMove({
              x: pos.x,
              y: pos.y,
            });
            bus.emit(Events.Update);
          }
        }
      }
    },
    get debug() {
      return _debug;
    },
    setDebug() {
      _debug = !_debug;
    },
    log() {
      if (_cur_layer) {
        const content = _cur_layer.logs.join("\n");
        console.log(content);
      }
    },
    onUpdate(handler: Handler<TheTypesOfEvents[Events.Update]>) {
      return bus.on(Events.Update, handler);
    },
    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.on(Events.Change, handler);
    },
  };
}

export type Canvas = ReturnType<typeof Canvas>;
