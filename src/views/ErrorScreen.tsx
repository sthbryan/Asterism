import { WarningCircle } from "@phosphor-icons/react";
import { Chrome } from "../components/Chrome";
import type { Status } from "../lib/types";

export function ErrorScreen({ status }: { status: Status }) {
  return (
    <Chrome>
      <div className="flex h-full items-center justify-center px-10">
        <div className="max-w-md">
          <WarningCircle size={28} weight="light" className="text-star" />
          <h1 className="mt-5 text-[28px] leading-tight font-semibold tracking-[-0.04em]">
            GitHub CLI is required
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed text-mist">
            {status.error ?? "Asterism talks to GitHub through gh. It cannot start without it."}
          </p>
          {status.hint ? (
            <p className="mt-4 font-mono text-[13px] leading-relaxed text-paper/80">
              {status.hint}
            </p>
          ) : null}
        </div>
      </div>
    </Chrome>
  );
}
