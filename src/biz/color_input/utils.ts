import tinycolor2 from "tinycolor2";

export const calcHSVWithPoint = (
  point: { x: number; y: number },
  hsl: { h: number; a: number },
  container: { left: number; top: number; width: number; height: number }
) => {
  const { width: containerWidth, height: containerHeight } = container;
  const { x, y } = point;
  let left = x - container.left;
  let top = y - container.top;

  if (left < 0) {
    left = 0;
  } else if (left > containerWidth) {
    left = containerWidth;
  }
  if (top < 0) {
    top = 0;
  } else if (top > containerHeight) {
    top = containerHeight;
  }
  const saturation = left / containerWidth;
  //   console.log("left / containerWidth", 1 - left / containerWidth);
  const bright = 1 - top / containerHeight;
  return {
    h: hsl.h,
    s: saturation,
    v: bright,
    a: hsl.a,
    source: "hsv",
  };
};
export const calcHSLWithPoint = (
  point: { x: number; y: number },
  direction: "vertical" | "horizontal",
  hsl: { h: number; s: number; l: number; a: number },
  container: { width: number; height: number; left: number; top: number }
) => {
  const { x, y } = point;
  const { width: containerWidth, height: containerHeight } = container;
  const left = x - container.left;
  const top = y - container.top;

  if (direction === "vertical") {
    //     let h;
    //     if (top < 0) {
    //       h = 359;
    //     } else if (top > containerHeight) {
    //       h = 0;
    //     } else {
    //       const percent = -((top * 100) / containerHeight) + 100;
    //       h = (360 * percent) / 100;
    //     }
    //     if (hsl.h !== h) {
    //       return {
    //         h,
    //         s: hsl.s,
    //         l: hsl.l,
    //         a: hsl.a,
    //         source: "hsl",
    //       };
    //     }
  } else {
    let h;
    if (left < 0) {
      h = 0;
    } else if (left > containerWidth) {
      h = 359;
    } else {
      const percent = (left * 100) / containerWidth;
      h = (360 * percent) / 100;
    }
    if (hsl.h !== h) {
      return {
        h,
        s: hsl.s,
        l: hsl.l,
        a: hsl.a,
        source: "hsl",
      };
    }
  }
  return null;
};

export const colorToHSLAndMore = (data: string) => {
  const color = tinycolor2(data);
  const hsl = color.toHsl();
  const hsv = color.toHsv();
  const rgb = color.toRgb();
  const hex = color.toHex();
  if (hsl.s === 0) {
    hsl.h = 0;
    hsv.h = 0;
  }
  const transparent = hex === "000000" && rgb.a === 0;

  return {
    hsl,
    hex: transparent ? "transparent" : `#${hex}`,
    rgb,
    hsv,
    oldHue: hsl.h,
    source: "other",
  };
};

export function HSLToColor(hsl: { h: number; s: number; l: number }) {
  const text = `hsl(${hsl.h}, ${hsl.s * 100}%, ${hsl.l * 100}%)`;
  return tinycolor2(text).toHex();
}
export function HSVToColor(hsv: { h: number; s: number; v: number }) {
  const text = `hsv(${hsv.h}, ${hsv.s * 100}%, ${hsv.v * 100}%)`;
  return tinycolor2(text).toHex();
}

export function getGradientColorBetweenStop(offset: number, stops: { color: string }[]) {
  const startColor = tinycolor2(stops[0].color).toRgb();
  const endColor = tinycolor2(stops[1].color).toRgb();
  const ratio = offset / 100;
  const r = Math.round(startColor.r + (endColor.r - startColor.r) * ratio);
  const g = Math.round(startColor.g + (endColor.g - startColor.g) * ratio);
  const b = Math.round(startColor.b + (endColor.b - startColor.b) * ratio);
  return `#${tinycolor2(`rgb(${r}, ${g}, ${b})`).toHex()}`;
}
