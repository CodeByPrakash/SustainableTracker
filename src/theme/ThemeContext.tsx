import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { LightColors, DarkColors, ColorTokens } from './colors';

type ThemeMode = 'light' | 'dark';

interface ThemeContextValue {
  mode: ThemeMode;
  colors: ColorTokens;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: 'light',
  colors: LightColors,
  toggleTheme: () => {},
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<ThemeMode>('light');

  const toggleTheme = useCallback(() => {
    setMode((prev) => (prev === 'light' ? 'dark' : 'light'));
  }, []);

  const setTheme = useCallback((m: ThemeMode) => {
    setMode(m);
  }, []);

  const colors = useMemo(() => (mode === 'light' ? LightColors : DarkColors), [mode]);

  const value = useMemo(
    () => ({ mode, colors, toggleTheme, setTheme }),
    [mode, colors, toggleTheme, setTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext);
}
