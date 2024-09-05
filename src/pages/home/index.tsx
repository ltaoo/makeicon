/**
 * @file 首页
 */
import { createSignal, For, JSX, onMount, Show } from "solid-js";

import { ViewComponent } from "@/store/types";
import { Dialog, Textarea } from "@/components/ui";
import { DialogCore, InputCore } from "@/domains/ui";
import { BezierPath } from "@/biz/bezier_path";
import { Canvas } from "@/biz/canvas";
import { connect } from "@/biz/canvas/connect.web";
import { PathPoint } from "@/biz/path_point";
import { BezierPoint } from "@/biz/bezier_point";

export const HomeIndexPage: ViewComponent = (props) => {
  const { app } = props;

  let canvas: HTMLCanvasElement | undefined;
  let p1: HTMLCanvasElement | undefined;

  const $$canvas = Canvas({ paths: [] });
  const $dialog = new DialogCore({
    onOk() {
      if (!$input.value) {
        app.tip({
          text: ["请输入 SVG 内容"],
        });
        return;
      }
      const content = $input.value;
      const { dimensions, paths } = $$canvas.buildBezierPathsFromPathString(content);
      $$canvas.setPaths(paths, { transform: true, dimensions });
      $dialog.hide();
    },
  });
  const d = `M714.666667 100.885333l137.6 25.024A79.274667 79.274667 0 0 1 917.333333 203.904v487.978667a79.274667 79.274667 0 0 1-38.293333 67.861333L573.44 944.234667a118.890667 118.890667 0 0 1-122.922667 0L144.96 759.744A79.274667 79.274667 0 0 1 106.666667 691.904V203.882667a79.274667 79.274667 0 0 1 65.066666-77.994667L309.333333 100.906667a1132.117333 1132.117333 0 0 1 405.333334 0z m-11.456 62.954667a1068.117333 1068.117333 0 0 0-382.421334 0l-137.6 25.045333A15.274667 15.274667 0 0 0 170.666667 203.904v487.978667c0 5.333333 2.794667 10.304 7.381333 13.077333l305.578667 184.490667a54.890667 54.890667 0 0 0 56.746666 0l305.578667-184.490667a15.274667 15.274667 0 0 0 7.381333-13.077333V203.904a15.274667 15.274667 0 0 0-12.522666-15.018667l-137.6-25.045333z`;
  const $input = new InputCore({
    defaultValue: ``,
  });
  // $$canvas.setPaths([
  //   BezierPath({
  //     points: [
  //       PathPoint({
  //         point: BezierPoint({
  //           x: 913.317653,
  //           y: 450.150478,
  //         }),
  //         from: null,
  //         to: null,
  //         start: true,
  //       }),
  //       PathPoint({
  //         point: BezierPoint({
  //           x: 869.250413,
  //           y: 473.954466,
  //         }),
  //         from: null,
  //         to: null,
  //         circle: {
  //           center: {
  //             x: 903.0509753949149,
  //             y: 483.8360771078035,
  //           },
  //           radius: 35.215398,
  //           arc: {
  //             start: 3.4260168620059566,
  //             end: 5.008224782228062,
  //           },
  //           counterclockwise: true,
  //         },
  //       }),
  //       PathPoint({
  //         point: BezierPoint({
  //           x: 824.543282,
  //           y: 576.550507,
  //         }),
  //         from: null,
  //         to: null,
  //         circle: {
  //           center: {
  //             x: 429.1964724215753,
  //             y: 343.2358589053713,
  //           },
  //           radius: 459.058629,
  //           arc: {
  //             start: 0.2887493994798176,
  //             end: 0.5331467371323647,
  //           },
  //           counterclockwise: false,
  //         },
  //       }),
  //     ],
  //   }),
  // ]);

  onMount(() => {
    function draw(ctx: CanvasRenderingContext2D) {
      $$canvas.clear();
      $$canvas.drawGrid();
      // const $$path = $$canvas.getCurPath();
      if ($$canvas.debug) {
        const m = $$canvas.getMousePoint();
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(m.text, m.x, m.y);
      }
      console.log("the path count", $$canvas.paths.length);
      const logs: string[] = [];
      function log(...args: string[]) {
        logs.push(...args);
      }
      for (let i = 0; i < $$canvas.paths.length; i += 1) {
        const $$path = $$canvas.paths[i];
        if ($$path.state.stroke.enabled) {
          const curves = $$path.buildOutline({ cap: "none" });
          // 绘制描边
          ctx.save();
          ctx.beginPath();
          for (let i = 0; i < curves.outline.length; i += 1) {
            const curve = curves.outline[i];
            const [start, c1, c2, end] = curve.points;
            const next = curves.outline[i + 1];
            if (i === 0 && start) {
              ctx.moveTo(start.x, start.y);
            }
            (() => {
              if (curve._linear) {
                const last = curve.points[curve.points.length - 1];
                ctx.lineTo(last.x, last.y);
                return;
              }
              if (end) {
                ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
                return;
              }
              ctx.quadraticCurveTo(c1.x, c1.y, c2.x, c2.y);
            })();
          }
          ctx.closePath();
          ctx.fillStyle = $$path.state.stroke.color;
          ctx.fill();
          ctx.restore();
        }
        // 绘制路径
        const commands = $$path.buildCommands();
        ctx.save();
        for (let i = 0; i < commands.length; i += 1) {
          const prev = commands[i - 1];
          const command = commands[i];
          const next_command = commands[i + 1];
          if (command.c === "M") {
            const [x, y] = command.a;
            log(`ctx.moveTo(${x},${y});`);
            ctx.moveTo(x, y);
            log("ctx.beginPath();");
            ctx.beginPath();
          }
          if (command.c === "A") {
            const [c1x, c1y, radius, angle1, angle2, counterclockwise] = command.a;
            log(`ctx.arc(${c1x}, ${c1y}, ${radius}, ${angle1}, ${angle2}, ${Boolean(counterclockwise)});`);
            ctx.arc(c1x, c1y, radius, angle1, angle2, Boolean(counterclockwise));
          }
          if (command.c === "C") {
            const [c1x, c1y, c2x, c2y, ex, ey] = command.a;
            log(`ctx.bezierCurveTo(${c1x}, ${c1y}, ${c2x}, ${c2y}, ${ex}, ${ey});`);
            ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
          }
          if (command.c === "L") {
            const [x, y] = command.a;
            log(`ctx.lineTo(${x}, ${y});`);
            ctx.lineTo(x, y);
          }
          if (command.c === "Z") {
            log("ctx.closePath();");
            ctx.closePath();
          }
        }
        console.log(logs.join("\n"));
        if ($$path.state.fill.enabled && $$path.closed) {
          ctx.fillStyle = $$path.state.fill.color;
          ctx.fill();
        }
        ctx.strokeStyle = "lightgrey";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        // 绘制锚点
        if ($$canvas.state.cursor) {
          ctx.save();
          for (let i = 0; i < $$path.skeleton.length; i += 1) {
            const point = $$path.skeleton[i];
            // console.log("[PAGE]home/index", i, point.start ? "start" : "", point.from, point.to, point.virtual);
            ctx.strokeStyle = "lightgrey";
            (() => {
              if (point.hidden) {
                return;
              }
              ctx.beginPath();
              if (point.from) {
                $$canvas.drawLine(point, point.from);
              }
              if (point.to && !point.virtual) {
                $$canvas.drawLine(point, point.to);
              }
              ctx.strokeStyle = "black";
              const radius = 3;
              $$canvas.drawCircle(point.point, radius);
              if (point.from) {
                $$canvas.drawDiamondAtLineEnd(point, point.from);
              }
              if (point.to && !point.virtual) {
                $$canvas.drawDiamondAtLineEnd(point, point.to);
              }
            })();
          }
          ctx.restore();
        }
      }
      // c1.scale(0.12, 0.12);
      // c1.clearRect(0, 0, 48, 48);
      // const grid = $$canvas.grid;
      // c1.drawImage(canvas, grid.x, grid.y, grid.width, grid.height, 0, 0, 48, 48);
    }

    const $canvas = canvas;
    if (!$canvas) {
      return;
    }
    const ctx = $canvas.getContext("2d");
    if (!ctx) {
      return;
    }
    connect($$canvas, $canvas, ctx);
    $$canvas.onUpdate(() => {
      draw(ctx);
    });
    app.onKeyup(({ code }) => {
      if (code === "Backspace") {
        $$canvas.deleteCurPoint();
      }
    });
    draw(ctx);
  });

  return (
    <>
      <div class="relative">
        <canvas ref={canvas} width="100%" height="100%" />
        <div class="absolute right-0 top-0">
          <div class="p-4">
            <canvas ref={p1} width="48" height="48" />
          </div>
        </div>
        <div class="absolute left-0 bottom-0 w-full">
          <div class="flex items-center p-4 space-x-2">
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.selectCursor();
              }}
            >
              选择
            </div>
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.selectPen();
              }}
            >
              钢笔
            </div>
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                const content = $$canvas.exportSVG({ cap: "none" });
                console.log(content);
                app.copy(content);
              }}
            >
              导出SVG
            </div>
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $dialog.show();
              }}
            >
              导入SVG
            </div>
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                const content = $$canvas.exportWeappCode();
                console.log(content);
                app.copy(content);
              }}
            >
              小程序代码
            </div>
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.update();
              }}
            >
              刷新
            </div>
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.setDebug();
              }}
            >
              debug
            </div>
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.cancelCursor();
              }}
            >
              隐藏控制点
            </div>
          </div>
        </div>
      </div>
      <Dialog store={$dialog}>
        <div class="w-[520px]">
          <Textarea store={$input} />
        </div>
      </Dialog>
    </>
  );
};
