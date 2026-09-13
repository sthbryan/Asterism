import { useState } from "react";

export function Toggle({
  on,
  onChange,
  label,
}: {
  on: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  const [ready, setReady] = useState(false);

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      data-on={on ? "true" : "false"}
      onClick={() => {
        setReady(true);
        onChange(!on);
      }}
      className={`t-toggle ${ready ? "is-init" : ""}`}
    >
      <span className="t-toggle-thumb" />
    </button>
  );
}
