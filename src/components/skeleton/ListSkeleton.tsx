import { Bone } from "./Bone";

export function ListSkeleton() {
  return (
    <div className="px-6 pt-5 pb-6">
      <div className="grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <Bone className="h-2.5 w-14" />
            <Bone className="mt-3 h-5 w-12" />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card p-4">
            <Bone className="h-3 w-28" />
            <Bone className="mt-4 h-24 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-3 grid items-start gap-3 lg:grid-cols-[minmax(0,1.65fr)_minmax(260px,1fr)]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="card p-4">
            <Bone className="mb-3.5 h-3 w-36" />
            <div className="space-y-2.5">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,140px)_1fr_56px] items-center gap-3">
                  <Bone className="h-2.5 w-20" />
                  <Bone className="h-1.5 w-full rounded-full" />
                  <Bone className="ml-auto h-2.5 w-8" />
                </div>
              ))}
            </div>
          </div>
          <div className="card overflow-hidden">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="grid grid-cols-[minmax(0,1fr)_80px_80px_96px_24px] items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
              >
                <Bone className="h-3 w-48" />
                <Bone className="ml-auto h-2.5 w-7" />
                <Bone className="ml-auto h-2.5 w-7" />
                <Bone className="ml-auto h-2.5 w-9" />
                <span />
              </div>
            ))}
          </div>
        </div>
        <div className="flex min-w-0 flex-col gap-3">
          <div className="card p-4">
            <Bone className="h-2.5 w-24" />
            <Bone className="mt-3 h-4 w-40" />
            <Bone className="mt-4 h-1.5 w-full rounded-full" />
          </div>
          <div className="card p-4">
            <Bone className="h-2.5 w-20" />
            <div className="mt-3 space-y-2.5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Bone key={i} className="h-1.5 w-full rounded-full" />
              ))}
            </div>
          </div>
          <div className="card p-4">
            <Bone className="h-2.5 w-24" />
            <Bone className="mt-3 h-3 w-full" />
            <Bone className="mt-2 h-3 w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
