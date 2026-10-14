import { ArrowSquareOutIcon } from "@phosphor-icons/react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { Button } from "@zovaris/sephiro";
import { hrefFromMaybeUrl } from "@/lib/format";

export function HomepageValue({ value }: { value: string | null }) {
  if (!value) return "—";
  const href = hrefFromMaybeUrl(value);
  if (!href) return value;
  return (
    <Button
      variant="quiet"
      size="sm"
      className="h-auto min-w-0 max-w-full gap-1 p-0 text-left text-accent-soft hover:bg-transparent hover:text-accent-soft [&_.sph-button__label]:min-w-0 [&_.sph-button__label]:max-w-full"
      title={href}
      onClick={() => {
        void openUrl(href);
      }}
    >
      <span className="min-w-0 flex-1 truncate">{value}</span>
      <ArrowSquareOutIcon size={11} className="shrink-0" />
    </Button>
  );
}
