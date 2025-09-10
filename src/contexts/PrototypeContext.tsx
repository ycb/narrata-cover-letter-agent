import { createContext, useContext, useState, ReactNode } from "react";

type PrototypeState = 'marketing' | 'new-user' | 'existing-user';

interface PrototypeContextType {
  prototypeState: PrototypeState;
  setPrototypeState: (state: PrototypeState) => void;
}

const PrototypeContext = createContext<PrototypeContextType | undefined>(undefined);

export function PrototypeProvider({ children }: { children: ReactNode }) {
  const [prototypeState, setPrototypeState] = useState<PrototypeState>('existing-user');

  return (
    <PrototypeContext.Provider value={{ prototypeState, setPrototypeState }}>
      {children}
    </PrototypeContext.Provider>
  );
}

export function usePrototype() {
  const context = useContext(PrototypeContext);
  if (context === undefined) {
    throw new Error('usePrototype must be used within a PrototypeProvider');
  }
  return context;
}