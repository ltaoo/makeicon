import { File } from "lucide-solid";

export function FileThumb(props: { filename: string }) {
  const { filename } = props;

  return (
    <div class="flex flex-cols items-center">
      <div>
        <File class="w-8 h-0" />
      </div>
      <div class="mt-2">{filename}</div>
    </div>
  );
}
