import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type ThemeKey = 'nacht' | 'blut' | 'wald' | 'gold' | 'asche';

export type ColorScheme = {
  bg: string; surface: string; surfaceAlt: string; border: string;
  accent: string; accentWarm: string;
  text: string; textSecondary: string; textMuted: string;
  danger: string; success: string;
  warmup: string; warmupText: string;
};

function mk(
  bg: string, surface: string, surfaceAlt: string, border: string,
  accent: string, textSecondary: string, textMuted: string,
  warmup: string, warmupText: string,
): ColorScheme {
  return { bg, surface, surfaceAlt, border, accent, accentWarm: '#E8A020', text: '#FFFFFF', textSecondary, textMuted, danger: '#FF453A', success: '#30D158', warmup, warmupText };
}

export const THEMES: Record<ThemeKey, { name: string; preview: [string, string, string]; colors: ColorScheme }> = {
  nacht: { name: 'Nacht', preview: ['#000000', '#1C1C1E', '#2F6FFF'], colors: mk('#000000','#1C1C1E','#2C2C2E','#2A2A2A','#2F6FFF','#AEAEB2','#636366','#3A2A10','#E8A020') },
  blut:  { name: 'Blut',  preview: ['#0A0000', '#1E1010', '#CC2200'], colors: mk('#0A0000','#1E1010','#2A1818','#3A1818','#CC2200','#C0A0A0','#886666','#3A1010','#CC2200') },
  wald:  { name: 'Wald',  preview: ['#000A00', '#101E10', '#30D158'], colors: mk('#000A00','#101E10','#182818','#1A3A1A','#30D158','#A0C0A0','#558855','#1A3A10','#30D158') },
  gold:  { name: 'Gold',  preview: ['#0A0800', '#1E1A0A', '#E8A020'], colors: mk('#0A0800','#1E1A0A','#2A2410','#3A3010','#E8A020','#C0B080','#887040','#3A2810','#E8A020') },
  asche: { name: 'Asche', preview: ['#111111', '#222222', '#9F7AEA'], colors: mk('#111111','#222222','#333333','#3A3A3A','#9F7AEA','#AEAEB2','#666666','#2A1A3A','#9F7AEA') },
};

type ThemeCtx = { themeKey: ThemeKey; colors: ColorScheme; setTheme: (k: ThemeKey) => void };

const ThemeContext = createContext<ThemeCtx>({ themeKey: 'nacht', colors: THEMES.nacht.colors, setTheme: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeKey, setThemeKey] = useState<ThemeKey>('nacht');

  useEffect(() => {
    AsyncStorage.getItem('app_theme').then(k => {
      if (k && k in THEMES) setThemeKey(k as ThemeKey);
    });
  }, []);

  const setTheme = useCallback((key: ThemeKey) => {
    setThemeKey(key);
    AsyncStorage.setItem('app_theme', key);
  }, []);

  const value = useMemo(() => ({ themeKey, colors: THEMES[themeKey].colors, setTheme }), [themeKey, setTheme]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useColors(): ColorScheme { return useContext(ThemeContext).colors; }
export function useTheme() { return useContext(ThemeContext); }
