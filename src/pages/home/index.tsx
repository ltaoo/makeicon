/**
 * @file 首页
 * @todo 支持 垫底图 来描图标，手动对一些使用弧线的图标进行转化
 */
import { createSignal, For, onMount, Show } from "solid-js";
import { Copy, Image, PiIcon, Plus, Sofa, SofaIcon, Text, TvIcon } from "lucide-solid";
import opentype from "opentype.js";
import { optimize } from "svgo";
import { saveAs } from "file-saver";

import { ViewComponent, ViewComponentProps } from "@/store/types";
import { Button, Dialog, Input, Textarea } from "@/components/ui";
import { ButtonCore, DialogCore, InputCore } from "@/domains/ui";
import { connect, connectLayer } from "@/biz/canvas/connect.web";
import { Canvas } from "@/biz/canvas";
import { ColorInput } from "@/components/ColorInput";
import { ColorInputCore } from "@/biz/color_input";
import { base, Handler } from "@/domains/base";
import { blobToArrayBuffer, loadImage, readFileAsArrayBuffer } from "@/utils/browser";
import { DragZoneCore } from "@/domains/ui/drag-zone";
import { DropArea } from "@/components/ui/drop-zone";
import { FileThumb } from "@/components/FileThumb";
import { ExampleIconSets } from "@/constants/index";

function HomeIndexPageCore(props: ViewComponentProps) {
  const { app } = props;

  let _icons: ReturnType<typeof $$canvas.buildPreviewIcons> = [];
  let _code = "";
  let _tool = "icon";
  let _font: opentype.Font | null = null;

  function preview() {
    const result = $$canvas.buildPreviewIcons();
    if (result.length === 0) {
      return;
    }
    _icons = result;
    bus.emit(Events.Change, { ...state });
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
    $$canvas.draw();
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
      $$canvas.draw();
      preview();
    },
  });
  const $stroke = ColorInputCore({
    onChange(values) {
      console.log("[PAGE]home/index - handle $stroke change", values, $$canvas.object);
      if (!$$canvas.object) {
        return;
      }
      $$canvas.object.setStroke(values);
      $$canvas.draw();
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
      $$canvas.draw();
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
    $$canvas.draw();
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
    scale() {
      if (!$$canvas.object) {
        return;
      }
      $$canvas.object.scale(0.5, { directly: true });
    },
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
          if ($$canvas.mounted) {
            return;
          }
          const $rect = event.currentTarget;
          // console.log("[PAGE]home/index connect canvas");
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
                  "pointer-events-none": layer.layer.disabled,
                }}
                style={{ "z-index": layer.layer.zIndex }}
                data-name={layer.name}
                onAnimationEnd={(event) => {
                  const $canvas = event.currentTarget as HTMLCanvasElement;
                  const ctx = $canvas.getContext("2d");
                  if (!ctx) {
                    return;
                  }
                  // console.log("[PAGE]home/index connect layer", layer.name);
                  connectLayer(layer.layer, $$canvas, $canvas, ctx);
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
            <div>编辑</div>
            <div class="mt-4">
              <div
                onClick={() => {
                  $page.scale();
                }}
              >
                缩放
              </div>
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
                      <div style={{ width: svg.width, height: svg.height }} innerHTML={svg.content}></div>
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
