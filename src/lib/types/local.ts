export type LocalCheckoutStatus =
  | "ready"
  | "missing"
  | "notGit"
  | "remoteMismatch"
  | "unavailable"
  | "gitUnavailable";

export type LocalCheckout = {
  fullName: string;
  path: string;
  status: LocalCheckoutStatus;
  branch: string | null;
  remoteUrl: string | null;
};
