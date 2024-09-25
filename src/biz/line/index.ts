/**
 * @file 等同一个 Path 标签的概念
 * 它才能有「描边」、「填充」等属性，称为 线条？
 * 线条由路径组成？路径由曲线、直线组成
 * 线条概念也不太对，应该是一个 group 概念 PathGroup。因为可以存在多条不连续的路径，说是「一条线」就很奇怪
 * @todo 增加基础的「物体」概念，移动、旋转、缩放等等，都组合「物体」来实现
 */
import { base } from "@/domains/base";
import { LinePath } from "@/biz/path";

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
  let _selected = false;
  let _stroke = {
    enabled: !!stroke,
    width: 1,
    color: "#111111",
    start_cap: "butt" as LineCapType,
    end_cap: "round" as LineCapType,
    join: "miter" as LineJoinType,
  };
  if (stroke) {
    _stroke.color = stroke.color;
    _stroke.width = stroke.width;
    if (stroke.cap) {
      _stroke.start_cap = stroke.cap as LineCapType;
      _stroke.end_cap = stroke.cap as LineCapType;
    }
    if (stroke.join) {
      _stroke.join = stroke.join as LineJoinType;
    }
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

  enum Events {
    Change,
  }
  type TheTypesOfEvents = {
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
      return _selected;
    },
    /** 在画布上的容器坐标 */
    get box() {
      return _box;
    },
    buildBox() {
      const rect = {
        x: 0,
        y: 0,
        x1: 0,
        y1: 0,
      };
      console.log("[BIZ]line/index - build box", _paths.length);
      for (let i = 0; i < _paths.length; i += 1) {
        const box = _paths[i].buildBox();
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
      _box = rect;
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
  };
}

export type Line = ReturnType<typeof Line>;
