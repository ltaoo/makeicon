import { createSignal, JSX, Show } from "solid-js";

import { DragZoneCore } from "@/domains/ui/drag-zone";

export function DropArea(props: { store: DragZoneCore } & JSX.HTMLAttributes<HTMLDivElement>) {
  const { store } = props;

  const [state, setState] = createSignal(store.state);

  store.onStateChange((v) => setState(v));

  return (
    <div
      classList={{
        "overflow-hidden absolute inset-0 rounded-sm outline-slate-600 outline-2": true,
        outline: state().hovering,
        "outline-dashed": !state().hovering,
      }}
      onDragOver={(event) => {
        event.preventDefault();
        store.handleDragover();
      }}
      onDragLeave={() => {
        store.handleDragleave();
      }}
      onDrop={(event) => {
        event.preventDefault();
        store.handleDrop(Array.from(event.dataTransfer?.files || []));
      }}
    >
      <div
        class="absolute inset-0 flex items-center justify-center cursor-pointer"
        style={{ display: state().selected ? "none" : "block" }}
      >
        <div class="flex items-center justify-center h-full p-4 text-center">
          <div>
            <p>拖动 SVG 文件到此处</p>
            <input type="file" class="absolute inset-0 opacity-0 cursor-pointer" />
          </div>
        </div>
      </div>
      {props.children}
    </div>
  );
}
