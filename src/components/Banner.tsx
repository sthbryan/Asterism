import { Notice } from "@zovaris/sephiro";

export function Banner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Notice className="mb-3" variant="danger">
      {message}
    </Notice>
  );
}
