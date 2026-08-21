export function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-white/[0.06] ${className}`} />;
}

export function ListSkeleton() {
  return (
    <div className="px-6 pb-8">
      <div className="card grid grid-cols-4 divide-x divide-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4">
            <Bone className="h-3 w-14" />
            <Bone className="mt-3 h-6 w-16" />
          </div>
        ))}
      </div>
      <div className="card mt-4 p-5">
        <Bone className="mb-4 h-3 w-36" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[112px_1fr_56px] items-center gap-3">
              <Bone className="h-3 w-20" />
              <Bone className="h-1.5 w-full" />
              <Bone className="ml-auto h-3 w-8" />
            </div>
          ))}
        </div>
      </div>
      <div className="card mt-4 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_88px_88px_104px] items-center gap-3 border-b border-line px-4 py-3 last:border-b-0"
          >
            <div>
              <Bone className="h-3.5 w-48" />
              <Bone className="mt-2 h-3 w-24" />
            </div>
            <Bone className="ml-auto h-3 w-8" />
            <Bone className="ml-auto h-3 w-8" />
            <Bone className="ml-auto h-3 w-10" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function PickerSkeleton() {
  return (
    <ul>
      {Array.from({ length: 8 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-4 border-b border-line px-4 py-3 last:border-b-0"
        >
          <div className="min-w-0 flex-1">
            <Bone className="h-3.5 w-52" />
            <Bone className="mt-2 h-3 w-32" />
          </div>
          <Bone className="h-5 w-9 rounded-full" />
        </li>
      ))}
    </ul>
  );
}

export function DetailSkeleton() {
  return (
    <div className="px-6 pb-8">
      <Bone className="h-3 w-2/3 max-w-xl" />
      <div className="mt-4 flex gap-2">
        <Bone className="h-6 w-16" />
        <Bone className="h-6 w-14" />
        <Bone className="h-6 w-20" />
      </div>
      <div className="card mt-4 grid grid-cols-4 divide-x divide-line">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="px-5 py-4">
            <Bone className="h-3 w-14" />
            <Bone className="mt-3 h-6 w-16" />
          </div>
        ))}
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="card p-5">
          <Bone className="h-3.5 w-28" />
          <div className="mt-5 grid grid-cols-2 gap-4">
            <Bone className="h-16" />
            <Bone className="h-16" />
          </div>
        </div>
        <div className="card p-5">
          <Bone className="h-3.5 w-24" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-1.5 w-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="card mt-4 p-5">
        <Bone className="h-3.5 w-20" />
        <div className="mt-4 grid grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <Bone className="h-3 w-12" />
              <Bone className="mt-2 h-3.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
