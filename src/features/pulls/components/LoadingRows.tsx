import { Skeleton } from "@zovaris/sephiro";

export function LoadingRows() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      {["a", "b", "c", "d"].map((key) => (
        <Skeleton key={key} height={96} />
      ))}
    </div>
  );
}
