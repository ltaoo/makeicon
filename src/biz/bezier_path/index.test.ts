import { describe, it, expect } from "vitest";

import { buildBezierPathsFromPathString } from "./index";

describe("SVG path convert to bezier path", () => {
  it("simple curve1", () => {
    const content = "M120.41 95.9L102.59 60.1C97.4 62.68 92.04 65.87 86.68 69.63C56.62 90.7 27.67 129.47 27.67 171.84Z";
    const paths = buildBezierPathsFromPathString(content);

    expect(paths.length).toBe(1);
    const path = paths[0];
    if (!path) {
      return;
    }
    expect(path.path_points.length).toBe(4);
    // 起点
    expect(path.path_points[0].point.pos).toStrictEqual({
      x: 120.41,
      y: 95.9,
    });
    // 第一条是直线
    expect(path.path_points[1].point.pos).toStrictEqual({
      x: 102.59,
      y: 60.1,
    });
    expect(path.path_points[0].to).toBe(null);
    expect(path.path_points[1].from).toBe(null);
    // 第二条是曲线
    expect(path.path_points[2].point.pos).toStrictEqual({
      x: 86.68,
      y: 69.63,
    });
    expect(path.path_points[1].to).toBeTruthy();
    expect(path.path_points[2].from).toBeTruthy();
    if (path.path_points[1].to) {
      expect(path.path_points[1].to.pos).toStrictEqual({
        x: 97.4,
        y: 62.68,
      });
    }
    if (path.path_points[2].from) {
      expect(path.path_points[2].from.pos).toStrictEqual({
        x: 92.04,
        y: 65.87,
      });
    }
    // 第三条是曲线
    expect(path.path_points[3].point.pos).toStrictEqual({
      x: 27.67,
      y: 171.84,
    });
    expect(path.path_points[2].to).toBeTruthy();
    expect(path.path_points[3].from).toBeTruthy();
    if (path.path_points[2].to) {
      expect(path.path_points[2].to.pos).toStrictEqual({
        x: 56.62,
        y: 90.7,
      });
    }
    if (path.path_points[3].from) {
      expect(path.path_points[3].from.pos).toStrictEqual({
        x: 27.67,
        y: 129.47,
      });
    }
  });
});
