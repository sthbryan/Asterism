import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import { createPortal } from "react-dom";

type HeaderContextType = {
  titleTarget: HTMLDivElement | null;
  trailingTarget: HTMLDivElement | null;
  setTitleTarget: (node: HTMLDivElement | null) => void;
  setTrailingTarget: (node: HTMLDivElement | null) => void;
};

const HeaderContext = createContext<HeaderContextType | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [titleTarget, setTitleTarget] = useState<HTMLDivElement | null>(null);
  const [trailingTarget, setTrailingTarget] = useState<HTMLDivElement | null>(
    null,
  );
  const value = useMemo(
    () => ({ titleTarget, trailingTarget, setTitleTarget, setTrailingTarget }),
    [titleTarget, trailingTarget],
  );
  return (
    <HeaderContext.Provider value={value}>{children}</HeaderContext.Provider>
  );
}

function useHeaderContext() {
  const context = useContext(HeaderContext);
  if (!context) throw new Error("PageHeader requires HeaderProvider");
  return context;
}

export function useHeader() {
  const { setTitleTarget, setTrailingTarget } = useHeaderContext();
  return {
    header: {
      title: <div ref={setTitleTarget} className="contents" />,
      trailing: <div ref={setTrailingTarget} className="contents" />,
    },
  };
}

/** Keep controls owned by their route so props and callbacks stay current.
 * Portals avoid copying React elements into shell state on every render.
 */
export function PageHeader({
  title,
  trailing,
}: {
  title: ReactNode;
  trailing?: ReactNode;
}) {
  const { titleTarget, trailingTarget } = useHeaderContext();
  return (
    <>
      {titleTarget && createPortal(title, titleTarget)}
      {trailingTarget && createPortal(trailing ?? null, trailingTarget)}
    </>
  );
}
