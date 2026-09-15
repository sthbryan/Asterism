import { If, Then } from "react-if";

export function People({ title, values }: { title: string; values: string[] }) {
  return (
    <div>
      <div className="kpi-label text-faint">{title}</div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <If condition={values.length > 0}>
          <Then>
            {values.map((value) => (
              <span
                key={value}
                className="rounded-full bg-fill px-2 py-1 text-[11px]"
              >
                {value}
              </span>
            ))}
          </Then>
        </If>
        <If condition={values.length === 0}>
          <Then>
            <span className="text-[12px] text-mist">—</span>
          </Then>
        </If>
      </div>
    </div>
  );
}
