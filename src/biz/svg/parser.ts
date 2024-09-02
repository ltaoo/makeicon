const kCommandTypeRegex = /^[\t\n\f\r ]*([MLHVZCSQTAmlhvzcsqta])[\t\n\f\r ]*/;
const kFlagRegex = /^[01]/;
const kNumberRegex = /^[+-]?(([0-9]*\.[0-9]+)|([0-9]+\.)|([0-9]+))([eE][+-]?[0-9]+)?/;
const kCoordinateRegex = kNumberRegex;
const kCommaWsp = /^(([\t\n\f\r ]+,?[\t\n\f\r ]*)|(,[\t\n\f\r ]*))/;

const kGrammar: { [key: string]: RegExp[] } = {
  M: [kCoordinateRegex, kCoordinateRegex],
  L: [kCoordinateRegex, kCoordinateRegex],
  H: [kCoordinateRegex],
  V: [kCoordinateRegex],
  Z: [],
  C: [kCoordinateRegex, kCoordinateRegex, kCoordinateRegex, kCoordinateRegex, kCoordinateRegex, kCoordinateRegex],
  S: [kCoordinateRegex, kCoordinateRegex, kCoordinateRegex, kCoordinateRegex],
  Q: [kCoordinateRegex, kCoordinateRegex, kCoordinateRegex, kCoordinateRegex],
  T: [kCoordinateRegex, kCoordinateRegex],
  A: [kNumberRegex, kNumberRegex, kCoordinateRegex, kFlagRegex, kFlagRegex, kCoordinateRegex, kCoordinateRegex],
};

/**
 * M (moveto) :
含义：移动到新的起始点，不绘制线条。
语法：M x,y 或 M x1,y1 x2,y2 ...（可以指定多个点）。
示例：M 10 10 将起点移动到坐标 (10, 10)。
L (lineto) :
含义：从当前点绘制一条直线到指定点。
语法：L x,y 或 L x1,y1 x2,y2 ...（可以指定多个点）。
示例：L 20 20 从当前点绘制一条直线到 (20, 20)。
C (cubic Bezier curve) :
含义：绘制一条三次贝塞尔曲线。
语法：C x1,y1 x2,y2 x,y，其中 (x1, y1) 和 (x2, y2) 是控制点，(x, y) 是曲线的终点。
示例：C 30 40, 50 60, 70 80 绘制一条从当前点到 (70, 80) 的三次贝塞尔曲线。
S (smooth cubic Bezier curve) :
含义：绘制一条平滑的三次贝塞尔曲线，使用前一个曲线的终点作为控制点。
语法：S x2,y2 x,y。
示例：S 50 60, 70 80。
Q (quadratic Bezier curve) :
含义：绘制一条二次贝塞尔曲线。
语法：Q x1,y1 x,y。
示例：Q 30 40, 50 60。
T (smooth quadratic Bezier curve) :
含义：绘制一条平滑的二次贝塞尔曲线。
语法：T x,y。
示例：T 50 60。
Z (closepath) :
含义：关闭路径，绘制一条线从当前点到路径的起始点。
语法：Z。
示例：Z 将当前路径闭合。
H (horizontal lineto) :
含义：绘制一条水平线到指定的 x 坐标。
语法：H x。
示例：H 100。
V (vertical lineto) :
含义：绘制一条垂直线到指定的 y 坐标。
语法：V y。
示例：V 100。
 */

export class SvgParser {
  static components(type: string, path: string, cursor: number): [number, string[][]] {
    const expectedRegexList = kGrammar[type.toUpperCase()];

    const components: string[][] = [];
    while (cursor <= path.length) {
      const component: string[] = [type];
      for (const regex of expectedRegexList) {
        const match = path.slice(cursor).match(regex);

        if (match !== null) {
          component.push(match[0]);
          cursor += match[0].length;
          const ws = path.slice(cursor).match(kCommaWsp);
          if (ws !== null) {
            cursor += ws[0].length;
          }
        } else if (component.length === 1) {
          return [cursor, components];
        } else {
          throw new Error("malformed path (first error at " + cursor + ")");
        }
      }
      components.push(component);
      if (expectedRegexList.length === 0) {
        return [cursor, components];
      }
      if (type === "m") {
        type = "l";
      }
      if (type === "M") {
        type = "L";
      }
    }
    throw new Error("malformed path (first error at " + cursor + ")");
  }

  public static parse(path: string): string[][] {
    let cursor = 0;
    let tokens: string[][] = [];
    while (cursor < path.length) {
      const match = path.slice(cursor).match(kCommandTypeRegex);
      if (match !== null) {
        const command = match[1];
        cursor += match[0].length;
        const componentList = SvgParser.components(command, path, cursor);
        cursor = componentList[0];
        tokens = [...tokens, ...componentList[1]];
      } else {
        throw new Error("malformed path (first error at " + cursor + ")");
      }
    }
    return tokens;
  }
}

// 解析路径数据
export function parsePathData(pathData: string) {
  const points = SvgParser.parse(pathData);
  return points;
}
