type StatusKey = string;
// @ts-ignore
export type FullStatusMap = Record<StatusKey, FullStatusMap>;
export type StatusKeyType<T extends FullStatusMap, K = keyof T> = K extends keyof T & (string | number)
  ? `${K}` | (T[K] extends object ? (T[K] extends object ? `${K}.${StatusKeyType<T[K]>}` : never) : never)
  : never;

export type StatusKeys = StatusKeyType<{
  /** 物体编辑模式 */
  default: {
    /** 选择工具 */
    select: boolean;
    /** 钢笔工具 */
    pen: boolean;
  };
  /** 路径编辑模式 */
  path_editing: {
    /** 选择工具 */
    select: boolean;
    /** 钢笔工具 */
    pen: boolean;
  };
}>;

export function CanvasModeManage(props: { state: StatusKeys }) {
  const { state } = props;

  let _state = state;
  let _prev: null | StatusKeys = null;
  let _cache: Partial<Record<StatusKeys, boolean>> = {};

  return {
    get value() {
      return _state;
    },
    is(v: StatusKeys) {
      if (_prev && _prev === v) {
        return _cache[v];
      }
      const r = (() => {
        if (v === _state) {
          return true;
        }
        const parts = _state.split(".");
        let i = parts.length - 1;
        while (i >= 0) {
          const state = parts.slice(0, i).join(".");
          if (v === state) {
            return true;
          }
          i -= 1;
        }
        return false;
      })();
      console.log("[BIZ]canvas/mode - invoke is", v, r);
      _prev = v;
      _cache[v] = r;
    },
    set(v: StatusKeys) {
      _state = v;
    },
  };
}

export type CanvasModeManage = ReturnType<typeof CanvasModeManage>;
