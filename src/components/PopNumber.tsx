import { useLayoutEffect, useRef } from "react";

export function PopNumber({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const chars = [...value];

  useLayoutEffect(() => {
    const group = ref.current;
    if (!group) return;
    group.classList.remove("is-animating");
    void group.offsetWidth;
    group.classList.add("is-animating");
  }, [value]);

  return (
    <span ref={ref} className={`t-digit-group is-animating ${className}`}>
      {chars.map((ch, i) => (
        <span
          key={`${i}-${ch}`}
          className="t-digit"
          data-stagger={i === chars.length - 1 ? "2" : i === chars.length - 2 ? "1" : undefined}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}
