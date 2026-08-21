import { WarningCircle } from "@phosphor-icons/react";
import { Chrome } from "../components/Chrome";
import type { Status } from "../lib/types";

export function ErrorScreen({ status }: { status: Status }) {
  return (
    <Chrome login={null} nav="overview" onNav={() => undefined} title="Setup">
      <div className="flex h-full items-center justify-center px-10">
        <div className="card max-w-md p-8">
          <span className="grid h-10 w-10 place-items-center rounded-md border border-line text-accent">
            <WarningCircle size={16} />
          </span>
          <h1 className="mt-5 text-[26px] leading-tight font-semibold tracking-[-0.04em]">
            GitHub CLI is required
          </h1>
          <p className="mt-3 text-[14px] leading-relaxed text-mist">
            {status.error ?? "Asterism talks to GitHub through gh. It cannot start without it."}
          </p>
          {status.hint ? (
            <p className="mt-4 border border-line px-4 py-3 font-mono text-[12px] leading-relaxed text-paper/80">
              {status.hint}
            </p>
          ) : null}
        </div>
      </div>
    </Chrome>
  );
}
