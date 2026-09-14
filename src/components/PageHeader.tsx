import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

export type HeaderState = {
  id?: symbol;
  title: ReactNode;
  trailing: ReactNode;
};

type HeaderContextType = {
  header: HeaderState;
  setHeader: (update: {
    id: symbol;
    title: ReactNode;
    trailing: ReactNode;
    isCleanup?: boolean;
  }) => void;
};

const HeaderContext = createContext<HeaderContextType | null>(null);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [header, setHeaderState] = useState<HeaderState>({
    title: null,
    trailing: null,
  });

  const setHeader = useCallback(
    (update: {
      id: symbol;
      title: ReactNode;
      trailing: ReactNode;
      isCleanup?: boolean;
    }) => {
      setHeaderState((current) => {
        if (update.isCleanup && current.id !== update.id) {
          return current;
        }
        return {
          id: update.id,
          title: update.title,
          trailing: update.trailing,
        };
      });
    },
    [],
  );

  return (
    <HeaderContext.Provider value={{ header, setHeader }}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const ctx = useContext(HeaderContext);
  if (!ctx) {
    throw new Error("useHeader must be used within <HeaderProvider>");
  }
  return ctx;
}

export function PageHeader({
  title,
  trailing,
}: {
  title: ReactNode;
  trailing?: ReactNode;
}) {
  const { setHeader } = useHeader();
  const idRef = useRef<symbol | null>(null);
  const titleRef = useRef(title);
  const trailingRef = useRef(trailing ?? null);
  if (!idRef.current) {
    idRef.current = Symbol("PageHeader");
  }
  titleRef.current = title;
  trailingRef.current = trailing ?? null;

  useLayoutEffect(() => {
    const id = idRef.current as symbol;
    setHeader({
      id,
      title: titleRef.current,
      trailing: trailingRef.current,
    });
    return () => {
      setHeader({ id, title: null, trailing: null, isCleanup: true });
    };
  }, [setHeader]);

  return null;
}
