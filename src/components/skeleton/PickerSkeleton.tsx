import { Bone } from "./Bone";

export function PickerSkeleton() {
  return (
    <ul>
      {Array.from({ length: 8 }).map((_, i) => (
        <li
          key={i}
          className="flex items-center gap-3 border-b border-hairline px-4 py-2.5 last:border-b-0"
        >
          <Bone className="h-4 w-4 rounded-[5px]" />
          <div className="min-w-0 flex-1">
            <Bone className="h-3 w-52" />
            <Bone className="mt-1.5 h-2.5 w-36" />
          </div>
          <Bone className="h-2.5 w-10" />
        </li>
      ))}
    </ul>
  );
}
