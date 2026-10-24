import { Notice } from "@zovaris/sephiro";
import { useI18n } from "@/app/hooks";

export function PartialErrors({ errors }: { errors: Record<string, string> }) {
  const { t } = useI18n();
  // Repository keys are "owner/name". Any other key is a failure of the whole
  // refresh, which must not be repeated once per repository.
  const entries = Object.entries(errors);
  const wholeRequest = entries.find(([repo]) => !repo.includes("/"));
  const perRepo = entries.filter(([repo]) => repo.includes("/"));
  return (
    <Notice
      variant="warning"
      title={t(perRepo.length > 0 ? "pulls.partial" : "pulls.error")}
      className="mb-3"
    >
      <div className="grid gap-1">
        {wholeRequest ? <span>{wholeRequest[1]}</span> : null}
        {perRepo.map(([repo, message]) => (
          <div key={repo} className="flex flex-wrap gap-2">
            <span className="font-mono text-paper">{repo}</span>
            <span>{message}</span>
          </div>
        ))}
      </div>
    </Notice>
  );
}
