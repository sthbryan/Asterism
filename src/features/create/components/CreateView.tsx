import { useStore } from "@/app/store";
import { OnlineCreateView } from "./OnlineCreateView";

export function CreateView() {
  const account = useStore((state) => state.account);
  return <OnlineCreateView key={account} />;
}
