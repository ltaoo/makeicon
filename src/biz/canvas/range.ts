/**
 * @file 画布框选
 */

import { base } from "@/domains/base";

import { Position, RectShape } from "./types";
import { createEmptyRectShape } from "./utils";

export function CanvasRangeSelection() {
  let _isPressing = false;
  let _isRangeSelecting = false;
  let _rangeStartPosition: null | Position = null;
  /** 选框信息，位置、大小等 */
  let _rangeSelection = createEmptyRectShape();
  const _state = {
    get range() {
      return _rangeSelection;
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
    SymbolTag: "CanvasRange",
    state: _state,
    setPressing(v: boolean) {
      _isPressing = v;
    },
    /**
     * 开始框选
     */
    startRangeSelect(pos: Position) {
      console.log("[DOMAIN]Canvas - startRangeSelect", _isPressing);
      if (_isPressing) {
        return;
      }
      // console.log("[DOMAIN]Canvas - startRangeSelect", pos);
      _rangeStartPosition = pos;
    },
    /**
     * 框选
     */
    rangeSelect(pos: Position) {
      const { x, y } = pos;
      if (_rangeStartPosition === null) {
        return;
      }
      if (_isPressing) {
        return;
      }
      // console.log("[DOMAIN]Canvas - rangeSelect", x, y);
      if (_isRangeSelecting === false) {
        // @todo 可以判断下移动的距离，如果小于某个阈值，就不算
        _isRangeSelecting = true;
      }
      // if (this.client === null) {
      //   const errMsg = "[DOMAIN]Canvas - rangeSelect 请先调用 updateBoundingClientRect 更新画布尺寸、位置信息";
      //   console.warn(errMsg);
      //   return this;
      // }
      const rectInfo = this.client;
      const parentRect = {
        left: rectInfo.left,
        top: rectInfo.top,
      };
      const startPos = _rangeStartPosition;
      const payload = Object.assign(createEmptyRectShape(), {
        left: x > startPos.x ? startPos.x - parentRect.left : x - parentRect.left,
        top: y > startPos.y ? startPos.y - parentRect.top : y - parentRect.top,
        width: Math.abs(x - startPos.x),
        height: Math.abs(y - startPos.y),
      });
      _rangeSelection = payload;
      //       this.emitter.emit("updateRangeSelection", payload);
      //       const { things } = this.values;
      //       const selectedThings = checkInSelectionRange(payload, things);
      // console.log("[DOMAIN]Canvas - rangeSelect", selectedContents);
      // @todo 其实这里也可以给外部决定哪些能「选中」
      //       this.selectThings(selectedThings.map((content) => content.id));
    },
    /**
     * 结束框选
     */
    endRangeSelect() {
      if (_isRangeSelecting === false) {
        return;
      }
      // console.log("[DOMAIN]Canvas - endRangeSelect");
      _isRangeSelecting = false;
      const emptyRect = createEmptyRectShape();
      _rangeSelection = emptyRect;
      //       this.emitter.emit("updateRangeSelection", emptyRect);
    },
  };
}

export type CanvasRangeSelection = ReturnType<typeof CanvasRangeSelection>;
