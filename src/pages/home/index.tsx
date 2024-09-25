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

export const HomeIndexPage: ViewComponent = (props) => {
  const { app } = props;

  const $upload = new InputCore({
    defaultValue: {} as File[],
    type: "file",
    async onChange(v) {
      const buffer = await v[0].arrayBuffer();
      const font = opentype.parse(buffer);
      const r = font.getPath("MakeIcon", 0, 0, 200);
      const { paths } = $$canvas.buildBezierPathsFromOpentype(r.commands);
      // $$canvas.appendObject(paths);
      preview();
    },
  });
  const $$canvas = Canvas({});
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
      // $$canvas.appendObject(paths, { transform: true, dimensions });
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
  const [layers, setLayers] = createSignal($$canvas.layerList);
  const [icons, setIcons] = createSignal<{ content: string; text: string; width: string; height: string }[]>([]);
  const [code, setCode] = createSignal("");

  function preview() {
    const result = $$canvas.buildPreviewIcons();
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
    const $graph_layer = $$canvas.layer;
    const $pen_layer = $$canvas.layers.path;
    if (!$graph_layer) {
      return;
    }
    $graph_layer.clear();
    $pen_layer.clear();
    $graph_layer.emptyLogs();
    // $$layer.resumeLog();
    // if ($$canvas.debug) {
    //   const m = $$canvas.getMousePoint();
    //   $$layer.setFillStyle("black");
    //   $$layer.setFont("10px Arial");
    //   $$layer.fillText(m.text, m.x, m.y);
    // }
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
      console.log("[PAGE]home/index render $$canvas.paths");
      for (let j = 0; j < $$path.paths.length; j += 1) {
        const $sub_path = $$path.paths[j];
        const commands = $sub_path.buildCommands();
        $graph_layer.save();
        for (let i = 0; i < commands.length; i += 1) {
          const prev = commands[i - 1];
          const command = commands[i];
          const next_command = commands[i + 1];
          // console.log("[PAGE]command", command.c, command.a);
          if (command.c === "M") {
            const [x, y] = command.a;
            // 这两个的顺序影响很大？？？？？如果开头是弧线，就不能使用 moveTo；其他情况都可以先 beginPath 再 moveTo
            $graph_layer.beginPath();
            $graph_layer.moveTo(x, y);
            $pen_layer.beginPath();
            $pen_layer.moveTo(x, y);
          }
          if (command.c === "A") {
            // console.log('A', command);
            const [c1x, c1y, radius, angle1, angle2, counterclockwise] = command.a;
            $graph_layer.arc(c1x, c1y, radius, angle1, angle2, Boolean(counterclockwise));
            $pen_layer.arc(c1x, c1y, radius, angle1, angle2, Boolean(counterclockwise));
            // if (command.end) {
            //   ctx.moveTo(command.end.x, command.end.y);
            // }
          }
          if (command.c === "C") {
            const [c1x, c1y, c2x, c2y, ex, ey] = command.a;
            $graph_layer.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
            $pen_layer.bezierCurveTo(c1x, c1y, c2x, c2y, ex, ey);
            // if (command.p) {
            //   ctx.moveTo(command.p.x, command.p.y);
            // }
          }
          if (command.c === "Q") {
            const [c1x, c1y, ex, ey] = command.a;
            $graph_layer.quadraticCurveTo(c1x, c1y, ex, ey);
            $pen_layer.quadraticCurveTo(c1x, c1y, ex, ey);
          }
          if (command.c === "L") {
            const [x, y] = command.a;
            $graph_layer.lineTo(x, y);
            $pen_layer.lineTo(x, y);
          }
          if (command.c === "Z") {
            $graph_layer.closePath();
            $pen_layer.closePath();
          }
        }
        $pen_layer.setStrokeStyle("lightgrey");
        $pen_layer.setLineWidth(1);
        $pen_layer.stroke();
        if (state.fill.enabled && $sub_path.closed) {
          if ($sub_path.composite === "destination-out") {
            $graph_layer.setGlobalCompositeOperation($sub_path.composite);
          }
          $graph_layer.setFillStyle(state.fill.color);
          $graph_layer.fill();
        }
        if (state.stroke.enabled) {
          $graph_layer.setStrokeStyle(state.stroke.color);
          $graph_layer.setLineWidth($$canvas.grid.unit * state.stroke.width);
          $graph_layer.setLineCap(state.stroke.start_cap);
          $graph_layer.setLineJoin(state.stroke.join);
          $graph_layer.stroke();
        }
        $graph_layer.restore();
        $graph_layer.stopLog();
        // 绘制锚点
        if ($$canvas.isMode("path_editing")) {
          if ($$canvas.state.cursor) {
            // const $layer = $$canvas.layers[1];
            $pen_layer.save();
            for (let k = 0; k < $sub_path.skeleton.length; k += 1) {
              const point = $sub_path.skeleton[k];
              // console.log("[PAGE]home/index", i, point.start ? "start" : "", point.from, point.to, point.virtual);
              (() => {
                if (point.hidden) {
                  return;
                }
                $pen_layer.beginPath();
                $pen_layer.setLineWidth(0.5);
                $pen_layer.setStrokeStyle("lightgrey");
                if (point.from) {
                  $pen_layer.drawLine(point, point.from);
                }
                if (point.to && !point.virtual) {
                  $pen_layer.drawLine(point, point.to);
                }
                $pen_layer.setStrokeStyle("black");
                const radius = 3;
                $pen_layer.drawCircle(point.point, radius);
                if (point.from) {
                  $pen_layer.drawDiamondAtLineEnd(point, point.from);
                }
                if (point.to && !point.virtual) {
                  $pen_layer.drawDiamondAtLineEnd(point, point.to);
                }
              })();
            }
            $pen_layer.restore();
          }
        }
      }
      if ($$path.selected) {
        const box = $$path.box;
        $pen_layer.drawRect(box);
      }
    }
  }

  $$canvas.onRefresh(() => {
    draw();
  });
  $$canvas.$selection.onChange((state) => {
    const $layer = $$canvas.layers.range;
    console.log("[PAGE]before drawRect", state);
    $layer.clear();
    $layer.drawRect(state);
  });
  $$canvas.onChange((v) => setState(v));
  // app.onKeyup(({ code }) => {
  //   if (code === "Backspace") {
  //     $$canvas.deleteCurPoint();
  //   }
  // });

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
                $$canvas.selectEditingSelect();
              }}
            >
              选择
            </div>
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.selectEditingPen();
              }}
            >
              钢笔
            </div>
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.selectDefaultSelect();
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
