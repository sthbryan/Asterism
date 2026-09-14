import { openUrl } from "@tauri-apps/plugin-opener";
import { BarChart } from "../../components/Charts";
import { useI18n } from "../../lib/i18n";
import { langColor } from "../../lib/langcolors";
import { platformItems, shortPath } from "../../lib/platform";
import type { RepoDetail } from "../../lib/types";

export function InsightsSection({ detail }: { detail: RepoDetail }) {
  const { t, formatNumber } = useI18n();
  const langTotal =
    detail.languages.reduce((sum, lang) => sum + lang.bytes, 0) || 1;
  const platformBars = platformItems(
    detail.platforms ?? { macos: 0, windows: 0, linux: 0, other: 0 },
  );
  const referrers = [...(detail.referrers ?? [])].slice(0, 8);
  const paths = [...(detail.paths ?? [])].slice(0, 8);

  return (
    <>
      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <div className="text-[13px] font-semibold">
            {t("Referrers · 14 days")}
          </div>
          {referrers.length === 0 ? (
            <p className="mt-3 text-[13px] text-faint">
              {detail.trafficError && !detail.views
                ? t("Referrers need push access, same as views.")
                : t("No referrers in the last 14 days.")}
            </p>
          ) : (
            <div className="mt-3">
              <BarChart
                items={referrers.map((row) => ({
                  label: row.referrer,
                  value: row.count,
                }))}
              />
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="text-[13px] font-semibold">
            {t("Popular paths · 14 days")}
          </div>
          {paths.length === 0 ? (
            <p className="mt-3 text-[13px] text-faint">
              {detail.trafficError && !detail.views
                ? t("Paths need push access, same as views.")
                : t("No popular paths in the last 14 days.")}
            </p>
          ) : (
            <div className="mt-3">
              <BarChart
                items={paths.map((row) => ({
                  label:
                    shortPath(row.path, detail.fullName) === "Overview"
                      ? t("Overview")
                      : shortPath(row.path, detail.fullName),
                  value: row.count,
                }))}
                onSelect={(label) => {
                  const match = paths.find(
                    (row) =>
                      (shortPath(row.path, detail.fullName) === "Overview"
                        ? t("Overview")
                        : shortPath(row.path, detail.fullName)) === label,
                  );
                  if (match) void openUrl(`https://github.com${match.path}`);
                }}
              />
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 grid gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <div className="text-[13px] font-semibold">
            {t("Downloads by platform")}
          </div>
          {platformBars.length === 0 ? (
            <p className="mt-3 text-[13px] text-faint">
              {t("No release assets with a recognizable platform.")}
            </p>
          ) : (
            <div className="mt-3">
              <BarChart
                items={platformBars.map((item) => ({
                  ...item,
                  label: item.label === "Other" ? t("Other") : item.label,
                }))}
              />
            </div>
          )}
        </div>
        <div className="card p-4">
          <div className="text-[13px] font-semibold">{t("Languages")}</div>
          {detail.languages.length === 0 ? (
            <p className="mt-3 text-[13px] text-faint">
              {t("No language data.")}
            </p>
          ) : (
            <ul className="mt-3.5 space-y-2">
              {detail.languages.map((lang) => {
                const pct = (lang.bytes / langTotal) * 100;
                return (
                  <li
                    key={lang.name}
                    className="grid grid-cols-[100px_1fr_40px] items-center gap-2.5"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 text-[12.5px]">
                      <span
                        className="h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: langColor(lang.name) }}
                      />
                      <span className="truncate">{lang.name}</span>
                    </span>
                    <span className="block h-1.5 overflow-hidden rounded-full bg-raised">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: `${Math.max(pct, 2)}%`,
                          background: langColor(lang.name),
                        }}
                      />
                    </span>
                    <span className="text-right font-mono text-[11.5px] text-mist tabular">
                      {pct < 1
                        ? "<1%"
                        : formatNumber(pct / 100, {
                            style: "percent",
                            maximumFractionDigits: 0,
                          })}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  );
}
