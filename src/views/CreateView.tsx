import type { CreatedRepo } from "../lib/types";
import { CreateFormFields } from "./create/CreateFormFields";
import { ResultCard } from "./create/ResultCard";
import { useCreateForm } from "./create/useCreateForm";

export function CreateView({
  login,
  onCreated,
  onOverview,
}: {
  login: string | null;
  onCreated: (repo: CreatedRepo, track: boolean) => Promise<void>;
  onOverview: () => void;
}) {
  const form = useCreateForm({ login, onCreated });
  const { created, error, busy, setError, resetForAnother } = form;

  return (
    <div className="h-full overflow-y-auto px-6 py-7">
      <div className="mx-auto max-w-[640px]">
        {created ? (
          <ResultCard
            created={created}
            error={error}
            busy={busy}
            setError={setError}
            onOverview={onOverview}
            onReset={resetForAnother}
          />
        ) : (
          <CreateFormFields form={form} />
        )}
      </div>
    </div>
  );
}
