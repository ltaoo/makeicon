/**
 * @file 首页
 */
import { createSignal, For, JSX, onMount, Show } from "solid-js";

import { ViewComponent } from "@/store/types";
import { Dialog, Textarea } from "@/components/ui";
import { DialogCore, InputCore } from "@/domains/ui";
import { buildBezierPathsFromPathString } from "@/biz/bezier_path";
import { Canvas } from "@/biz/canvas";
import { connect } from "@/biz/canvas/connect.web";

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
      const paths = buildBezierPathsFromPathString(content);
      $$canvas.setPaths(paths, { transform: true });
      $dialog.hide();
    },
  });
  const $input = new InputCore({
    defaultValue: "",
  });

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
            // ctx.restore();
            // console.log(curves.outline[i]);
            (() => {
              if (curve._linear) {
                const last = curve.points[curve.points.length - 1];
                ctx.lineTo(last.x, last.y);
                return;
              }
              if (end) {
                // ctx.moveTo(start.x, start.y);
                ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
                return;
              }
              // ctx.moveTo(start.x, start.y);
              ctx.quadraticCurveTo(c1.x, c1.y, c2.x, c2.y);
            })();
          }
          ctx.closePath();
          ctx.fillStyle = $$path.state.stroke.color;
          ctx.fill();
          // ctx.strokeStyle = "red";
          // ctx.lineWidth = 1;
          // ctx.stroke();
          ctx.restore();
        }
        // 绘制路径
        const commands = $$path.getCommands();
        ctx.save();
        ctx.beginPath();
        for (let i = 0; i < commands.length; i += 1) {
          const command = commands[i];
          if (command.c === "M") {
            const [x, y] = command.a;
            ctx.moveTo(x, y);
          }
          if (command.c === "C") {
            const [c1x, c1y, c2x, c2y, ex, ey] = command.a;
            ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
          }
          if (command.c === "L") {
            const [x, y] = command.a;
            ctx.lineTo(x, y);
          }
          if (command.c === "Z") {
            ctx.closePath();
          }
        }
        if ($$path.state.fill.enabled && $$path.closed) {
          ctx.fillStyle = $$path.state.fill.color;
          ctx.fill();
        }
        ctx.strokeStyle = "lightgrey";
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
        // 绘制锚点
        ctx.save();
        for (let i = 0; i < $$path.skeleton.length; i += 1) {
          const point = $$path.skeleton[i];
          ctx.strokeStyle = "lightgrey";
          (() => {
            if (point.hidden) {
              return;
            }
            ctx.beginPath();
            // console.log(i, point.start ? "start" : "", point.from, point.to);
            if (point.from) {
              $$canvas.drawLine(point, point.from);
            }
            if (point.to && !point.virtual) {
              $$canvas.drawLine(point, point.to);
            }
            ctx.strokeStyle = "black";
            const radius = 3;
            $$canvas.drawCircle(point.point, radius);
            // $$canvas.drawLabel(point.point);
            if (point.from) {
              $$canvas.drawDiamondAtLineEnd(point, point.from);
              // $$canvas.drawLabel(point.from);
            }
            if (point.to && !point.virtual) {
              $$canvas.drawDiamondAtLineEnd(point, point.to);
            }
          })();
        }
        ctx.restore();
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
                $$canvas.cancelPen();
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
