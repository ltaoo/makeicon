/**
 * @file 首页
 * @todo 支持 垫底图 来描图标，手动对一些使用弧线的图标进行转化
 */
import { createSignal, For, onMount } from "solid-js";

import { ViewComponent } from "@/store/types";
import { Dialog, Textarea } from "@/components/ui";
import { DialogCore, InputCore } from "@/domains/ui";
import { connect, connectLayer } from "@/biz/canvas/connect.web";
import { Canvas } from "@/biz/canvas";
import { objectToHTML } from "@/utils";

export const HomeIndexPage: ViewComponent = (props) => {
  const { app } = props;

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
      const result = $$canvas.buildBezierPathsFromPathString(content);
      if (result === null) {
        app.tip({
          text: ["不是合法的 SVG 内容"],
        });
        return;
      }
      const { dimensions, paths } = result;
      $$canvas.setPaths(paths, { transform: true, dimensions });
      $dialog.hide();
    },
  });
  // const d = `M288 373.333333c-82.432 0-149.333333 66.922667-149.333333 149.333334a149.333333 149.333333 0 0 0 149.333333 149.333333c82.496 0 149.333333-66.816 149.333333-149.333333 0-82.410667-66.88-149.333333-149.333333-149.333334z m0 64c47.104 0 85.333333 38.250667 85.333333 85.333334 0 47.146667-38.186667 85.333333-85.333333 85.333333a85.333333 85.333333 0 1 1 0-170.666667zM757.333333 672a128.021333 128.021333 0 1 0 128 128c0-70.656-57.344-128-128-128z m0 64a64.021333 64.021333 0 1 1-64 64c0-35.328 28.672-64 64-64zM757.333333 117.333333a128.021333 128.021333 0 1 0 128 128c0-70.656-57.344-128-128-128z m0 64a64.021333 64.021333 0 1 1-64 64c0-35.328 28.672-64 64-64z`;
  // const d = `M 757.3333 672 A 128.0213 128.0213 0 1 0 885.3333 800 C 885.3333 729.344 827.9893 672 757.3333 672 Z M 757.3333 736 A 64.0213 64.0213 0 1 1 693.3333 800 C 693.3333 764.672 722.0053 736 757.3333 736 Z`;
  // const d = `M 649.7674 305.9614 C 630.2507 305.9614 614.4454 321.9374 614.4454 341.6674 V 376.4989 C 614.4454 396.2289 630.2507 412.2262 649.7674 412.2262 C 669.2841 412.2262 685.0894 396.2289 685.0894 376.4989 V 341.6674 C 685.0894 321.9374 669.2841 305.9614 649.7674 305.9614 Z`;
  // const d = `M 648.128 241.7707 C 700.544 242.7307 743.424 258.752 774.9547 290.2827 C 806.5067 321.856 822.464 364.6933 823.2747 417.0027 A 32 32 0 1 1 759.2747 418.0053 C 758.72 381.4187 748.7147 354.5387 729.7067 335.552 C 710.6773 316.5227 683.6907 306.432 646.9333 305.7493 A 32 32 0 0 1 648.128 241.7707 Z`;
  // const d = `M 518.4 149.2907 C 630.9973 68.5013 786.2827 79.8933 886.528 181.2907 C 940.3947 235.8187 970.6667 310.144 970.6667 387.6693 C 970.6667 465.1947 940.3733 539.52 886.5707 594.0053 L 592.1493 893.5253 A 110.976 110.976 0 0 1 511.936 928 A 110.72 110.72 0 0 1 432.0213 893.824 L 137.3227 593.7707 C 83.5627 539.2427 53.3333 464.9813 53.3333 387.5413 S 83.5627 235.8187 137.344 181.2693 C 239.3173 78.1227 398.336 68.1173 511.36 153.6427 L 511.9147 154.0693 Z`;
  // const d = `M 1129.1307 0 H 121.8316 A 109.6168 109.6168 0 0 0 12.1905 109.6411 V 219.2823 A 109.6168 109.6168 0 0 0 121.8316 328.9234 H 1129.1307 A 109.6168 109.6168 0 0 0 1238.7718 219.2823 V 109.6411 A 109.6168 109.6168 0 0 0 1129.1307 0 Z M 1156.5592 219.2823 C 1156.5592 234.3497 1144.2225 246.6865 1129.1307 246.6865 H 121.8316 A 27.5017 27.5017 0 0 1 94.4274 219.2823 V 109.6411 C 94.4274 94.5737 106.7642 82.237 121.8316 82.237 H 1129.1307 C 1144.2225 82.237 1156.5592 94.5737 1156.5592 109.6411 V 219.2823 Z M 1008.2499 512.5851 H 243.395 L 250.9288 430.3238 H 1000.7162 L 1008.2743 512.5608 Z M 260.2423 328.899 L 250.9288 430.3238 L 243.3707 512.5608 L 200.4846 976.4815 A 40.96 40.96 0 0 1 159.6465 1013.76 C 158.4274 1013.76 157.0621 1013.76 155.8187 1013.6137 A 41.0575 41.0575 0 0 1 118.6865 968.9234 L 177.8834 328.9234 H 260.2423 Z M 1095.9726 1013.6137 C 1094.7535 1013.76 1093.3638 1013.76 1092.1448 1013.76 C 1071.1771 1013.76 1053.2084 997.7173 1051.2823 976.4571 L 1008.2499 512.5608 L 1000.7162 430.3238 L 991.4027 328.899 H 1074.0541 L 1133.251 968.9234 A 41.2526 41.2526 0 0 1 1095.9726 1013.6137 Z`;
  const $input = new InputCore({
    // defaultValue: `<svg t="1725376930087" class="icon" viewBox="0 0 1043 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="1891" data-spm-anchor-id="a313x.collections_detail.0.i4.361a3a81f5lUb4" width="200" height="200"><path d="${d}" fill="#111111" p-id="1892" data-spm-anchor-id="a313x.collections_detail.0.i2.361a3a81f5lUb4" class=""></path></svg>`,
    defaultValue: ``,
  });

  const [layers, setLayers] = createSignal($$canvas.layers);
  const [preview, setPreview] = createSignal<{ content: string; text: string; width: string; height: string }[]>([]);

  onMount(() => {
    function draw() {
      const $$layer = $$canvas.layer;
      if (!$$layer) {
        return;
      }
      $$layer.clear();
      $$layer.emptyLogs();
      $$layer.resumeLog();
      const ctx = $$layer;
      if ($$canvas.debug) {
        const m = $$canvas.getMousePoint();
        ctx.setFillStyle("black");
        ctx.setFont("10px Arial");
        ctx.fillText(m.text, m.x, m.y);
      }
      // console.log("[PAGE]before render $$canvas.paths", $$canvas.paths);
      for (let i = 0; i < $$canvas.paths.length; i += 1) {
        const logs: string[] = [];
        function log(...args: string[]) {
          logs.push(...args);
        }
        const $$prev_path = $$canvas.paths[i - 1];
        const $$path = $$canvas.paths[i];
        const state = $$path.state;
        // console.log("before $$path.state.stroke.enabled", state.stroke.enabled);
        if (state.stroke.enabled) {
          // 绘制描边
          // const curves = $$path.buildOutline({ cap: "butt" });
          // ctx.save();
          // ctx.beginPath();
          // for (let i = 0; i < curves.outline.length; i += 1) {
          //   const curve = curves.outline[i];
          //   const [start, c1, c2, end] = curve.points;
          //   const next = curves.outline[i + 1];
          //   if (i === 0 && start) {
          //     ctx.moveTo(start.x, start.y);
          //   }
          //   (() => {
          //     if (curve._linear) {
          //       const last = curve.points[curve.points.length - 1];
          //       ctx.lineTo(last.x, last.y);
          //       return;
          //     }
          //     if (end) {
          //       ctx.bezierCurveTo(c1.x, c1.y, c2.x, c2.y, end.x, end.y);
          //       return;
          //     }
          //     ctx.quadraticCurveTo(c1.x, c1.y, c2.x, c2.y);
          //   })();
          // }
          // ctx.closePath();
          // ctx.fillStyle = $$path.state.stroke.color;
          // ctx.fill();
          // ctx.strokeStyle = state.stroke.color;
          // ctx.lineWidth = $$canvas.grid.unit * state.stroke.width;
          // ctx.lineCap = state.stroke.start_cap;
          // ctx.lineJoin = state.stroke.join;
          // ctx.stroke();
          // ctx.restore();
        }
        // 绘制路径
        const commands = $$path.buildCommands();
        ctx.save();
        for (let i = 0; i < commands.length; i += 1) {
          const prev = commands[i - 1];
          const command = commands[i];
          const next_command = commands[i + 1];
          // console.log("[PAGE]command", command.c);
          if (command.c === "M") {
            const [x, y] = command.a;
            // 这两个的顺序影响很大？？？？？如果开头是弧线，就不能使用 moveTo；其他情况都可以先 beginPath 再 moveTo
            ctx.beginPath();
            ctx.moveTo(x, y);
          }
          if (command.c === "A") {
            // console.log('A', command);
            const [c1x, c1y, radius, angle1, angle2, counterclockwise] = command.a;
            ctx.arc(c1x, c1y, radius, angle1, angle2, Boolean(counterclockwise));
            // if (command.end) {
            //   ctx.moveTo(command.end.x, command.end.y);
            // }
          }
          if (command.c === "C") {
            const [c1x, c1y, c2x, c2y, ex, ey] = command.a;
            ctx.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
            // if (command.p) {
            //   ctx.moveTo(command.p.x, command.p.y);
            // }
          }
          if (command.c === "Q") {
            const [c1x, c1y, ex, ey] = command.a;
            ctx.quadraticCurveTo(c1x, c1y, ex, ey);
          }
          if (command.c === "L") {
            const [x, y] = command.a;
            ctx.lineTo(x, y);
          }
          if (command.c === "Z") {
            ctx.closePath();
          }
        }
        ctx.setStrokeStyle("lightgrey");
        ctx.setLineWidth(1);
        ctx.stroke();
        if (state.fill.enabled && $$path.closed) {
          // if ($$path.prev) {
          //   const cur_size = $$path.size;
          //   const prev_size = $$path.prev.size;
          //   // console.log("----------------");
          //   // console.log("check need update composition opertion");
          //   // console.log(cur_size.x, cur_size.y, cur_size.x2, cur_size.y2);
          //   // console.log(prev_size.x, prev_size.y, prev_size.x2, prev_size.y2);
          //   if (
          //     cur_size.x > prev_size.x &&
          //     cur_size.y > prev_size.y &&
          //     cur_size.x2 < prev_size.x2 &&
          //     cur_size.y2 < prev_size.y2
          //   ) {
          //     log(`ctx.globalCompositeOperation = "destination-out";`);
          //     ctx.globalCompositeOperation = "destination-out";
          //   }
          // }
          if ($$path.composite === "destination-out") {
            ctx.setGlobalCompositeOperation($$path.composite);
          }
          ctx.setFillStyle(state.fill.color);
          ctx.fill();
          // if ($$path.composite === "destination-out") {
          //   ctx.globalCompositeOperation = "source-out";
          // }
        }
        if (state.stroke.enabled) {
          ctx.setStrokeStyle(state.stroke.color);
          ctx.setLineWidth($$canvas.grid.unit * state.stroke.width);
          ctx.setLineCap(state.stroke.start_cap);
          ctx.setLineJoin(state.stroke.join);
          ctx.stroke();
        }
        ctx.restore();
        $$layer.stopLog();
        // 绘制锚点
        if ($$canvas.state.cursor) {
          ctx.save();
          for (let i = 0; i < $$path.skeleton.length; i += 1) {
            const point = $$path.skeleton[i];
            // console.log("[PAGE]home/index", i, point.start ? "start" : "", point.from, point.to, point.virtual);
            (() => {
              if (point.hidden) {
                return;
              }
              ctx.beginPath();
              ctx.setLineWidth(0.5);
              ctx.setStrokeStyle("lightgrey");
              if (point.from) {
                $$layer.drawLine(point, point.from);
              }
              if (point.to && !point.virtual) {
                $$layer.drawLine(point, point.to);
              }
              ctx.setStrokeStyle("black");
              const radius = 3;
              $$layer.drawCircle(point.point, radius);
              if (point.from) {
                $$layer.drawDiamondAtLineEnd(point, point.from);
              }
              if (point.to && !point.virtual) {
                $$layer.drawDiamondAtLineEnd(point, point.to);
              }
            })();
          }
          ctx.restore();
        }
      }
    }

    $$canvas.onUpdate(() => {
      draw();
    });
    app.onKeyup(({ code }) => {
      if (code === "Backspace") {
        $$canvas.deleteCurPoint();
      }
    });
  });

  return (
    <>
      <div class="">
        <div
          class="__a relative w-screen h-screen"
          onAnimationEnd={(event) => {
            connect($$canvas, event.currentTarget);
          }}
        >
          <For each={layers()}>
            {(layer) => {
              return (
                <canvas
                  classList={{
                    "__a absolute inset-0 w-screen h-screen": true,
                    "pointer-events-none": layer.disabled,
                  }}
                  style={{ "z-index": layer.zIndex }}
                  onAnimationEnd={(event) => {
                    const $canvas = event.currentTarget as HTMLCanvasElement;
                    const ctx = $canvas.getContext("2d");
                    if (!ctx) {
                      return;
                    }
                    connectLayer(layer, $$canvas, $canvas, ctx);
                    // setTimeout(() => {
                    //   console.log(ctx);
                    // }, 3000);
                  }}
                />
              );
            }}
          </For>
        </div>
        <div class="absolute right-0 top-0" style={{ "z-index": 9999 }}>
          <div class="p-4">
            <div class="space-y-4">
              <For each={preview()}>
                {(svg) => {
                  return (
                    <div class="flex flex-col items-center justify-center p-2 border rounded-md">
                      <div style={{ width: svg.width, height: svg.height }} innerHTML={svg.content}></div>
                      <div class="mt-2 text-center">{svg.text}</div>
                    </div>
                  );
                }}
              </For>
            </div>
          </div>
        </div>
        <div class="absolute left-0 bottom-0 w-full" style={{ "z-index": 9999 }}>
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
                const content = $$canvas.buildSVG();
                if (!content) {
                  app.tip({
                    text: ["没有内容"],
                  });
                  return;
                }
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
                const result = $$canvas.preview();
                setPreview(result);
              }}
            >
              预览
            </div>
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                const content = $$canvas.buildWeappCode();
                if (!content) {
                  app.tip({
                    text: ["没有内容"],
                  });
                  return;
                }
                app.copy(content);
              }}
            >
              小程序代码
            </div>
            {/* <div
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
            </div> */}
            {/* <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.cancelCursor();
              }}
            >
              隐藏控制点
            </div> */}
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.log();
              }}
            >
              打印日志
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
