import { base, Handler } from "@/domains/base";
import { Line } from "@/biz/line";
import { toFixPoint } from "@/biz/bezier_point/utils";
import { LinearGradientPayload } from "@/biz/svg/path-parser";
import { BezierPoint } from "@/biz/bezier_point";
import { LinePath } from "@/biz/path";
import { Point, PointType } from "@/biz/point";

import { CanvasLayer } from "./layer";
import { Position } from "./types";
import { CanvasRangeSelection } from "./range";
import { CursorType } from "./constants";
import { CanvasConverter } from "./converter";
import { CanvasPointer } from "./mouse";
import { CanvasModeManage, StatusKeyType, StatusKeys } from "./mode";
import { PathEditing } from "./path_editing";
import { CanvasObject } from "./object";
import { GradientColorPicker } from "./gradient_picker";
import { GradientColor } from "./gradient_color";

const debug = false;

type CanvasProps = {};
export function Canvas(props: CanvasProps) {
  let _mounted = false;
  const _layers: {
    range: CanvasLayer;
    tool: CanvasLayer;
    grid: CanvasLayer;
    path: CanvasLayer;
    graph: CanvasLayer;
    background: CanvasLayer;
    frame: CanvasLayer;
  } = {
    // 绘制了选框
    range: CanvasLayer({
      zIndex: 1001,
      disabled: true,
    }),
    tool: CanvasLayer({
      zIndex: 1000,
      disabled: true,
      onMounted(layer) {
        const grid = _grid;
        _$gradient.setStartAndEnd(
          Point({
            type: PointType.Anchor,
            x: grid.x,
            y: grid.y,
          }),
          Point({
            type: PointType.Anchor,
            x: grid.x + grid.width,
            y: grid.y + grid.height,
          })
        );
        _$gradient.setColorStartAndEnd({ color: "#ffffff", v: 0 }, { color: "#000000", v: 1 });
        const $gradientColor = _$gradient.getColor("background");
        _gradients.push($gradientColor);
        if (_$shape) {
          console.log("[BIZ]canvas/index - before set Shape GradientColor");
          // layer.getGradient($gradientColor)
          _$shape.setFill({ color: "url(#background)", visible: true, opacity: 1 });
        }
        _$gradient.refresh();
      },
    }),
    // 绘制了网格线
    grid: CanvasLayer({
      zIndex: 998,
      disabled: true,
      onMounted() {},
    }),
    // 绘制了锚点、路径
    path: CanvasLayer({
      zIndex: 99,
    }),
    // 绘制了填充、描边
    graph: CanvasLayer({
      zIndex: 9,
    }),
    background: CanvasLayer({
      zIndex: 0,
      onMounted(layer) {
        const $background = layer;
        const grid = _grid;
        const $path = $background.drawRoundedRect({
          x: grid.x,
          y: grid.y,
          rx: 60,
          ry: 60,
          width: grid.width,
          height: grid.height,
          colors: [
            { step: 0, color: "#ffa1ed" },
            { step: 1, color: "#9147ff" },
          ],
        });
        const line = Line({});
        line.setFill({
          color: "#cccccc",
          opacity: 100,
          visible: true,
        });
        _$shape = line;
        line.append($path);
        _lines.push(line);
        if (_gradients[0]) {
          if (_$shape) {
            console.log("[BIZ]canvas/index - before set Shape GradientColor");
            _$shape.setFill({ color: "url(#background)", visible: true, opacity: 1 });
            // _$shape.setFill({ color: layer.getGradient(_gradients[0]), visible: true, opacity: 1 });
          }
        }
        bus.emit(Events.Refresh);
      },
    }),
    frame: CanvasLayer({
      zIndex: 0,
      async onMounted(layer) {
        const grid = _grid;
        const $frame = _layers.frame;
        const unit = 16;
        $frame.drawTransparentBackground({
          x: grid.x,
          y: grid.y,
          width: grid.width,
          height: grid.height,
          unit,
        });
      },
    }),
  };
  let _cur_layer = _layers.graph;
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
    unit: 512 / 28,
    lineWidth: 0.5,
    color: "#cccccc",
  };
  let _$shape: Line | null = null;
  let _gradients: GradientColor[] = [];
  /** 画布上的图形 */
  let _objects: CanvasObject[] = [];
  /** 当前选择的图形 */
  let _cur_object: null | Line = null;
  /** 画布上的图形 */
  let _lines: Line[] = [];
  let _cursor: CursorType = "select-default";
  let _debug = false;

  const _$mode = CanvasModeManage({
    state: "default.select",
    onChange(v) {
      _cursor = (() => {
        if (v === "path_editing.pen") {
          return "pen-edit";
        }
        if (v === "path_editing.close_path") {
          return "pen-close-path";
        }
        if (v === "path_editing.select") {
          return "select-default";
        }
        return "select-default";
      })();
    },
  });

  const _state = {
    get cursor() {
      return _cursor;
    },
    get mode() {
      return _$mode.value;
    },
  };

  enum Events {
    /** 重新绘制 canvas 内容 */
    Refresh,
    Select,
    UnSelect,
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Refresh]: void;
    [Events.Select]: Line;
    [Events.UnSelect]: Line;
    [Events.Change]: typeof _state;
  };
  // 事件
  const bus = base<TheTypesOfEvents>();

  const ins = {
    SymbolTag: "Canvas" as const,
    state: _state,
    get layers() {
      return _layers;
    },
    get layerList() {
      return Object.keys(_layers).map((name) => {
        return {
          name,
          // @ts-ignore
          layer: _layers[name],
        };
      });
    },
    get $selection() {
      return _$selection;
    },
    get paths() {
      return _lines;
    },
    /** 当前选择的图形 */
    get object() {
      return _cur_object;
    },
    isMode(v: StatusKeys) {
      return _$mode.is(v);
    },
    createLayer() {},
    // appendLayer(layer: CanvasLayer) {
    //   if (_layers.includes(layer)) {
    //     return;
    //   }
    //   _layers.push(layer);
    // },
    /** 图形绘制层 */
    get layer() {
      return _cur_layer;
    },
    get size() {
      return _size;
    },
    setSize(size: { width: number; height: number }) {
      const { width, height } = size;
      const start = {
        x: width / 2 - _grid.width / 2,
        y: height / 2 - _grid.height / 2,
      };
      Object.assign(_size, size);
      _grid.x = start.x;
      _grid.y = start.y;
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
    /**
     * 钢笔工具
     * 对锚点进行选择、移动
     */
    selectPathEditingSelect() {
      _$mode.set("path_editing.select");
      _$path_editing.startSelect();
      bus.emit(Events.Refresh);
      bus.emit(Events.Change, { ..._state });
    },
    /**
     * 钢笔工具
     * 切换回钢笔工具，表示对锚点进行编辑
     */
    selectPathEditingPen() {
      if (_cur_object) {
        _cur_object.unselect();
        _cur_object = null;
      }
      _$mode.set("path_editing.pen");
      bus.emit(Events.Refresh);
      bus.emit(Events.Change, { ..._state });
    },
    /**
     * 画布模式
     * 对画布上的物体进行位置、大小等属性调整
     */
    selectDefaultSelect() {
      _$mode.set("default.select");
      _$path_editing.complete();
      bus.emit(Events.Refresh);
      bus.emit(Events.Change, { ..._state });
    },
    /**
     * 画布模式
     * 选择钢笔工具，表示要绘制新的线条
     */
    selectDefaultPen() {
      console.log("[BIZ]canvas/index - selectDefaultPen");
      if (_cur_object) {
        _cur_object.unselect();
        _cur_object = null;
      }
      _$mode.set("path_editing.pen");
      _$path_editing.clear();
      bus.emit(Events.Refresh);
      bus.emit(Events.Change, { ..._state });
    },
    handleKeyupBackspace() {
      // console.log("[BIZ]canvas/index - handleKeyupBackspace");
      if (_$mode.is("default.select")) {
        if (_cur_object) {
          _lines = _lines.filter((l) => l !== _cur_object);
        }
        bus.emit(Events.Refresh);
        return;
      }
      if (_$mode.is("path_editing.select")) {
        // console.log("[BIZ]canvas/index - handleKeyupBackspace before deleteCurPoint");
        _$path_editing.deleteCurPoint();
      }
    },
    tagCurObjectAsCopy() {
      //
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
    saveGradients(gradients: LinearGradientPayload[]) {
      // console.log("[BIZ]canvas/index - saveGradient", _gradients);
      _gradients = gradients.map((g) => {
        const { id, x1, x2, y1, y2, stops } = g;
        const c = GradientColor({
          id,
        });
        c.setD1AndD2({ x: x1, y: y1 }, { x: x2, y: y2 });
        c.setSteps(stops);
        return c;
      });
    },
    getGradient(id: string) {
      // console.log("[BIZ]canvas/index - getGradient", id, _gradients);
      return _gradients.find((g) => g.id === id);
    },
    appendObjects(
      paths: Line[],
      extra: Partial<{ transform: boolean; dimensions: { width: number; height: number } }> = {}
    ) {
      for (let i = 0; i < paths.length; i += 1) {
        const line = paths[i];
        this.appendLine(line);
        for (let j = 0; j < line.paths.length; j += 1) {
          const p = line.paths[j];
          p.refreshSegments();
        }
        line.refreshBox();
      }
      // _lines = this.format(paths);
      // _paths = _lines.reduce((prev, cur) => {
      //   return prev.concat(cur.paths);
      // }, [] as LinePath[]);
    },
    appendLine(line: Line) {
      line.onSelect(() => {
        bus.emit(Events.Select, line);
        bus.emit(Events.Refresh);
      });
      line.onUnselect(() => {
        // console.log("[BIZ]canvas/index - line.onUnselect");
        bus.emit(Events.UnSelect, line);
        bus.emit(Events.Refresh);
      });
      line.onDragging(() => {
        bus.emit(Events.Refresh);
      });
      line.onCursorChange((v) => {
        if (_cursor === v) {
          return;
        }
        _cursor = v;
        bus.emit(Events.Change, { ..._state });
      });
      line.onRefresh(() => {
        bus.emit(Events.Refresh);
      });
      // line.onDoubleClick(() => {
      //   bus.emit(Events.Refresh);
      // });
      _lines.push(line);
    },
    inGrid(pos: { x: number; y: number }) {
      if (pos.x >= _grid.x && pos.x <= _grid.x + _grid.width && pos.y >= _grid.y && pos.y <= _grid.y + _grid.height) {
        return true;
      }
      return false;
    },
    draw() {
      const $$canvas = this;
      // console.log("[PAGE]index/index - draw", $$canvas.paths.length);
      const $graph_layer = $$canvas.layer;
      const $pen_layer = $$canvas.layers.path;
      $graph_layer.clear();
      $pen_layer.clear();
      $graph_layer.emptyLogs();
      // console.log("[PAGE]before render $$canvas.paths", $$canvas.paths);
      for (let i = 0; i < $$canvas.paths.length; i += 1) {
        (() => {
          const $$path = $$canvas.paths[i];
          const state = $$path.state;
          // console.log("before $$path.state.stroke.enabled", state.stroke.enabled);
          // console.log("[PAGE]home/index render $$canvas.paths", $$path.paths);
          for (let j = 0; j < $$path.paths.length; j += 1) {
            const $sub_path = $$path.paths[j];
            const commands = $sub_path.buildCommands();
            $graph_layer.save();
            for (let i = 0; i < commands.length; i += 1) {
              const prev = commands[i - 1];
              const command = commands[i];
              const next_command = commands[i + 1];
              // console.log("[PAGE]command", command.c, command.a);
              if (command.c === "M") {
                const [x, y] = command.a;
                // 这两个的顺序影响很大？？？？？如果开头是弧线，就不能使用 moveTo；其他情况都可以先 beginPath 再 moveTo
                $graph_layer.beginPath();
                $graph_layer.moveTo(x, y);
                $pen_layer.beginPath();
                $pen_layer.moveTo(x, y);
              }
              if (command.c === "A") {
                // console.log('A', command);
                const [c1x, c1y, radius, angle1, angle2, counterclockwise] = command.a;
                // console.log("A 弧线", c1x, c1y, radius, angle1, angle2, counterclockwise);
                $graph_layer.arc(c1x, c1y, radius, angle1, angle2, Boolean(counterclockwise));
                $pen_layer.arc(c1x, c1y, radius, angle1, angle2, Boolean(counterclockwise));
                // if (command.end) {
                //   ctx.moveTo(command.end.x, command.end.y);
                // }
              }
              if (command.c === "C") {
                const [c1x, c1y, c2x, c2y, ex, ey] = command.a;
                $graph_layer.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
                $pen_layer.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
                // if (command.p) {
                //   ctx.moveTo(command.p.x, command.p.y);
                // }
              }
              if (command.c === "Q") {
                const [c1x, c1y, ex, ey] = command.a;
                $graph_layer.quadraticCurveTo(c1x, c1y, ex, ey);
                $pen_layer.quadraticCurveTo(c1x, c1y, ex, ey);
              }
              if (command.c === "L") {
                const [x, y] = command.a;
                $graph_layer.lineTo(x, y);
                $pen_layer.lineTo(x, y);
              }
              if (command.c === "Z") {
                $graph_layer.closePath();
                $pen_layer.closePath();
              }
            }
            if (state.fill.enabled && $sub_path.closed) {
              if ($sub_path.composite === "destination-out") {
                $graph_layer.setGlobalCompositeOperation($sub_path.composite);
              }
              $graph_layer.setFillStyle(state.fill.color);
              // @todo 统一改成 Color 实例？GradientColor 是 Color 的一种？
              if (typeof state.fill.color === "string" && state.fill.color.match(/url\(([^)]{1,})\)/)) {
                const [_, id] = state.fill.color.match(/url\(#([^)]{1,})\)/)!;
                const gradient = _gradients.find((g) => g.id === id);
                if (gradient) {
                  $graph_layer.setFillStyle(gradient.getStyle());
                }
              }
              $graph_layer.fill();
            }
            if (state.stroke.enabled) {
              $graph_layer.setStrokeStyle(state.stroke.color);
              $graph_layer.setLineWidth($$canvas.grid.unit * state.stroke.width);
              $graph_layer.setLineCap(state.stroke.start_cap);
              $graph_layer.setLineJoin(state.stroke.join);
              $graph_layer.stroke();
            }
            $graph_layer.restore();
            $graph_layer.stopLog();
            // 绘制锚点
            if ($$path.editing) {
              if ($$canvas.state.cursor) {
                // const $layer = $$canvas.layers[1];
                $pen_layer.save();
                $pen_layer.setStrokeStyle("lightgrey");
                $pen_layer.setLineWidth(1);
                $pen_layer.stroke();
                for (let k = 0; k < $sub_path.skeleton.length; k += 1) {
                  const point = $sub_path.skeleton[k];
                  // console.log("[PAGE]home/index", i, point.start ? "start" : "", point.from, point.to, point.virtual);
                  (() => {
                    if (point.hidden) {
                      return;
                    }
                    $pen_layer.beginPath();
                    $pen_layer.setLineWidth(0.5);
                    $pen_layer.setStrokeStyle("lightgrey");
                    if (point.from) {
                      $pen_layer.drawLine(point, point.from);
                    }
                    if (point.to && !point.virtual) {
                      $pen_layer.drawLine(point, point.to);
                    }
                    $pen_layer.setStrokeStyle("black");
                    const radius = 3;
                    $pen_layer.drawCircle(point.point, radius);
                    if (point.from) {
                      $pen_layer.drawDiamondAtLineEnd(point, point.from);
                    }
                    if (point.to && !point.virtual) {
                      $pen_layer.drawDiamondAtLineEnd(point, point.to);
                    }
                  })();
                }
                $pen_layer.restore();
              }
            }
          }
          if ($$path.selected) {
            const box = $$path.box;
            $pen_layer.drawRect(box);
            const edges = $$path.buildEdgesOfBox();
            for (let i = 0; i < edges.length; i += 1) {
              const edge = edges[i];
              $pen_layer.drawRect(edge, { background: "#ffffff" });
            }
          }
        })();
      }
    },
    buildBezierPathsFromOpentype(...args: Parameters<typeof _$converter.buildBezierPathsFromOpentype>) {
      return _$converter.buildBezierPathsFromOpentype(...args);
    },
    buildBezierPathsFromPathString(...args: Parameters<typeof _$converter.buildBezierPathsFromPathString>) {
      return _$converter.buildBezierPathsFromPathString(...args);
    },
    buildWeappCode() {
      return _$converter.buildWeappCode(_lines);
    },
    buildSVG() {
      return _$converter.buildSVG(_lines);
    },
    buildPreviewIcons() {
      return _$converter.buildPreviewIcons(_lines, { background: _layers.background });
    },
    update() {
      bus.emit(Events.Refresh);
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
    handleMouseDown(pos: { x: number; y: number }) {
      // const pos = toFixPoint(event);
      // _$selection.setPressing(true);
      _$pointer.handleMouseDown(pos);
      _$gradient.handleMouseDown(pos);
      if (_$mode.value === "default.select") {
        // 检查是否点中了画布上的物体，如果是，就开始移动
        const clicked = (() => {
          for (let i = 0; i < _lines.length; i += 1) {
            const is = _lines[i].inBox(pos);
            if (is) {
              return _lines[i];
            }
          }
          return null;
        })();
        console.log("[BIZ]canvas/index - before if(clicked", clicked, _cur_object, clicked === _cur_object);
        if (clicked) {
          if (_cur_object) {
            if (_cur_object !== clicked) {
              console.log("[BIZ]canvas/index - before _cur_object.unselect");
              _cur_object.unselect();
              _cur_object = null;
            }
          }
          _cur_object = clicked;
          _cur_object.handleMouseDown(pos);
          return;
        }
        if (_cur_object) {
          // 已经有选中的物体，但是又再次点击且没有点击到物体
          if (_cursor === "right-bottom-edge") {
            _cur_object.startScale();
            _cur_object.cacheBox();
            return;
          }
          _cur_object.unselect();
          _cur_object = null;
        }
        if (_$gradient.active) {
          return;
        }
        _$selection.startRangeSelect(pos);
      }
      if (_$mode.is("path_editing")) {
        _$path_editing.handleMouseDown(pos);
      }
    },
    handleMouseMove(pos: { x: number; y: number }) {
      // const pos = toFixPoint(event);
      // console.log("[BIZ]canvas/index - handleMouseMove", _$mode.value, _cur_object);
      _$pointer.handleMouseMove(pos);
      _$gradient.handleMousemove(pos);
      if (_$mode.value === "default.select") {
        if (_cur_object) {
          if (_$pointer.pressing && _cursor === "right-bottom-edge") {
            const w = pos.x - _cur_object.tmpBox.x;
            const ww = _cur_object.tmpBox.x1 - _cur_object.tmpBox.x;
            const scale = w / ww;
            console.log(w, ww, scale);
            _cur_object.scale(scale);
            return;
          }
          _cur_object.handleMouseMove(pos);
          return;
        }
        if (_$gradient.active) {
          return;
        }
        _$selection.rangeSelect(pos);
        return;
      }
      if (["path_editing.pen", "path_editing.select"].includes(_$mode.value)) {
        _$path_editing.handleMouseMove(pos);
      }
    },
    handleMouseUp(pos: { x: number; y: number }) {
      // const pos = toFixPoint(event);
      (() => {
        if (_cur_object) {
          if (_cursor === "right-bottom-edge") {
            _cur_object.finishScale();
            _cur_object.clearBox();
          }
          _cur_object.handleMouseUp(pos);
          // _cur_object = null;
          return;
        }
        if (_state.mode === "default.select") {
          _$selection.endRangeSelect();
        }
        if (_$mode.is("path_editing")) {
          _$path_editing.handleMouseUp(pos);
        }
      })();
      _$pointer.handleMouseUp(pos);
      _$gradient.handleMouseUp(pos);
    },
    onSelect(handler: Handler<TheTypesOfEvents[Events.Select]>) {
      return bus.on(Events.Select, handler);
    },
    onUnSelect(handler: Handler<TheTypesOfEvents[Events.UnSelect]>) {
      return bus.on(Events.UnSelect, handler);
    },
    onRefresh(handler: Handler<TheTypesOfEvents[Events.Refresh]>) {
      return bus.on(Events.Refresh, handler);
    },
    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.on(Events.Change, handler);
    },
  };

  const _$converter = CanvasConverter({ grid: _grid });
  const _$pointer = CanvasPointer({ canvas: ins, mode: _$mode });
  const _$selection = CanvasRangeSelection({ pointer: _$pointer });
  const _$path_editing = PathEditing({ canvas: ins, pointer: _$pointer, mode: _$mode });
  const _$gradient = GradientColorPicker({ pointer: _$pointer });
  _$pointer.onDoubleClick((pos) => {
    const matched = (() => {
      for (let i = 0; i < _lines.length; i += 1) {
        const line = _lines[i];
        const inBox = line.inBox(pos);
        if (inBox) {
          return line;
        }
      }
      return null;
    })();
    if (!matched) {
      return;
    }
    _$path_editing.setLine(matched);
    _cur_object = null;
    matched.unselect();
    matched.setEditing(true);
    _$mode.set("path_editing.select");
    bus.emit(Events.Refresh);
    bus.emit(Events.Change, { ..._state });
  });
  _$path_editing.onCreateLine((line) => {
    ins.appendLine(line);
    // _objects.push(line.obj);
  });
  _$path_editing.onCursorChange((v) => {
    if (_cursor === v) {
      return;
    }
    _cursor = v;
    bus.emit(Events.Change, { ..._state });
  });
  _$path_editing.onRefresh(() => {
    bus.emit(Events.Refresh);
  });
  _$gradient.onCursorChange((v) => {
    if (_cursor === v) {
      return;
    }
    _cursor = v;
    bus.emit(Events.Change, { ..._state });
  });
  _$gradient.onRefresh(() => {
    const $path = _$gradient.$path;
    if ($path === null) {
      return;
    }
    const $graph_layer = _layers.tool;
    $graph_layer.clear();
    $graph_layer.drawLine($path.points[0], $path.points[1]);
    $graph_layer.drawCircle($path.points[0], 4);
    $graph_layer.drawCircle($path.points[1], 4);
    $graph_layer.drawRectWithPoints({ points: _$gradient.d1!.points, background: _$gradient.d1!.color });
    $graph_layer.drawRectWithPoints({ points: _$gradient.d2!.points, background: _$gradient.d2!.color });
  });

  return ins;
}

export type Canvas = ReturnType<typeof Canvas>;
