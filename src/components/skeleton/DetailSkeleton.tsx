// biome-ignore-all lint/suspicious/noArrayIndexKey: static skeleton placeholders with fixed counts; never reordered, no state.
import { Bone } from "./Bone";

export function DetailSkeleton() {
  return (
    <div className="px-6 pt-5 pb-6">
      <Bone className="h-5 w-16 rounded-full" />
      <Bone className="mt-2.5 h-3 w-2/3 max-w-xl" />
      <div className="mt-3 flex gap-1.5">
        <Bone className="h-5 w-16 rounded-md" />
        <Bone className="h-5 w-14 rounded-md" />
        <Bone className="h-5 w-20 rounded-md" />
      </div>
      <div className="mt-5 grid grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4">
            <Bone className="h-2.5 w-16" />
            <Bone className="mt-3 h-6 w-14" />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="card p-4">
            <Bone className="h-3 w-28" />
            <Bone className="mt-2 h-2.5 w-48" />
            <Bone className="mt-4 h-24 w-full" />
          </div>
        ))}
      </div>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <Bone className="h-3 w-32" />
          <div className="mt-4 grid grid-cols-2 gap-5">
            <Bone className="h-12" />
            <Bone className="h-12" />
          </div>
        </div>
        <div className="card p-4">
          <Bone className="h-3 w-24" />
          <div className="mt-3.5 space-y-2.5">
            {Array.from({ length: 4 }).map((_, i) => (
              <Bone key={i} className="h-1.5 w-full rounded-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="card mt-3 p-4">
        <Bone className="h-3 w-20" />
        <div className="mt-3.5 grid grid-cols-5 gap-x-8 gap-y-3">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i}>
              <Bone className="h-2.5 w-14" />
              <Bone className="mt-1.5 h-3 w-20" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
