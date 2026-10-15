import { Skeleton } from "@zovaris/sephiro";

export function PickerSkeleton() {
  return (
    <ul>
      {Array.from({ length: 8 }).map((_, i) => (
        <li
          key={`picker-skeleton-${i}`}
          className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
        >
          <Skeleton className="app-skeleton h-4 w-4 rounded-[5px]" />
          <div className="min-w-0 flex-1">
            <Skeleton className="app-skeleton h-3 w-52" />
            <Skeleton className="app-skeleton mt-1.5 h-2.5 w-36" />
          </div>
          <Skeleton className="app-skeleton h-2.5 w-10" />
        </li>
      ))}
    </ul>
  );
}
