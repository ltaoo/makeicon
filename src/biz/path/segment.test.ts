import { describe, it, expect } from "vitest";

import { BezierPoint } from "@/biz/bezier_point";
import { Point, PointType } from "@/biz/point";

import { LinePath } from "./index";

describe("build segment from points", () => {
  it("normal horizontal line", () => {
    const linePath = LinePath({ points: [] });
    const segment = linePath.createSegmentFromTwoPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 10, y: 10 }),
        from: null,
        to: null,
      }),
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 20, y: 10 }),
        from: null,
        to: null,
      })
    );
    const box = segment.box();
    console.log(box);
    expect(box).toStrictEqual({
      x: {
        min: 10,
        max: 20,
        size: 10,
      },
      y: {
        min: 10,
        max: 10,
        size: 0,
      },
    });
  });
  it("reverse horizontal line", () => {
    const linePath = LinePath({ points: [] });
    const segment = linePath.createSegmentFromTwoPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 20, y: 10 }),
        from: null,
        to: null,
      }),
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 10, y: 10 }),
        from: null,
        to: null,
      })
    );
    const box = segment.box();
    console.log(box);
    expect(box).toStrictEqual({
      x: {
        min: 10,
        max: 20,
        size: 10,
      },
      y: {
        min: 10,
        max: 10,
        size: 0,
      },
    });
  });
  it("normal vertical line", () => {
    const linePath = LinePath({ points: [] });
    const segment = linePath.createSegmentFromTwoPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 10, y: 10 }),
        from: null,
        to: null,
      }),
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 10, y: 20 }),
        from: null,
        to: null,
      })
    );
    const box = segment.box();
    console.log(box);
    expect(box).toStrictEqual({
      x: {
        min: 10,
        max: 10,
        size: 0,
      },
      y: {
        min: 10,
        max: 20,
        size: 10,
      },
    });
  });
  it("reverse vertical line", () => {
    const linePath = LinePath({ points: [] });
    const segment = linePath.createSegmentFromTwoPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 10, y: 20 }),
        from: null,
        to: null,
      }),
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 10, y: 10 }),
        from: null,
        to: null,
      })
    );
    const box = segment.box();
    console.log(box);
    expect(box).toStrictEqual({
      x: {
        min: 10,
        max: 10,
        size: 0,
      },
      y: {
        min: 10,
        max: 20,
        size: 10,
      },
    });
  });
  it("line1", () => {
    const linePath = LinePath({ points: [] });
    const segment = linePath.createSegmentFromTwoPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 10, y: 20 }),
        from: null,
        to: null,
      }),
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 20, y: 40 }),
        from: null,
        to: null,
      })
    );
    const box = segment.box();
    console.log(box);
    expect(box).toStrictEqual({
      x: {
        min: 10,
        max: 20,
        size: 10,
      },
      y: {
        min: 20,
        max: 40,
        size: 20,
      },
    });
  });
  it("line2", () => {
    const linePath = LinePath({ points: [] });
    const segment = linePath.createSegmentFromTwoPoint(
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 20, y: 40 }),
        from: null,
        to: null,
      }),
      BezierPoint({
        point: Point({ type: PointType.Anchor, x: 10, y: 20 }),
        from: null,
        to: null,
      })
    );
    const box = segment.box();
    console.log(box);
    expect(box).toStrictEqual({
      x: {
        min: 10,
        max: 20,
        size: 10,
      },
      y: {
        min: 20,
        max: 40,
        size: 20,
      },
    });
  });
});
