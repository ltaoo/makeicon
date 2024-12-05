/**
 * @file 等同一个 Path 标签的概念
 * 它才能有「描边」、「填充」等属性，称为 线条？
 * 线条由路径组成？路径由曲线、直线组成
 * 线条概念也不太对，应该是一个 group 概念 PathGroup。因为可以存在多条不连续的路径，说是「一条线」就很奇怪
 * @todo 增加基础的「物体」概念，移动、旋转、缩放等等，都组合「物体」来实现
 */
import { base, Handler } from "@/domains/base";
import { LinePath } from "@/biz/path";
import { boxToRectShape, createEmptyRectShape } from "@/biz/canvas/utils";
import { CanvasObject } from "@/biz/canvas/object";
import { CursorType } from "@/biz/canvas/constants";

// https://developer.mozilla.org/en-US/docs/Web/SVG/Attribute/stroke-linecap
export type LineCapType = "butt" | "round" | "square";
// export type LineJoinType = "miter" | "round" | "bevel" | "miter-clip" | "arcs";
// https://developer.mozilla.org/zh-CN/docs/Web/API/CanvasRenderingContext2D/lineJoin 只能通过 outline 模拟描边+join样式，才能支持更强的 join 效果
export type LineJoinType = "round" | "bevel" | "miter";
// https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation
export type PathCompositeOperation = "source-over" | "destination-out";

type PathProps = {
  fill?: null | {
    color: string;
  };
  stroke?: null | {
    color: string;
    width: number;
    cap?: string;
    join?: string;
  };
  closed?: boolean;
};

export function Line(props: PathProps) {
  const { fill, stroke } = props;

  let _paths: LinePath[] = [];
  let _stroke = {
    enabled: !!stroke,
    width: 1,
    color: "#111111",
    start_cap: "butt" as LineCapType,
    end_cap: "round" as LineCapType,
    join: "miter" as LineJoinType,
  };
  if (stroke) {
    (() => {
      if (stroke.color === "none") {
        _stroke.enabled = false;
        return;
      }
      _stroke.color = stroke.color;
      _stroke.width = stroke.width;
      if (stroke.cap) {
        _stroke.start_cap = stroke.cap as LineCapType;
        _stroke.end_cap = stroke.cap as LineCapType;
      }
      if (stroke.join) {
        _stroke.join = stroke.join as LineJoinType;
      }
    })();
  }
  let _fill = {
    enabled: !!fill,
    color: "#111111",
  };
  if (fill) {
    _fill.color = fill.color;
  }
  let _composite = "source-over" as PathCompositeOperation;
  let _box = { x: 0, y: 0, x1: 0, y1: 0 };
  // let _tmp_box: null | typeof _box = null;
  let _scale = 1;
  let _editing = false;

  const _$obj = CanvasObject({ rect: createEmptyRectShape(), options: {} });
  _$obj.onStartDrag((pos) => {
    for (let i = 0; i < _paths.length; i += 1) {
      const path = _paths[i];
      path.startMove(pos);
    }
  });
  _$obj.onDragging((values) => {
    for (let i = 0; i < _paths.length; i += 1) {
      const path = _paths[i];
      path.move({ x: values.dx, y: values.dy });
    }
  });
  _$obj.onFinishDrag((pos) => {
    for (let i = 0; i < _paths.length; i += 1) {
      const path = _paths[i];
      path.finishMove(pos);
    }
  });
  _$obj.onCursorChange((v) => bus.emit(Events.CursorChange, v));

  const _state = {
    get stroke() {
      return _stroke;
    },
    get fill() {
      return _fill;
    },
    get composite() {
      return _composite;
    },
  };
  // function moveBox(values: { dx: number; dy: number }) {
  //   if (!_tmp_box) {
  //     _tmp_box = { ..._box };
  //   }
  //   _tmp_box.x = _box.x + values.dx;
  //   _tmp_box.x1 = _box.x1 + values.dx;
  //   _tmp_box.y = _box.y + values.dy;
  //   _tmp_box.y1 = _box.y1 + values.dy;
  // }
  enum Events {
    CursorChange,
    Refresh,
    Change,
  }
  type TheTypesOfEvents = {
    [Events.CursorChange]: CursorType;
    [Events.Refresh]: void;
    [Events.Change]: typeof _state;
  };
  const bus = base<TheTypesOfEvents>();

  return {
    SymbolTag: "Line" as const,
    state: _state,
    get paths() {
      return _paths;
    },
    get selected() {
      return _$obj.state.selected;
    },
    get editing() {
      return _editing;
    },
    setEditing(v: boolean) {
      _editing = v;
    },
    get stroke() {
      return _stroke;
    },
    get fill() {
      return _fill;
    },
    get box() {
      // if (_tmp_box) {
      //   return _tmp_box;
      // }
      // return _box;
      return _$obj.client;
    },
    get tmpBox() {
      return _box;
    },
    obj: _$obj,
    setFill(values: { color: any; opacity: number; visible: boolean }) {
      const { color, opacity, visible } = values;
      _fill = {
        ..._fill,
        enabled: visible,
        color: color,
      };
    },
    setStroke(values: { color: string; opacity: number; visible: boolean }) {
      const { color, opacity, visible } = values;
      _stroke = {
        ..._stroke,
        enabled: visible,
        color: color,
      };
    },
    refreshBox() {
      const rect = {
        x: 0,
        y: 0,
        x1: 0,
        y1: 0,
      };
      // console.log("[BIZ]line/index - buildBox the _paths count is", _paths.length);
      for (let i = 0; i < _paths.length; i += 1) {
        const box = _paths[i].buildBox();
        // console.log("[BIZ]line/index - refreshBox", box);
        if (box) {
          (() => {
            if (rect.x === 0 || rect.x > box.x) {
              rect.x = box.x;
            }
            if (rect.x1 === 0 || rect.x1 < box.x1) {
              rect.x1 = box.x1;
            }
          })();
          (() => {
            if (rect.y === 0 || rect.y > box.y) {
              rect.y = box.y;
            }
            if (rect.y1 === 0 || rect.y1 < box.y1) {
              rect.y1 = box.y1;
            }
          })();
        }
      }
      _$obj.updateClient(boxToRectShape(rect));
    },
    buildEdgesOfBox() {
      // console.log("[BIZ]line/index - buildEdgesOfBox", _tmp_box?.x);
      return _$obj.buildEdgeOfBox();
    },
    // moveBox,
    inBox(pos: { x: number; y: number }) {
      this.refreshBox();
      return _$obj.checkInBox(pos);
    },
    cacheBox() {
      _box = { ...this.box };
    },
    clearBox() {
      _box = { x: 0, y: 0, x1: 0, y1: 0 };
    },
    startScale() {
      for (let i = 0; i < _paths.length; i += 1) {
        const p = _paths[i];
        p.startScale();
      }
    },
    scale(v: number, opt: Partial<{ directly: boolean }> = {}) {
      console.log("[BIZ]line/index - scale", v);
      const box1 = this.box;
      _scale = v;
      for (let i = 0; i < _paths.length; i += 1) {
        const p = _paths[i];
        p.scale(v, opt);
      }
      this.refreshBox();
      const box2 = this.box;
      const x = box1.x - box2.x;
      const y = box1.y - box2.y;
      // console.log(box2, box1, x, y);
      this.translate(x, y);
      this.refreshBox();
      bus.emit(Events.Refresh);
    },
    finishScale() {
      for (let i = 0; i < _paths.length; i += 1) {
        const p = _paths[i];
        p.finishScale();
      }
    },
    startRotate(pos: { x: number; y: number }) {
      const { x, y, x1, y1 } = _$obj.client;
      _$obj.startRotate({ x: pos.x, y: pos.y, left: x, top: y, width: x1 - x, height: y1 - y });
      for (let i = 0; i < _paths.length; i += 1) {
        const p = _paths[i];
        p.startRotate();
      }
    },
    rotate(pos: { x: number; y: number }) {
      _$obj.rotate({ x: pos.x, y: pos.y });
      for (let i = 0; i < _paths.length; i += 1) {
        const p = _paths[i];
        p.rotate(pos, { center: _$obj.center, angle: _$obj.angle });
      }
      // this.refreshBox();
      bus.emit(Events.Refresh);
    },
    finishRotate(pos: { x: number; y: number }) {
      for (let i = 0; i < _paths.length; i += 1) {
        const p = _paths[i];
        p.finishRotate(pos);
      }
    },
    translate(x: number, y: number) {
      for (let i = 0; i < _paths.length; i += 1) {
        const p = _paths[i];
        p.move({ x, y }, { directly: true, silence: true });
      }
    },
    append(path: LinePath) {
      _paths.push(path);
    },
    get composite() {
      return _composite;
    },
    setComposite(v: PathCompositeOperation) {
      _composite = v;
    },
    select() {
      _$obj.select();
    },
    unselect() {
      _$obj.unselect();
    },
    handleMouseDown(pos: { x: number; y: number }) {
      _$obj.handleMouseDown(pos);
    },
    handleMouseMove(pos: { x: number; y: number }) {
      _$obj.handleMouseMove(pos);
    },
    handleMouseUp(pos: { x: number; y: number }) {
      _$obj.handleMouseUp(pos);
    },

    onRefresh(handler: Handler<TheTypesOfEvents[Events.Refresh]>) {
      return bus.on(Events.Refresh, handler);
    },
    onSelect(...args: Parameters<typeof _$obj.onSelect>) {
      return _$obj.onSelect(...args);
    },
    onUnselect: _$obj.onUnselect,
    onStartDrag(...args: Parameters<typeof _$obj.onStartDrag>) {
      return _$obj.onStartDrag(...args);
    },
    onDragging(...args: Parameters<typeof _$obj.onDragging>) {
      return _$obj.onDragging(...args);
    },
    onFinishDrag(...args: Parameters<typeof _$obj.onFinishDrag>) {
      return _$obj.onFinishDrag(...args);
    },
    onCursorChange(...args: Parameters<typeof _$obj.onCursorChange>) {
      return _$obj.onCursorChange(...args);
    },
  };
}

export type Line = ReturnType<typeof Line>;
