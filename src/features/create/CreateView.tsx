import { useI18n } from "@/app/hooks";
import { useStore } from "@/app/store";
import { useTransitionNavigate } from "@/app/useViewTransition";
import { PageHeader } from "@/components/PageHeader";
import { CreateFormFields } from "./CreateFormFields";
import { ResultCard } from "./ResultCard";
import { useCreateForm } from "./useCreateForm";

export function CreateView() {
  const online = useStore((s) => s.status?.ok && !s.connecting);
  const { t } = useI18n();
  if (!online)
    return (
      <>
        <PageHeader
          title={
            <h1 className="text-[15px] font-semibold">
              {t("Create repository")}
            </h1>
          }
        />
        <p className="px-6 py-7 text-sm text-mist">{t("offline.create")}</p>
      </>
    );
  return <OnlineCreateView />;
}

function OnlineCreateView() {
  const { t } = useI18n();
  const navigate = useTransitionNavigate();
  const login = useStore((s) => s.status?.login ?? null);
  const onCreated = useStore((s) => s.handleCreated);
  const onOverview = () => navigate("/");

  const form = useCreateForm({ login, onCreated });
  const { created, error, busy, setError, resetForAnother } = form;

  return (
    <>
      <PageHeader
        title={
          <h1 className="text-[15px] font-semibold">
            {t("Create repository")}
          </h1>
        }
      />
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
    </>
  );
}
