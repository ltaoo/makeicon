/**
 * @file 首页
 * @todo 支持 垫底图 来描图标，手动对一些使用弧线的图标进行转化
 */
import { createSignal, For, onMount } from "solid-js";
import { Copy } from "lucide-solid";
import opentype from "opentype.js";

import { ViewComponent } from "@/store/types";
import { Dialog, Input, Textarea } from "@/components/ui";
import { DialogCore, InputCore } from "@/domains/ui";
import { connect, connectLayer } from "@/biz/canvas/connect.web";
import { Canvas } from "@/biz/canvas";
import { Line } from "@/biz/line";

export const HomeIndexPage: ViewComponent = (props) => {
  const { app } = props;

  const $upload = new InputCore({
    defaultValue: {} as File[],
    type: "file",
    async onChange(v) {
      const buffer = await v[0].arrayBuffer();
      const font = opentype.parse(buffer);
      const r = font.getPath("趣字幕", 0, 0, 200);
      let str = "";
      const tokens = r.commands.map((p) => {
        const { type, x, y, x1, y1, x2, y2 } = p as {
          type: string;
          x?: string;
          y?: string;
          x1?: string;
          y1?: string;
          x2?: string;
          y2?: string;
        };
        if (type === "Q" && x && y && x1 && y1) {
          str += `Q${x1} ${y1} ${x} ${y}`;
          return [type, x1, y1, x, y];
        }
        if (type === "C" && x && y && x1 && y1 && x2 && y2) {
          str += `C${x1} ${y1} ${x2} ${y2} ${x} ${y}`;
          return [type, x1, y1, x2, y2, x, y];
        }
        if (type === "Z") {
          str += `Z`;
          return [type];
        }
        if (type === "M" && x && y) {
          str += `M${x} ${y}`;
          return [type, x, y];
        }
        if (type === "L" && x && y) {
          str += `L${x} ${y}`;
          return [type, x, y];
        }
        return [];
      });
      // console.log(str);
      const path = Line({
        fill: {
          color: "#000",
        },
        stroke: null,
      });
      $$canvas.buildPath(path, tokens, { exp: false, scale: 1 });
      $$canvas.setPaths([path]);
      preview();
    },
  });
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
      preview();
      $dialog.hide();
    },
  });
  const $codeDialog = new DialogCore({
    footer: false,
    onCancel() {
      setCode("");
    },
  });
  const $input = new InputCore({
    defaultValue: ``,
  });

  const [state, setState] = createSignal($$canvas.state);
  const [layers, setLayers] = createSignal($$canvas.layers);
  const [icons, setIcons] = createSignal<{ content: string; text: string; width: string; height: string }[]>([]);
  const [code, setCode] = createSignal("");

  function preview() {
    const result = $$canvas.preview();
    if (result.length === 0) {
      app.tip({
        text: ["没有内容"],
      });
      return;
    }
    setIcons(result);
  }
  function draw() {
    // console.log("[PAGE]index/index - draw", $$canvas.paths.length);
    const $$layer = $$canvas.layer;
    const $layer = $$canvas.layers[1];
    if (!$$layer) {
      return;
    }
    $$layer.clear();
    $layer.clear();
    $$layer.emptyLogs();
    // $$layer.resumeLog();
    if ($$canvas.debug) {
      const m = $$canvas.getMousePoint();
      $$layer.setFillStyle("black");
      $$layer.setFont("10px Arial");
      $$layer.fillText(m.text, m.x, m.y);
    }
    // console.log("[PAGE]before render $$canvas.paths", $$canvas.paths);
    for (let i = 0; i < $$canvas.paths.length; i += 1) {
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
      console.log("[PAGE]home/index render $$canvas.paths", $$canvas.state.mode);
      for (let j = 0; j < $$path.paths.length; j += 1) {
        const $sub_path = $$path.paths[j];
        const commands = $sub_path.buildCommands();
        $$layer.save();
        for (let i = 0; i < commands.length; i += 1) {
          const prev = commands[i - 1];
          const command = commands[i];
          const next_command = commands[i + 1];
          // console.log("[PAGE]command", command.c, command.a);
          if (command.c === "M") {
            const [x, y] = command.a;
            // 这两个的顺序影响很大？？？？？如果开头是弧线，就不能使用 moveTo；其他情况都可以先 beginPath 再 moveTo
            $$layer.beginPath();
            $$layer.moveTo(x, y);
            $layer.beginPath();
            $layer.moveTo(x, y);
          }
          if (command.c === "A") {
            // console.log('A', command);
            const [c1x, c1y, radius, angle1, angle2, counterclockwise] = command.a;
            $$layer.arc(c1x, c1y, radius, angle1, angle2, Boolean(counterclockwise));
            $layer.arc(c1x, c1y, radius, angle1, angle2, Boolean(counterclockwise));
            // if (command.end) {
            //   ctx.moveTo(command.end.x, command.end.y);
            // }
          }
          if (command.c === "C") {
            const [c1x, c1y, c2x, c2y, ex, ey] = command.a;
            $$layer.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
            $layer.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
            // if (command.p) {
            //   ctx.moveTo(command.p.x, command.p.y);
            // }
          }
          if (command.c === "Q") {
            const [c1x, c1y, ex, ey] = command.a;
            $$layer.quadraticCurveTo(c1x, c1y, ex, ey);
            $layer.quadraticCurveTo(c1x, c1y, ex, ey);
          }
          if (command.c === "L") {
            const [x, y] = command.a;
            $$layer.lineTo(x, y);
            $layer.lineTo(x, y);
          }
          if (command.c === "Z") {
            $$layer.closePath();
            $layer.closePath();
          }
        }
        $layer.setStrokeStyle("lightgrey");
        $layer.setLineWidth(1);
        $layer.stroke();
        if (state.fill.enabled && $sub_path.closed) {
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
          if ($sub_path.composite === "destination-out") {
            $$layer.setGlobalCompositeOperation($sub_path.composite);
          }
          $$layer.setFillStyle(state.fill.color);
          $$layer.fill();
          // if ($$path.composite === "destination-out") {
          //   ctx.globalCompositeOperation = "source-out";
          // }
        }
        if (state.stroke.enabled) {
          $$layer.setStrokeStyle(state.stroke.color);
          $$layer.setLineWidth($$canvas.grid.unit * state.stroke.width);
          $$layer.setLineCap(state.stroke.start_cap);
          $$layer.setLineJoin(state.stroke.join);
          $$layer.stroke();
        }
        $$layer.restore();
        $$layer.stopLog();
        // 绘制锚点
        if ($$canvas.state.mode === 2 || $$canvas.state.mode === 3) {
          if ($$canvas.state.cursor) {
            // const $layer = $$canvas.layers[1];
            $layer.save();
            for (let k = 0; k < $sub_path.skeleton.length; k += 1) {
              const point = $sub_path.skeleton[k];
              // console.log("[PAGE]home/index", i, point.start ? "start" : "", point.from, point.to, point.virtual);
              (() => {
                if (point.hidden) {
                  return;
                }
                $layer.beginPath();
                $layer.setLineWidth(0.5);
                $layer.setStrokeStyle("lightgrey");
                if (point.from) {
                  $layer.drawLine(point, point.from);
                }
                if (point.to && !point.virtual) {
                  $layer.drawLine(point, point.to);
                }
                $layer.setStrokeStyle("black");
                const radius = 3;
                $layer.drawCircle(point.point, radius);
                if (point.from) {
                  $layer.drawDiamondAtLineEnd(point, point.from);
                }
                if (point.to && !point.virtual) {
                  $layer.drawDiamondAtLineEnd(point, point.to);
                }
              })();
            }
            $layer.restore();
          }
        }
      }
      if ($$path.selected) {
        const box = $$path.box;
        $layer.drawRect(box);
      }
    }
  }

  $$canvas.onUpdate(() => {
    draw();
  });
  $$canvas.onChange((v) => setState(v));
  app.onKeyup(({ code }) => {
    if (code === "Backspace") {
      $$canvas.deleteCurPoint();
    }
  });

  return (
    <>
      <div class="">
        <div
          classList={{
            "__a relative w-screen h-screen": true,
            "cursor-select": state().cursor === "select",
            "cursor-pen-edit": state().cursor === "pen",
          }}
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
              <For each={icons()}>
                {(svg) => {
                  return (
                    <div class="flex flex-col items-center justify-center p-2 border rounded-md">
                      <div
                        style={{ width: svg.width, height: svg.height, "background-color": "#f2f2f2" }}
                        innerHTML={svg.content}
                      ></div>
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
                $$canvas.selectObject();
              }}
            >
              完成
            </div>
            {/* <div
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
            </div> */}
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
                preview();
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
                setCode(content);
                $codeDialog.show();
                // app.copy(content);
              }}
            >
              小程序代码
            </div>
            <div>
              <Input store={$upload} />
            </div>
            {/* <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.update();
              }}
            >
              刷新
            </div> */}
            {/* <div
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
            {/* <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.log();
              }}
            >
              打印日志
            </div> */}
          </div>
        </div>
      </div>
      <Dialog store={$dialog}>
        <div class="w-[520px]">
          <Textarea store={$input} />
        </div>
      </Dialog>
      <Dialog store={$codeDialog}>
        <div class="w-[520px]">
          <div class="max-h-[480px] overflow-y-auto whitespace-wrap">
            <pre>{code()}</pre>
          </div>
          <div class="mt-4">
            <Copy
              class="w-6 h-6 cursor-pointer"
              onClick={() => {
                app.copy(code());
                app.tip({
                  text: ["复制成功"],
                });
              }}
            />
          </div>
        </div>
      </Dialog>
    </>
  );
};
