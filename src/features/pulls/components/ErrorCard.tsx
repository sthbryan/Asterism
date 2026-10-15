import { Notice } from "@zovaris/sephiro";
import { useI18n } from "@/app/hooks";

export function ErrorCard({ message }: { message: string }) {
  const { t } = useI18n();
  return (
    <Notice variant="danger" title={t("pulls.error")} className="mb-3">
      <p className="break-words">{message}</p>
    </Notice>
  );
}
