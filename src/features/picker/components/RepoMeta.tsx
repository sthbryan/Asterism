export function RepoMeta({ children }: { children: string }) {
  return (
    <span className="rounded-md border border-line px-1.5 py-px font-mono text-[10px] tracking-wide uppercase">
      {children}
    </span>
  );
}
