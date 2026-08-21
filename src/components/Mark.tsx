export function Mark({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="currentColor"
        d="M12 2.2l1.28 5.52L18.9 8.9l-5.62 1.86L12 16.3l-1.28-5.54L5.1 8.9l5.62-1.18L12 2.2z"
      />
    </svg>
  );
}
