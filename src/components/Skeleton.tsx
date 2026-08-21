export function Bone({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-white/[0.06] ${className}`} />;
}

export function ListSkeleton() {
  return (
    <div className="px-7 pt-6 pb-8">
      <div className="grid grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <Bone className="h-3 w-16" />
            <Bone className="mt-3.5 h-7 w-14" />
          </div>
        ))}
      </div>
      <div className="card mt-3.5 p-5">
        <Bone className="mb-4 h-3 w-40" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="grid grid-cols-[minmax(0,150px)_1fr_64px] items-center gap-3.5">
              <Bone className="h-3 w-24" />
              <Bone className="h-2 w-full rounded-full" />
              <Bone className="ml-auto h-3 w-8" />
            </div>
          ))}
        </div>
      </div>
      <div className="card mt-3.5 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[minmax(0,1fr)_88px_88px_104px_28px] items-center gap-3 border-b border-hairline px-5 py-3.5 last:border-b-0"
          >
            <Bone className="h-3.5 w-52" />
            <Bone className="ml-auto h-3 w-8" />
            <Bone className="ml-auto h-3 w-8" />
            <Bone className="ml-auto h-3 w-10" />
            <span />
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
          className="flex items-center gap-3.5 border-b border-hairline px-5 py-3 last:border-b-0"
        >
          <Bone className="h-[18px] w-[18px] rounded-md" />
          <div className="min-w-0 flex-1">
            <Bone className="h-3.5 w-52" />
            <Bone className="mt-2 h-3 w-36" />
          </div>
          <Bone className="h-3 w-10" />
        </li>
      ))}
    </ul>
  );
}

export function DetailSkeleton() {
  return (
    <div className="px-7 pt-6 pb-8">
      <Bone className="h-6 w-64" />
      <Bone className="mt-3 h-3 w-2/3 max-w-xl" />
      <div className="mt-4 flex gap-2">
        <Bone className="h-6 w-16 rounded-md" />
        <Bone className="h-6 w-14 rounded-md" />
        <Bone className="h-6 w-20 rounded-md" />
      </div>
      <div className="mt-6 grid grid-cols-4 gap-3.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5">
            <Bone className="h-3 w-16" />
            <Bone className="mt-3.5 h-7 w-14" />
          </div>
        ))}
      </div>
      <div className="mt-3.5 grid gap-3.5 lg:grid-cols-2">
        <div className="card p-5">
          <Bone className="h-3.5 w-36" />
          <div className="mt-5 grid grid-cols-2 gap-6">
            <Bone className="h-14" />
            <Bone className="h-14" />
          </div>
        </div>
        <div className="card p-5">
          <Bone className="h-3.5 w-24" />
          <div className="mt-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-[7px] w-full rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="card mt-3.5 p-5">
        <Bone className="h-3.5 w-20" />
        <div className="mt-4 grid grid-cols-6 gap-x-8 gap-y-3.5">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i}>
              <Bone className="h-3 w-14" />
              <Bone className="mt-2 h-3.5 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
