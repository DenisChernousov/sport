import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/services/api';

export interface ColorPreset {
  id: string;
  name: string;
  description: string;
  primary: string;
  colors: readonly string[];
  logoSvg: string | null;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'chetyre-stihii',
    name: 'Четыре стихии',
    description: 'Огонь, вода, земля, воздух',
    primary: '#C0392B',
    colors: ['#C0392B', '#1A5276', '#27AE60', '#AED6F1', '#F4F6F7'],
    logoSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <circle cx="60" cy="60" r="52" fill="#F4F6F7"/>
  <path d="M60,8 A52,52 0 0,1 112,60 L60,60 Z" fill="#C0392B"/>
  <path d="M112,60 A52,52 0 0,1 60,112 L60,60 Z" fill="#27AE60"/>
  <path d="M60,112 A52,52 0 0,1 8,60 L60,60 Z" fill="#1A5276"/>
  <path d="M8,60 A52,52 0 0,1 60,8 L60,60 Z" fill="#AED6F1"/>
  <circle cx="60" cy="60" r="22" fill="#fff" stroke="#ddd" stroke-width="1.5"/>
  <circle cx="60" cy="60" r="52" fill="none" stroke="#222" stroke-width="2.5"/>
  <line x1="60" y1="8" x2="60" y2="112" stroke="#222" stroke-width="1.5" opacity="0.3"/>
  <line x1="8" y1="60" x2="112" y2="60" stroke="#222" stroke-width="1.5" opacity="0.3"/>
  <text x="83" y="48" text-anchor="middle" font-size="13" fill="#fff">🔥</text>
  <text x="83" y="80" text-anchor="middle" font-size="13" fill="#fff">🌿</text>
  <text x="37" y="80" text-anchor="middle" font-size="13" fill="#fff">💧</text>
  <text x="37" y="48" text-anchor="middle" font-size="13" fill="#1A5276">💨</text>
  <text x="60" y="65" text-anchor="middle" font-size="16" fill="#333">🏃</text>
</svg>`,
  },
  {
    id: 'sportrun-orange',
    name: 'SportRun Orange',
    description: 'Классический оранжевый',
    primary: '#fc4c02',
    colors: ['#fc4c02', '#ff7c3a', '#1a1a1a', '#f0f2f5', '#ffffff'],
    logoSvg: null,
  },
];

export function getPreset(id: string): ColorPreset {
  return COLOR_PRESETS.find(p => p.id === id) ?? COLOR_PRESETS[0];
}

interface ThemeCtx {
  preset: ColorPreset;
  primary: string;
  setSchemeId: (id: string) => void;
}

const ThemeContext = createContext<ThemeCtx>({
  preset: COLOR_PRESETS[0],
  primary: COLOR_PRESETS[0].primary,
  setSchemeId: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preset, setPreset] = useState<ColorPreset>(COLOR_PRESETS[0]);

  useEffect(() => {
    api.settings.getPublic()
      .then(data => {
        const id = data?.['color_scheme'] ?? 'chetyre-stihii';
        setPreset(getPreset(id));
      })
      .catch(() => {});
  }, []);

  const setSchemeId = (id: string) => setPreset(getPreset(id));

  return (
    <ThemeContext.Provider value={{ preset, primary: preset.primary, setSchemeId }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
