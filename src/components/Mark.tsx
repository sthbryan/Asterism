export function Mark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 1.6 14.1 9 21.4 12 14.1 15 12 22.4 9.9 15 2.6 12 9.9 9 12 1.6z"
      />
    </svg>
  );
}
