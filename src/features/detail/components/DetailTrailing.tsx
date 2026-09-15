import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";

export function DetailTrailing({ fullName }: { fullName?: string }) {
  if (!fullName) return null;
  return (
    <button
      type="button"
      onClick={() => {
        void openUrl(`https://github.com/${fullName}`);
      }}
      className="inline-flex h-7 items-center gap-1.5 rounded-md px-2 text-[12.5px] font-medium text-mist transition-colors hover:bg-fill hover:text-paper"
    >
      GitHub
      <ArrowSquareOutIcon size={12} />
    </button>
  );
}
