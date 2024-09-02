export function getSymmetricPoints(point2: { x: number; y: number }, point: { x: number; y: number }) {
  const symmetricPoint = {
    x: 2 * point2.x - point.x,
    y: 2 * point2.y - point.y,
  };
  return symmetricPoint;
}

export function getSymmetricPoint2(
  a1: { x: number; y: number },
  a2: { x: number; y: number },
  a3: { x: number; y: number },
  ratio = 1
) {
  // console.log(a1, a2, a3);
  const m1 = {
    x: (a1.x + a2.x) / 2,
    y: (a1.y + a2.y) / 2,
  };
  // console.log("m1", m1);
  // 计算对称点 a4'
  const a4_prime = {
    x: 2 * m1.x - a3.x,
    y: 2 * m1.y - a3.y,
  };
  // console.log("a4_prime", a4_prime);
  // 计算与 m1 到 a4' 的距离
  const d = Math.sqrt((m1.x - a3.x) ** 2 + (m1.y - a3.y) ** 2);
  // 计算点 a4
  const a4 = {
    x: m1.x + ratio * (a4_prime.x - m1.x),
    y: m1.y + ratio * (a4_prime.y - m1.y),
  };
  return a4;
}

const prefix = "data:image/";
const svg = prefix + "svg+xml,";
const space = "%20";
const quotes = "%22";
const equal = "%3D";

export function toBase64(template: string, options: Partial<{ doubleQuote: boolean }> = {}) {
  const { doubleQuote = false } = options;
  // if (template.indexOf(svg) === 0) {
  //   const str = template.replace(new RegExp(svg.replace(/\+/, "\\+")), "").replace(/'/g, '"');
  //   return {
  //     data: decodeURIComponent(str),
  //     input: template,
  //   };
  // }
  if (template.indexOf(prefix) === 0) {
    return template;
  }
  const data = encodeURIComponent(template)
    .replace(new RegExp(space, "g"), " ")
    .replace(new RegExp(quotes, "g"), doubleQuote ? '"' : "'")
    .replace(new RegExp(equal, "g"), "=");
  return svg + data;
}
