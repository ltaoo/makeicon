import { base, Handler } from "@/domains/base";
import { Line } from "@/biz/line";

import { CanvasLayer } from "./layer";
import { Position } from "./types";
import { CanvasRangeSelection } from "./range";
import { buildPath, opentypeCommandsToTokens } from "./utils";
import { CanvasConverter } from "./converter";
import { CanvasPointer } from "./mouse";
import { CanvasModeManage, StatusKeyType, StatusKeys } from "./mode";
import { PathEditing } from "./path_editing";

export type CursorType = "select" | "pen";
const debug = false;

type CanvasProps = {};
export function Canvas(props: CanvasProps) {
  let _mounted = false;
  const _layers: {
    range: CanvasLayer;
    grid: CanvasLayer;
    path: CanvasLayer;
    graph: CanvasLayer;
  } = {
    // 绘制了选框
    range: CanvasLayer({
      zIndex: 999,
      disabled: true,
    }),
    // 绘制了网格线
    grid: CanvasLayer({
      zIndex: 998,
      disabled: true,
      onMounted(layer) {
        layer.drawGrid(() => {
          console.log("The Grid has Draw");
        });
      },
    }),
    // 绘制了锚点、路径
    path: CanvasLayer({
      zIndex: 99,
    }),
    // 绘制了填充、描边
    graph: CanvasLayer({
      zIndex: 9,
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
    unit: 16,
    lineWidth: 0.5,
    color: "#cccccc",
  };
  /** 画布上的图形 */
  let _objects: {}[] = [];
  let _lines: Line[] = [];
  let _debug = false;

  const _$mode = CanvasModeManage({
    state: "default.select",
  });

  const _state = {
    get cursor(): CursorType {
      if (_$mode.value === "path_editing.pen") {
        return "pen";
      }
      return "select";
    },
    get mode() {
      return _$mode.value;
    },
  };

  enum Events {
    /** 重新绘制 canvas 内容 */
    Refresh,
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Refresh]: void;
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
        // @ts-ignore
        return _layers[name];
      });
    },
    get $selection() {
      return _$selection;
    },
    get paths() {
      return _lines;
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
    selectEditingPen() {
      _$mode.set("path_editing.pen");
      bus.emit(Events.Change, { ..._state });
    },
    selectEditingSelect() {
      // if (_editing_pen && _cur_line_path) {
      //   _cur_line_path.removeLastVirtualPoint();
      // }
      _$mode.set("path_editing.select");
      // _cur_path_point = null;
      // _cur_point = null;
      // updatePoints();
      // bus.emit(Events.Refresh);
      bus.emit(Events.Change, { ..._state });
    },
    /**
     * 画布模式
     * 对画布上的物体进行位置、大小等属性调整
     */
    selectDefaultSelect() {
      _$mode.set("default.select");
      bus.emit(Events.Change, { ..._state });
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
    appendObject() {},
    inGrid(pos: { x: number; y: number }) {
      if (pos.x >= _grid.x && pos.x <= _grid.x + _grid.width && pos.y >= _grid.y && pos.y <= _grid.y + _grid.height) {
        return true;
      }
      return false;
    },
    buildBezierPathsFromOpentype(...args: Parameters<typeof _$converter.buildBezierPathsFromOpentype>) {
      return _$converter.buildBezierPathsFromOpentype(...args);
    },
    buildBezierPathsFromPathString(...args: Parameters<typeof _$converter.buildBezierPathsFromPathString>) {
      return _$converter.buildBezierPathsFromPathString(...args);
    },
    buildWeappCode() {
      return _$converter.buildWeappCode([]);
    },
    buildPreviewIcons() {
      return _$converter.buildPreviewIcons([]);
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
      // _$selection.setPressing(true);
      _$pointer.handleMouseDown(pos);
      if (_state.mode === "default.select") {
        _$selection.startRangeSelect(pos);
      }
      if (_$mode.is("path_editing")) {
        _$path_editing.handleMouseDown(pos);
      }
    },
    handleMouseMove(pos: { x: number; y: number }) {
      _$pointer.handleMouseMove(pos);
      if (_state.mode === "default.select") {
        _$selection.rangeSelect(pos);
      }
      if (_$mode.is("path_editing")) {
        _$path_editing.handleMouseMove(pos);
      }
    },
    handleMouseUp(pos: { x: number; y: number }) {
      if (_state.mode === "default.select") {
        _$selection.endRangeSelect();
      }
      if (_$mode.is("path_editing")) {
        _$path_editing.handleMouseUp(pos);
      }
      _$pointer.handleMouseUp(pos);
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
  _$path_editing.onCreateLine((line) => {
    _lines.push(line);
  });
  _$path_editing.onRefresh(() => {
    bus.emit(Events.Refresh);
  });

  return ins;
}

export type Canvas = ReturnType<typeof Canvas>;
