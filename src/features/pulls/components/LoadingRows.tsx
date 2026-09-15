export function LoadingRows() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true">
      {["a", "b", "c", "d"].map((key) => (
        <div key={key} className="card h-24 animate-pulse bg-wash" />
      ))}
    </div>
  );
}
