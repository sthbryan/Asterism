import { WarningCircleIcon } from "@phosphor-icons/react";
import { useEffect, useState } from "react";

export function Banner({ message }: { message: string | null }) {
  const [text, setText] = useState(message);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (message) {
      setText(message);
      const id = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(id);
    }
    setOpen(false);
    return undefined;
  }, [message]);

  if (!text) return null;

  return (
    <div
      className={`t-toast mb-3 flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/[0.06] px-3 py-2 text-[12.5px] text-accent-soft ${
        open ? "is-open" : ""
      }`}
    >
      <WarningCircleIcon size={14} className="shrink-0" />
      <span className="truncate">{text}</span>
    </div>
  );
}
