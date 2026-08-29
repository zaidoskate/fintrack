'use client';

import { createContext, useContext, useState, useEffect } from 'react';

type Modo = 'diario' | 'patrimonio';

interface ModoContextType {
  modo: Modo;
  setModo: (modo: Modo) => void;
}

const ModoContext = createContext<ModoContextType | undefined>(undefined);

export function ModoProvider({ children }: { children: React.ReactNode }) {
  const [modo, setModoState] = useState<Modo>('diario');

  // Cargar preferencia de localStorage al iniciar
  useEffect(() => {
    const saved = localStorage.getItem('fintrack_modo');
    if (saved === 'patrimonio') {
      setModoState('patrimonio');
    }
  }, []);

  const setModo = (newModo: Modo) => {
    setModoState(newModo);
    localStorage.setItem('fintrack_modo', newModo);
  };

  return (
    <ModoContext.Provider value={{ modo, setModo }}>
      {children}
    </ModoContext.Provider>
  );
}

export function useModo() {
  const context = useContext(ModoContext);
  if (context === undefined) {
    throw new Error('useModo must be used within a ModoProvider');
  }
  return context;
}
