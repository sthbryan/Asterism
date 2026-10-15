import { Skeleton, Surface } from "@zovaris/sephiro";

export function DetailSkeleton() {
  return (
    <div className="px-6 pt-5 pb-6">
      <Skeleton className="app-skeleton h-5 w-16 rounded-full" />
      <Skeleton className="app-skeleton mt-2.5 h-3 w-2/3 max-w-xl" />
      <div className="mt-3 flex gap-1.5">
        <Skeleton className="app-skeleton h-5 w-16 rounded-md" />
        <Skeleton className="app-skeleton h-5 w-14 rounded-md" />
        <Skeleton className="app-skeleton h-5 w-20 rounded-md" />
      </div>
      <div className="mt-5 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Surface key={i} padding="md" className="border border-hairline">
            <Skeleton className="app-skeleton h-2.5 w-16" />
            <Skeleton className="app-skeleton mt-3 h-6 w-14" />
          </Surface>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <Surface key={i} padding="md" className="border border-hairline">
            <Skeleton className="app-skeleton h-3 w-28" />
            <Skeleton className="app-skeleton mt-2 h-2.5 w-48" />
            <Skeleton className="app-skeleton mt-4 h-24 w-full" />
          </Surface>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <Surface padding="md" className="border border-hairline">
          <Skeleton className="app-skeleton h-3 w-32" />
          <div className="mt-4 grid grid-cols-2 gap-5">
            <Skeleton className="app-skeleton h-12" />
            <Skeleton className="app-skeleton h-12" />
          </div>
        </Surface>
        <Surface padding="md" className="border border-hairline">
          <Skeleton className="app-skeleton h-3 w-24" />
          <div className="mt-3.5 space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton
                key={i}
                className="app-skeleton h-1.5 w-full rounded-full"
              />
            ))}
          </div>
        </Surface>
      </div>
      <Surface padding="md" className="mt-3 border border-hairline">
        <Skeleton className="app-skeleton h-3 w-20" />
        <div className="mt-3.5 grid grid-cols-5 gap-x-8 gap-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="app-skeleton h-2.5 w-14" />
              <Skeleton className="app-skeleton mt-1.5 h-3 w-20" />
            </div>
          ))}
        </div>
      </Surface>
    </div>
  );
}
