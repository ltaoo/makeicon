import { describe, it, expect } from "vitest";
import { getSymmetricPoint2 } from "./utils";

describe("1", () => {
  it("1", () => {
    const a1 = {
      x: 240,
      y: 160,
    };
    const a2 = {
      x: 320,
      y: 160,
    };
    const a3 = {
      x: 280,
      y: 280,
    };
    const r = getSymmetricPoint2(a1, a2, a3, 2 / 6);
    expect(r).toStrictEqual({
      x: 280,
      y: 120,
    });
  });
});

function joinOutline(
  paths: {
    lines: { curves: { index: number; _3d?: number }[] };
  }[]
) {
  const forward_path: { index: number }[] = [];
  // const curve: { x: number; y: number }[][] = [];
  const back_path: { index: number }[] = [];
  // let start_cap: { index: number } | null = null;
  // let end_cap: { index: number } | null = null;

  for (let i = 0; i < paths.length; i += 1) {
    const cur = paths[i];
    const { lines } = cur;
    // const next = paths[i + 1];
    (() => {
      let k = 0;
      k += 1;
      let is_forward = true;
      while (k < lines.curves.length) {
        const curve = lines.curves[k];
        if (curve._3d === undefined) {
          is_forward = false;
          // end_cap = curve;
          break;
        }
        if (is_forward) {
          forward_path.push(curve);
        }
        k += 1;
      }
      let j = lines.curves.length - 1;
      while (j > k) {
        const curve = lines.curves[j];
        if (!is_forward) {
          back_path.unshift(curve);
        }
        j -= 1;
      }
    })();
  }

  return [...forward_path, ...back_path];
}

describe("2", () => {
  it("2", () => {
    const paths = [
      {
        lines: {
          curves: [
            {
              index: 0,
            },
            {
              index: 1,
              _3d: 0,
            },
            {
              index: 2,
              _3d: 0,
            },
            {
              index: 3,
              _3d: 0,
            },
            {
              index: 4,
            },
            {
              index: 5,
              _3d: 0,
            },
            {
              index: 6,
              _3d: 0,
            },
            {
              index: 7,
              _3d: 0,
            },
          ],
        },
      },
      {
        lines: {
          curves: [
            {
              index: 8,
            },
            {
              index: 9,
              _3d: 0,
            },
            {
              index: 10,
              _3d: 0,
            },
            {
              index: 11,
              _3d: 0,
            },
            {
              index: 12,
            },
            // 4
            {
              index: 13,
              _3d: 0,
            },
            {
              index: 14,
              _3d: 0,
            },
            {
              index: 15,
              _3d: 0,
            },
          ],
        },
      },
    ];
    const r = joinOutline(paths);
    expect(r).toStrictEqual([
      // {
      //   index: 0,
      // },
      {
        index: 1,
        _3d: 0,
      },
      {
        index: 2,
        _3d: 0,
      },
      {
        index: 3,
        _3d: 0,
      },
      {
        index: 9,
        _3d: 0,
      },
      {
        index: 10,
        _3d: 0,
      },
      {
        index: 11,
        _3d: 0,
      },
      {
        index: 13,
        _3d: 0,
      },
      {
        index: 14,
        _3d: 0,
      },
      {
        index: 15,
        _3d: 0,
      },
      {
        index: 5,
        _3d: 0,
      },
      {
        index: 6,
        _3d: 0,
      },
      {
        index: 7,
        _3d: 0,
      },
    ]);
  });
});
