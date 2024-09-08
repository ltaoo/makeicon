import { describe, it, expect } from "vitest";

import { objectToHTML } from "./index";

describe("build html from object", () => {
  it("svg", () => {
    // 示例对象
    const svgObject = {
      tag: "svg",
      viewBox: "0 0 1024 1024",
      "xmlns:svg": "http://www.w3.org/2000/svg",
      children: [{ tag: "path", d: "M0 0L100 100" }],
    };
    const result = objectToHTML(svgObject);

    expect(result).toBe(
      `<svg viewBox="0 0 1024 1024" xmlns:svg="http://www.w3.org/2000/svg"><path d="M0 0L100 100"></path></svg>`
    );
  });

  it("svg", () => {
    // 示例对象
    const svgObject = {
      tag: "svg",
      viewBox: "0 0 1024 1024",
      "xmlns:svg": "http://www.w3.org/2000/svg",
      children: [{ tag: "g", class: "layer", children: [{ tag: "path", d: "M0 0L100 100" }] }],
    };
    const result = objectToHTML(svgObject);

    expect(result).toBe(
      `<svg viewBox="0 0 1024 1024" xmlns:svg="http://www.w3.org/2000/svg"><g class="layer"><path d="M0 0L100 100"></path></g></svg>`
    );
  });
});
