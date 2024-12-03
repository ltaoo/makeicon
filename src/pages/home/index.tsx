/**
 * @file 首页
 * @todo 支持 垫底图 来描图标，手动对一些使用弧线的图标进行转化
 */
import { createSignal, For, onMount, Show } from "solid-js";
import { Copy, Image, PiIcon, Plus, Sofa, SofaIcon, Text, TvIcon } from "lucide-solid";
import opentype from "opentype.js";
import { optimize } from "svgo";
import { saveAs } from "file-saver";
import { Icon, disableCache, getIcon, listIcons } from "@iconify-icon/solid";
import calendarIcon from "@iconify-icons/line-md/calendar";
import accountIcon from "@iconify-icons/line-md/account";
import alertIcon from "@iconify-icons/line-md/alert";

import { ViewComponent, ViewComponentProps } from "@/store/types";
import { Button, Dialog, Input, Textarea } from "@/components/ui";
import { ButtonCore, DialogCore, InputCore } from "@/domains/ui";
import { connect, connectLayer } from "@/biz/canvas/connect.web";
import { Canvas } from "@/biz/canvas";
import { ColorInput } from "@/components/ColorInput";
import { Result } from "@/domains/result";
import { ColorInputCore } from "@/biz/color_input";
import { base, Handler } from "@/domains/base";
import { blobToArrayBuffer, loadImage, readFileAsArrayBuffer } from "@/utils/browser";
import { DragZoneCore } from "@/domains/ui/drag-zone";
import { DropArea } from "@/components/ui/drop-zone";
import { FileThumb } from "@/components/FileThumb";
import { ExampleIconSets } from "@/constants";

function HomeIndexPageCore(props: ViewComponentProps) {
  const { app } = props;

  let _icons: ReturnType<typeof $$canvas.buildPreviewIcons> = [];
  let _code = "";
  let _tool = "icon";
  let _font: opentype.Font | null = null;

  function preview() {
    const result = $$canvas.buildPreviewIcons();
    if (result.length === 0) {
      app.tip({
        text: ["没有内容"],
      });
      return;
    }
    _icons = result;
    bus.emit(Events.Change, { ...state });
  }

  function draw() {
    // console.log("[PAGE]index/index - draw", $$canvas.paths.length);
    const $graph_layer = $$canvas.layer;
    const $pen_layer = $$canvas.layers.path;
    $graph_layer.clear();
    $pen_layer.clear();
    $graph_layer.emptyLogs();
    // console.log("[PAGE]before render $$canvas.paths", $$canvas.paths);
    for (let i = 0; i < $$canvas.paths.length; i += 1) {
      (() => {
        const $$prev_path = $$canvas.paths[i - 1];
        const $$path = $$canvas.paths[i];
        const state = $$path.state;
        // console.log("before $$path.state.stroke.enabled", state.stroke.enabled);
        // console.log("[PAGE]home/index render $$canvas.paths", $$path.paths);
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
              // console.log("A 弧线", c1x, c1y, radius, angle1, angle2, counterclockwise);
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
          if (state.fill.enabled && $sub_path.closed) {
            if ($sub_path.composite === "destination-out") {
              $graph_layer.setGlobalCompositeOperation($sub_path.composite);
            }
            $graph_layer.setFillStyle(state.fill.color);
            if (state.fill.color.match(/url\(([^)]{1,})\)/)) {
              const [_, id] = state.fill.color.match(/url\(#([^)]{1,})\)/)!;
              const payload = $$canvas.getGradient(id);
              if (payload) {
                const gradient = $graph_layer.getGradient(payload) as CanvasGradient;
                $graph_layer.setFillStyle(gradient);
              }
            }
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
          if ($$path.editing) {
            if ($$canvas.state.cursor) {
              // const $layer = $$canvas.layers[1];
              $pen_layer.save();
              $pen_layer.setStrokeStyle("lightgrey");
              $pen_layer.setLineWidth(1);
              $pen_layer.stroke();
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
          const edges = $$path.buildEdgesOfBox();
          for (let i = 0; i < edges.length; i += 1) {
            const edge = edges[i];
            $pen_layer.drawRect(edge, { background: "#ffffff" });
          }
        }
      })();
    }
  }
  function loadSVGContent(content: string) {
    const result = $$canvas.buildBezierPathsFromPathString(content);
    if (result === null) {
      app.tip({
        text: ["不是合法的 SVG 内容"],
      });
      return;
    }
    const { dimensions, gradients, paths } = result;
    $$canvas.saveGradients(gradients);
    $$canvas.appendObjects(paths, { transform: true, dimensions });
    draw();
    preview();
  }
  async function handleFile(file: File) {
    const filename = file.name;
    const r = await readFileAsArrayBuffer(file);
    if (r.error) {
      app.tip({
        text: [r.error.message],
      });
      return;
    }
    if (filename.match(/\.svg$/)) {
      const decoder = new TextDecoder("utf-8");
      const content = decoder.decode(r.data);
      const result = optimize(content, {
        multipass: false,
        plugins: [
          "removeXMLProcInst",
          "removeDoctype",
          "removeXMLNS",
          "removeXlink",
          "removeComments",
          "removeDimensions",
        ],
      });
      $input.setValue(result.data);
      bus.emit(Events.Change, { ...state });
      return;
    }
    app.tip({
      text: ["不支持的文件格式"],
    });
  }
  const $upload = new InputCore({
    defaultValue: {} as File[],
    type: "file",
    async onChange(v) {
      const buffer = await v[0].arrayBuffer();
      const font = opentype.parse(buffer);
      const r = font.getPath("MakeIcon", 0, 0, 200);
      const { paths } = $$canvas.buildBezierPathsFromOpentype(r.commands);
      $$canvas.appendObjects(paths);
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
      loadSVGContent(content);
      $dialog.hide();
    },
  });
  const $codeDialog = new DialogCore({
    footer: false,
    onCancel() {
      _code = "";
      bus.emit(Events.Change, { ...state });
    },
  });
  const $input = new InputCore({
    defaultValue: ``,
  });
  const $fill = ColorInputCore({
    onChange(values) {
      if (!$$canvas.object) {
        return;
      }
      $$canvas.object.setFill(values);
      draw();
    },
  });
  const $stroke = ColorInputCore({
    onChange(values) {
      console.log("[PAGE]home/index - handle $stroke change", values, $$canvas.object);
      if (!$$canvas.object) {
        return;
      }
      $$canvas.object.setStroke(values);
      draw();
    },
  });
  const $drop = new DragZoneCore();
  const $svg = new InputCore({
    defaultValue: "",
  });
  const $downloadSVG = new ButtonCore({
    onClick() {
      const svg = $$canvas.buildSVG();
      if (svg === null) {
        app.tip({
          text: ["创建 SVG 失败"],
        });
        return;
      }
      console.log(svg);
      const blob = new Blob([svg], { type: "image/svg+xml" });
      saveAs(blob, "icon.svg");
    },
  });
  const $downloadPNG = new ButtonCore({
    async onClick() {
      const $graph = $$canvas.layers.graph;
      const $background = $$canvas.layers.background;
      const $canvas = document.createElement("canvas");
      $canvas.width = $$canvas.grid.width;
      $canvas.height = $$canvas.grid.height;
      const ctx = $canvas.getContext("2d")!;
      ctx.drawImage(
        $background.getCanvas() as HTMLCanvasElement,
        $$canvas.grid.x,
        $$canvas.grid.y,
        $$canvas.grid.width,
        $$canvas.grid.height,
        0,
        0,
        $canvas.width,
        $canvas.height
      );
      ctx.drawImage(
        $graph.getCanvas() as HTMLCanvasElement,
        $$canvas.grid.x,
        $$canvas.grid.y,
        $$canvas.grid.width,
        $$canvas.grid.height,
        0,
        0,
        $canvas.width,
        $canvas.height
      );
      $canvas.toBlob((blob) => {
        saveAs(blob as Blob, "icon.png");
      });
    },
  });
  const $textInput = new InputCore({
    defaultValue: "",
    onEnter() {
      $textSubmit.click();
    },
  });
  const $textSubmit = new ButtonCore({
    onClick() {
      const value = $textInput.value;
      if (!value) {
        app.tip({
          text: ["请先输入文字"],
        });
        return;
      }
      if (!_font) {
        app.tip({
          text: ["请先上传字体文件"],
        });
        return;
      }
      const fontSize = 200;
      const x = 0;
      const y = fontSize;
      const path = _font.getPath(value, x, y, fontSize);
      const { paths } = $$canvas.buildBezierPathsFromOpentype(path.commands);
      $$canvas.appendObjects(paths);
      draw();
      preview();
    },
  });
  const $textUpload = new DragZoneCore();

  $$canvas.$selection.onChange((state) => {
    const $layer = $$canvas.layers.range;
    $layer.clear();
    $layer.drawRect(state);
  });
  $$canvas.onSelect((line) => {
    $stroke.setValue(line.stroke);
    $fill.setValue(line.fill);
  });
  $$canvas.onRefresh(() => {
    draw();
    preview();
  });
  $drop.onChange(async (files) => {
    const file = files[0];
    handleFile(file);
  });
  $textUpload.onChange(async (files) => {
    const buffer = await files[0].arrayBuffer();
    const font = opentype.parse(buffer);
    _font = font;
  });
  app.onKeyup(({ code }) => {
    if (code === "Backspace") {
      $$canvas.handleKeyupBackspace();
    }
    if (code === "KeyC" && app.keyboard["ControlLeft"]) {
      $$canvas.tagCurObjectAsCopy();
    }
    if (code === "ControlLeft" && app.keyboard["KeyC"]) {
      $$canvas.tagCurObjectAsCopy();
    }
    if (code === "KeyV" && app.keyboard["ControlLeft"]) {
    }
    if (code === "ControlLeft" && app.keyboard["KeyV"]) {
    }
  });
  const state = {
    get icons() {
      return _icons;
    },
    get code() {
      return _code;
    },
    get tool() {
      return _tool;
    },
  };

  enum Events {
    Change,
  }
  type TheTypesOfEvents = {
    [Events.Change]: typeof state;
  };
  const bus = base<TheTypesOfEvents>();

  return {
    state,
    ui: {
      $$canvas,
      $input,
      $drop,
      $fill,
      $stroke,
      $dialog,
      $codeDialog,
      $upload,
      $svg,
      $downloadSVG,
      $downloadPNG,
      $textInput,
      $textSubmit,
      $textUpload,
    },
    ready() {
      preview();
    },
    selectTool(t: string) {
      if (_tool === t) {
        return;
      }
      _tool = t;
      bus.emit(Events.Change, { ...state });
    },
    loadSVGContent,
    onChange(handler: Handler<TheTypesOfEvents[Events.Change]>) {
      return bus.on(Events.Change, handler);
    },
  };
}

export const HomeIndexPage: ViewComponent = (props) => {
  const { app } = props;

  const $page = HomeIndexPageCore(props);
  const $$canvas = $page.ui.$$canvas;

  const [state, setState] = createSignal($$canvas.state);
  const [page, setPage] = createSignal($page.state);
  const [layers, setLayers] = createSignal($$canvas.layerList);

  // Disable cache
  disableCache("all");

  $$canvas.onChange((v) => setState(v));
  $page.onChange((v) => setPage(v));

  const cursorClassName = () => `cursor__${state().cursor}`;

  onMount(() => {
    $page.ready();
  });

  return (
    <>
      <div
        classList={{
          "__a relative w-full h-full bg-[#f8f9fa]": true,
          [cursorClassName()]: true,
        }}
        onAnimationEnd={(event) => {
          const $rect = event.currentTarget;
          connect($$canvas, $rect);
          $$canvas.setSize({
            width: $rect.clientWidth,
            height: $rect.clientHeight,
          });
        }}
      >
        <For each={layers()}>
          {(layer) => {
            return (
              <canvas
                classList={{
                  "__a absolute inset-0 w-full h-full": true,
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
                }}
              />
            );
          }}
        </For>
      </div>
      <div class="fixed left-[24px] top-[128px]" style={{ "z-index": 9999 }}>
        <div class="p-4 space-y-8">
          <div
            class="flex flex-col items-center justify-center p-2 rounded-md cursor-pointer hover:shadow-xl"
            onClick={() => {
              $page.selectTool("icon");
            }}
          >
            <div class="">
              <PiIcon />
            </div>
            <div class="mt-2 text-sm">图标</div>
          </div>
          <div
            class="flex flex-col items-center justify-center p-2 rounded-md cursor-pointer hover:shadow-xl"
            onClick={() => {
              $page.selectTool("text");
            }}
          >
            <div class="">
              <Text />
            </div>
            <div class="mt-2 text-sm">文字</div>
          </div>
          <div
            class="flex flex-col items-center justify-center p-2 rounded-md cursor-pointer hover:shadow-xl"
            onClick={() => {
              $page.selectTool("background");
            }}
          >
            <div class="">
              <Image />
            </div>
            <div class="mt-2 text-sm">背景</div>
          </div>
        </div>
      </div>
      <Show when={page().tool === "icon"}>
        <div
          class="panel__icon fixed left-[128px] top-[24px] bottom-[24px] overflow-y-auto"
          style={{ "z-index": 9999 }}
        >
          <div class="h-full p-4 w-[360px] bg-white border rounded-md">
            <section class="grid grid-cols-6 text-gray-600">
              <For each={ExampleIconSets}>
                {(icon) => {
                  return (
                    <div
                      class="p-2 cursor-pointer"
                      innerHTML={icon.svg}
                      title={icon.name}
                      onClick={() => {
                        $page.loadSVGContent(icon.svg);
                      }}
                    ></div>
                  );
                }}
              </For>
            </section>
          </div>
        </div>
      </Show>
      <Show when={page().tool === "text"}>
        <div
          class="panel__text fixed left-[128px] top-[24px] bottom-[24px] overflow-y-auto"
          style={{ "z-index": 9999 }}
        >
          <div class="h-full p-4 w-[360px] bg-white border rounded-md">
            <div>
              <div class="relative w-full h-[240px]">
                <DropArea store={$page.ui.$textUpload}>
                  <FileThumb filename="tetttt" />
                </DropArea>
              </div>
              <div class="flex items-center mt-8 space-x-2">
                <Input store={$page.ui.$textInput} />
                <Button store={$page.ui.$textSubmit}>插入画布</Button>
              </div>
            </div>
          </div>
        </div>
      </Show>
      <Show when={page().tool === "background"}>
        <div
          class="panel__background fixed left-[128px] top-[24px] bottom-[24px] overflow-y-auto"
          style={{ "z-index": 9999 }}
        >
          <div class="h-full p-4 w-[360px] bg-white border rounded-md"></div>
        </div>
      </Show>
      <div class="fixed right-[48px] top-[24px] bottom-[24px] overflow-y-auto" style={{ "z-index": 9999 }}>
        <div class="h-full border rounded-xl rounded-xl bg-white">
          <div>
            <div class="flex justify-between mt-4 px-4">
              <div>填充</div>
              <div class="p-2 rounded-sm cursor-pointer hover:bg-gray-200">
                <Plus class="w-4 h-4" />
              </div>
            </div>
            <div class="px-4">
              <ColorInput store={$page.ui.$fill} />
            </div>
          </div>
          <div class="w-full h-[1px] my-4 bg-gray-200"></div>
          <div>
            <div class="flex justify-between px-4">
              <div>描边</div>
              <div class="p-2 rounded-sm cursor-pointer hover:bg-gray-200">
                <Plus class="w-4 h-4" />
              </div>
            </div>
            <div class="px-4">
              <ColorInput store={$page.ui.$stroke} />
            </div>
          </div>
          <div class="w-full h-[1px] my-4 bg-gray-200"></div>
          <div class="px-4">
            <div>预览</div>
            <div class="flex space-x-4 mt-4">
              <For each={page().icons}>
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
          <div class="w-full h-[1px] my-4 bg-gray-200"></div>
          <div class="px-4">
            <div class="mt-2 space-x-2">
              <Button store={$page.ui.$downloadSVG}>下载SVG</Button>
              <Button store={$page.ui.$downloadPNG}>下载PNG</Button>
            </div>
          </div>
        </div>
      </div>
      <div class="absolute left-1/2 top-0 -translate-x-1/2" style={{ "z-index": 9999 }}>
        <div class="flex items-center p-4 space-x-2 rounded-md bg-white">
          <Show
            when={["path_editing.select", "path_editing.pen"].includes(state().mode)}
            fallback={
              <>
                <div
                  class="inline-block px-4 border text-sm bg-white cursor-pointer"
                  onClick={() => {
                    $$canvas.selectDefaultSelect();
                  }}
                >
                  选择
                </div>
                <div
                  class="inline-block px-4 border text-sm bg-white cursor-pointer"
                  onClick={() => {
                    $$canvas.selectDefaultPen();
                  }}
                >
                  钢笔
                </div>
              </>
            }
          >
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.selectPathEditingSelect();
              }}
            >
              选择
            </div>
            <div
              class="inline-block px-4 border text-sm bg-white cursor-pointer"
              onClick={() => {
                $$canvas.selectPathEditingPen();
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
          </Show>
          <div
            class="inline-block px-4 border text-sm bg-white cursor-pointer"
            onClick={() => {
              $page.ui.$dialog.show();
            }}
          >
            导入SVG
          </div>
        </div>
      </div>
      <div class="absolute left-1/2 bottom-0 -translate-x-1/2" style={{ "z-index": 9999 }}>
        <div class="p-4"></div>
      </div>
      <Dialog store={$page.ui.$dialog}>
        <div class="w-[520px]">
          <Textarea store={$page.ui.$input} />
          <div class="relative mt-4">
            <div class="w-full h-[120px]">
              <DropArea store={$page.ui.$drop}></DropArea>
            </div>
          </div>
        </div>
      </Dialog>
      <Dialog store={$page.ui.$codeDialog}>
        <div class="w-[520px]">
          <div class="max-h-[480px] overflow-y-auto whitespace-wrap">
            <pre>{page().code}</pre>
          </div>
          <div class="mt-4">
            <Copy
              class="w-6 h-6 cursor-pointer"
              onClick={() => {
                app.copy(page().code);
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
