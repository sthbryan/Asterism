export function RepoMeta({ children }: { children: string }) {
  return (
    <span className="shrink-0 rounded border border-line px-1 py-px leading-none font-mono text-[9px] tracking-wide uppercase">
      {children}
    </span>
  );
}
