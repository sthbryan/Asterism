import { CodeIcon } from "@phosphor-icons/react";
import { If, Then } from "react-if";
import type { PullFile } from "@/lib/types";

export function FileList({ files }: { files: PullFile[] }) {
  return (
    <div className="border-t border-hairline">
      <If condition={files.length > 0}>
        <Then>
          {files.map((file) => (
            <div
              key={file.path}
              className="flex items-center gap-3 px-4 py-2 text-[12px]"
            >
              <CodeIcon size={13} className="shrink-0 text-faint" />
              <span className="min-w-0 flex-1 truncate font-mono">
                {file.path}
              </span>
              <span className="shrink-0 text-ok">+{file.additions}</span>
              <span className="shrink-0 text-accent-soft">
                −{file.deletions}
              </span>
            </div>
          ))}
        </Then>
      </If>
      <If condition={files.length === 0}>
        <Then>
          <div className="p-4 text-[12px] text-mist">—</div>
        </Then>
      </If>
    </div>
  );
}
