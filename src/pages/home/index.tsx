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
  // const d = `M 929.421 179.476 a 69.8336 69.8336 0 0 0 -63.136 -42.6595 l -10.8782 -0.0853 c -62.9227 0 -120.4277 19.1114 -171.1498 40.3985 C 639.9557 100.2148 598.64 48.9168 555.5753 17.0715 a 69.7056 69.7056 0 0 0 -73.1823 -11.4327 a 69.8122 69.8122 0 0 0 -17.0638 10.3449 c -42.8728 31.2907 -85.5749 83.6979 -130.1114 159.6531 c -50.1249 -20.5192 -106.7127 -38.9694 -167.3318 -38.9694 l -10.6862 0.1066 a 69.7482 69.7482 0 0 0 -62.7948 42.6168 C 69.9611 237.3863 59.9575 306.4947 65.4606 379.2291 a 35.4714 35.4714 0 0 0 37.9029 32.8905 a 35.5993 35.5993 0 0 0 32.5279 -38.3295 c -4.6072 -61.0244 3.4128 -118.2521 23.1641 -165.5828 l 9.1718 -0.0853 c 58.8701 0 115.3299 22.4602 168.0997 45.475 c 16.6372 7.2521 36.0046 0.6399 44.8351 -15.4001 c 45.4323 -82.3755 86.748 -136.297 126.2934 -164.8362 c 0.8532 -0.5972 1.1731 -1.5357 1.9197 -2.2183 c 1.0878 1.0025 2.2183 1.941 3.4128 2.7942 c 39.2894 28.6245 80.3065 82.866 125.3762 165.86 a 35.1727 35.1727 0 0 0 45.2617 15.4641 c 50.8928 -22.8015 110.3387 -47.1174 171.6617 -47.1174 l 9.6624 0.1066 c 18.6635 44.6645 26.8755 98.5434 23.8253 155.9844 c -1.0665 19.6873 13.8643 36.5165 33.3597 37.583 c 19.3247 1.3864 36.1326 -14.0136 37.1777 -33.7223 c 3.6687 -68.5964 -6.6122 -133.8441 -29.691 -188.6402 z`;
  // const d2 = `M913.317653 450.150478a35.215398 35.215398 0 0 0-44.06724 23.803988 459.058629 459.058629 0 0 1-44.707131 102.596041c-65.268999 109.890812-179.212462 172.920189-312.629976 172.920189-133.460173 0-247.424965-63.050707-312.693965-172.984178a460.125116 460.125116 0 0 1-44.643142-102.468063 35.279387 35.279387 0 0 0-44.06724-23.825318 35.791301 35.791301 0 0 0-23.548031 44.557824 531.899686 531.899686 0 0 0 51.703286 118.486696c71.305315 120.150416 195.892317 195.423063 337.927045 206.173251v168.718231c0 19.730008 15.784006 35.705982 35.322047 35.705982 19.516711 0 35.322047-15.997304 35.322047-35.705982v-168.718231c141.970739-10.750188 266.536411-86.001505 337.863056-206.109262a531.259794 531.259794 0 0 0 51.767275-118.593345 35.791301 35.791301 0 0 0-23.548031-44.557823z`;
  // const d = `M714.666667 100.885333l137.6 25.024A79.274667 79.274667 0 0 1 917.333333 203.904v487.978667a79.274667 79.274667 0 0 1-38.293333 67.861333L573.44 944.234667a118.890667 118.890667 0 0 1-122.922667 0L144.96 759.744A79.274667 79.274667 0 0 1 106.666667 691.904V203.882667a79.274667 79.274667 0 0 1 65.066666-77.994667L309.333333 100.906667a1132.117333 1132.117333 0 0 1 405.333334 0z m-11.456 62.954667a1068.117333 1068.117333 0 0 0-382.421334 0l-137.6 25.045333A15.274667 15.274667 0 0 0 170.666667 203.904v487.978667c0 5.333333 2.794667 10.304 7.381333 13.077333l305.578667 184.490667a54.890667 54.890667 0 0 0 56.746666 0l305.578667-184.490667a15.274667 15.274667 0 0 0 7.381333-13.077333V203.904a15.274667 15.274667 0 0 0-12.522666-15.018667l-137.6-25.045333z`;
  const s1 = `<svg t="1725539660638" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="5035" width="200" height="200"><path d="M512 74.666667c241.536 0 437.333333 195.797333 437.333333 437.333333S753.536 949.333333 512 949.333333 74.666667 753.536 74.666667 512 270.464 74.666667 512 74.666667z m0 64C305.813333 138.666667 138.666667 305.813333 138.666667 512S305.813333 885.333333 512 885.333333 885.333333 718.186667 885.333333 512 718.186667 138.666667 512 138.666667z m138.666667 170.666666a32 32 0 0 1 31.850666 28.928L682.666667 341.333333v106.666667a32 32 0 0 1-63.850667 3.072L618.666667 448v-106.666667a32 32 0 0 1 32-32z m-277.333334 0a32 32 0 0 1 31.850667 28.928L405.333333 341.333333v106.666667a32 32 0 0 1-63.850666 3.072L341.333333 448v-106.666667a32 32 0 0 1 32-32z" fill="#111111" p-id="5036"></path></svg>`;
  // const d = `M512 74.666667c241.536 0 437.333333 195.797333 437.333333 437.333333S753.536 949.333333 512 949.333333 74.666667 753.536 74.666667 512 270.464 74.666667 512 74.666667z m0 64C305.813333 138.666667 138.666667 305.813333 138.666667 512S305.813333 885.333333 512 885.333333 885.333333 718.186667 885.333333 512 718.186667 138.666667 512 138.666667z m138.666667 170.666666a32 32 0 0 1 31.850666 28.928L682.666667 341.333333v106.666667a32 32 0 0 1-63.850667 3.072L618.666667 448v-106.666667a32 32 0 0 1 32-32z m-277.333334 0a32 32 0 0 1 31.850667 28.928L405.333333 341.333333v106.666667a32 32 0 0 1-63.850666 3.072L341.333333 448v-106.666667a32 32 0 0 1 32-32z`;
  // const d = `M 512 74.6667 C 753.536 74.6667 949.3333 270.464 949.3333 512 S 753.536 949.3333 516.761 950.786 S 74.6667 753.536 74.6667 512 S 270.464 74.6667 512 74.6667 z`;
  // const d = `M496.426667 416a32 32 0 0 1 32.917333 31.082667l7.957333 277.333333a32 32 0 0 1-63.978666 1.834667l-7.957334-277.333334a32 32 0 0 1 31.061334-32.896z`;
  const d = `M 248.279 681.4515 H 807.1987 A 149.0534 149.0534 0 0 1 956.2522 830.505 V 855.3472 A 149.033 149.033 0 0 1 807.2192 1004.4006 H 211.0054 A 149.0534 149.0534 0 0 1 61.952 855.3472 V 793.2314 A 111.7389 111.7389 0 0 1 117.8214 696.4224 C 129.1264 689.8893 136.4582 678.2362 136.4582 665.2109 V 618.646 A 37.2736 37.2736 0 1 1 210.985 618.646 V 643.5087 A 37.2736 37.2736 0 0 0 248.2586 680.7618 Z`;
  const $input = new InputCore({
    defaultValue: `<svg t="1725376930087" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1891" data-spm-anchor-id="a313x.collections_detail.0.i4.361a3a81f5lUb4" width="200" height="200"><path d="${d}" fill="#111111" p-id="1892" data-spm-anchor-id="a313x.collections_detail.0.i2.361a3a81f5lUb4" class=""></path></svg>`,
    // defaultValue: ``,
    // defaultValue: `<svg t="1725523028128" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="2195" width="200" height="200"><path d="M714.666667 100.885333l137.6 25.024A79.274667 79.274667 0 0 1 917.333333 203.904v487.978667a79.274667 79.274667 0 0 1-38.293333 67.861333L573.44 944.234667a118.890667 118.890667 0 0 1-122.922667 0L144.96 759.744A79.274667 79.274667 0 0 1 106.666667 691.904V203.882667a79.274667 79.274667 0 0 1 65.066666-77.994667L309.333333 100.906667a1132.117333 1132.117333 0 0 1 405.333334 0z m-11.456 62.954667a1068.117333 1068.117333 0 0 0-382.421334 0l-137.6 25.045333A15.274667 15.274667 0 0 0 170.666667 203.904v487.978667c0 5.333333 2.794667 10.304 7.381333 13.077333l305.578667 184.490667a54.890667 54.890667 0 0 0 56.746666 0l305.578667-184.490667a15.274667 15.274667 0 0 0 7.381333-13.077333V203.904a15.274667 15.274667 0 0 0-12.522666-15.018667l-137.6-25.045333z" fill="#111111" p-id="2196"></path><path d="M512 277.333333a42.666667 42.666667 0 0 1 42.666667 42.666667v225.856a42.666667 42.666667 0 1 1-85.333334 0V320a42.666667 42.666667 0 0 1 42.666667-42.666667zM512 640a42.666667 42.666667 0 0 1 42.666667 42.666667v21.333333a42.666667 42.666667 0 1 1-85.333334 0v-21.333333a42.666667 42.666667 0 0 1 42.666667-42.666667z" fill="#111111" p-id="2197"></path></svg>`,
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
      if ($$canvas.debug) {
        const m = $$canvas.getMousePoint();
        ctx.fillStyle = "black";
        ctx.font = "10px Arial";
        ctx.fillText(m.text, m.x, m.y);
      }
      console.log("[PAGE]before render $$canvas.paths", $$canvas.paths);
      for (let i = 0; i < $$canvas.paths.length; i += 1) {
        const logs: string[] = [];
        function log(...args: string[]) {
          logs.push(...args);
        }
        const $$prev_path = $$canvas.paths[i - 1];
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
        // ctx.save();
        for (let i = 0; i < commands.length; i += 1) {
          const prev = commands[i - 1];
          const command = commands[i];
          const next_command = commands[i + 1];
          if (command.c === "M") {
            const [x, y] = command.a;
            // 这两个的顺序影响很大？
            log(`ctx.beginPath();`);
            ctx.beginPath();
            log(`ctx.moveTo(${x},${y});`);
            ctx.moveTo(x, y);
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
            log(`ctx.closePath();`);
            ctx.closePath();
          }
        }
        if ($$path.state.fill.enabled && $$path.closed) {
          if ($$path.prev) {
            const cur_size = $$path.size;
            const prev_size = $$path.prev.size;
            // console.log("----------------");
            // console.log("check need update composition opertion");
            // console.log(cur_size.x, cur_size.y, cur_size.x2, cur_size.y2);
            // console.log(prev_size.x, prev_size.y, prev_size.x2, prev_size.y2);
            if (
              cur_size.x > prev_size.x &&
              cur_size.y > prev_size.y &&
              cur_size.x2 < prev_size.x2 &&
              cur_size.y2 < prev_size.y2
            ) {
              log(`ctx.globalCompositeOperation = "destination-out";`);
              ctx.globalCompositeOperation = "destination-out";
            }
          }
          log(`ctx.fillStyle = "${$$path.state.fill.color}";`);
          ctx.fillStyle = $$path.state.fill.color;
          log(`ctx.fill();`);
          ctx.fill();
          log(`ctx.globalCompositeOperation = "source-over";`);
          ctx.globalCompositeOperation = "source-over";
        }
        ctx.strokeStyle = "lightgrey";
        ctx.lineWidth = 1;
        ctx.stroke();
        console.log(logs.join("\n"));
        // ctx.restore();

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
      $$canvas.drawGrid();
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
