import { Skeleton } from "@zovaris/sephiro";

export function ListSkeleton() {
  return (
    <div className="px-6 pt-5 pb-6">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="min-w-0">
            <Skeleton className="app-skeleton h-2.5 w-14" />
            <Skeleton className="app-skeleton mt-3 h-5 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="min-w-0">
            <Skeleton className="app-skeleton h-3 w-28" />
            <Skeleton className="app-skeleton mt-4 h-24 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <Skeleton className="app-skeleton mb-3.5 h-3 w-36" />
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,140px)_1fr_56px] items-center gap-3"
                >
                  <Skeleton className="app-skeleton h-2.5 w-20" />
                  <Skeleton className="app-skeleton h-1.5 w-full rounded-full" />
                  <Skeleton className="app-skeleton ml-auto h-2.5 w-8" />
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-hairline">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,1fr)_80px_80px_96px_24px] items-center gap-3 border-b border-hairline py-2.5 last:border-b-0"
              >
                <Skeleton className="app-skeleton h-3 w-48" />
                <Skeleton className="app-skeleton ml-auto h-2.5 w-7" />
                <Skeleton className="app-skeleton ml-auto h-2.5 w-7" />
                <Skeleton className="app-skeleton ml-auto h-2.5 w-9" />
                <span />
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="min-w-0">
            <Skeleton className="app-skeleton h-2.5 w-24" />
            <Skeleton className="app-skeleton mt-3 h-4 w-40" />
            <Skeleton className="app-skeleton mt-4 h-1.5 w-full rounded-full" />
          </div>
          <div className="min-w-0">
            <Skeleton className="app-skeleton h-2.5 w-20" />
            <div className="mt-3 space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton
                  key={i}
                  className="app-skeleton h-1.5 w-full rounded-full"
                />
              ))}
            </div>
          </div>
          <div className="min-w-0">
            <Skeleton className="app-skeleton h-2.5 w-24" />
            <Skeleton className="app-skeleton mt-3 h-3 w-full" />
            <Skeleton className="app-skeleton mt-2 h-3 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
