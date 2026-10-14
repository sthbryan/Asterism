import { Alert } from "@zovaris/sephiro";

export function Banner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <Alert className="mb-3" variant="danger">
      {message}
    </Alert>
  );
}
