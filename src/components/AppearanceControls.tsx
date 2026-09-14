import { Moon, Sun } from "@phosphor-icons/react";
import { useAppearance } from "./Appearance";
import { Toggle } from "./Toggle";

export function AppearanceControls() {
  const { resolved, transparency, setTheme, setTransparency } = useAppearance();
  const next = resolved === "dark" ? "light" : "dark";

  return (
    <div className="mx-2.5 mb-1 flex items-center gap-2 rounded-lg border border-hairline px-2 py-1.5">
      <button
        type="button"
        aria-label={
          next === "light" ? "Switch to light mode" : "Switch to dark mode"
        }
        title={next === "light" ? "Light mode" : "Dark mode"}
        onClick={() => setTheme(next)}
        className="grid h-7 w-7 place-items-center rounded-md text-mist transition-colors hover:bg-hover hover:text-paper"
      >
        <span
          className="t-icon-swap"
          data-state={resolved === "dark" ? "a" : "b"}
        >
          <span className="t-icon" data-icon="a">
            <Moon size={14} />
          </span>
          <span className="t-icon" data-icon="b">
            <Sun size={14} />
          </span>
        </span>
      </button>
      <span className="min-w-0 flex-1 truncate text-[11px] leading-tight text-faint">
        {transparency ? "Transparent" : "Opaque"}
      </span>
      <Toggle
        on={transparency}
        onChange={setTransparency}
        label="Transparent window"
      />
    </div>
  );
}
