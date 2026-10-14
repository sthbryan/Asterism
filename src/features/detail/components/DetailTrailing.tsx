import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@zovaris/sephiro";

export function DetailTrailing({ fullName }: { fullName?: string }) {
  if (!fullName) return null;
  return (
    <Button
      variant="quiet"
      size="sm"
      className="shrink-0"
      onClick={() => {
        void openUrl(`https://github.com/${fullName}`);
      }}
    >
      GitHub
      <ArrowSquareOutIcon size={12} />
    </Button>
  );
}
