import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api } from '@/services/api';

export interface ColorPreset {
  id: string;
  name: string;
  description: string;
  primary: string;
  dark: string;
  secondary: string;
  gold: string;
  light: string;
  colors: readonly string[];
  logoSvg: string | null;
}

export const COLOR_PRESETS: ColorPreset[] = [
  {
    id: 'mirrun',
    name: 'МирРун',
    description: 'Глубина, сила, движение',
    primary: '#CC2B2B',
    dark: '#0D1B2A',
    secondary: '#1A3A5C',
    gold: '#E8C84A',
    light: '#F0EDD8',
    colors: ['#0D1B2A', '#1A3A5C', '#CC2B2B', '#E8C84A', '#F0EDD8'],
    logoSvg: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120">
  <!-- Background -->
  <rect width="120" height="120" rx="24" fill="#0D1B2A"/>
  <!-- Gold accent bar -->
  <rect x="0" y="88" width="120" height="8" rx="0" fill="#E8C84A" opacity="0.85"/>
  <!-- Red accent stripe -->
  <rect x="0" y="96" width="120" height="24" rx="0" fill="#CC2B2B"/>
  <!-- Bottom rounded corners fix -->
  <rect x="0" y="96" width="120" height="24" fill="#CC2B2B"/>
  <path d="M0,96 L0,108 Q0,120 12,120 L108,120 Q120,120 120,108 L120,96 Z" fill="#CC2B2B"/>
  <!-- Running figure -->
  <!-- Head -->
  <circle cx="72" cy="28" r="9" fill="#F0EDD8"/>
  <!-- Body -->
  <line x1="72" y1="37" x2="68" y2="58" stroke="#F0EDD8" stroke-width="4.5" stroke-linecap="round"/>
  <!-- Left arm (forward) -->
  <line x1="71" y1="44" x2="56" y2="52" stroke="#F0EDD8" stroke-width="3.5" stroke-linecap="round"/>
  <!-- Right arm (back) -->
  <line x1="70" y1="45" x2="82" y2="38" stroke="#E8C84A" stroke-width="3.5" stroke-linecap="round"/>
  <!-- Left leg (forward) -->
  <line x1="68" y1="58" x2="54" y2="72" stroke="#F0EDD8" stroke-width="4" stroke-linecap="round"/>
  <line x1="54" y1="72" x2="46" y2="86" stroke="#F0EDD8" stroke-width="4" stroke-linecap="round"/>
  <!-- Right leg (back) -->
  <line x1="68" y1="58" x2="80" y2="68" stroke="#F0EDD8" stroke-width="4" stroke-linecap="round"/>
  <line x1="80" y1="68" x2="84" y2="84" stroke="#F0EDD8" stroke-width="4" stroke-linecap="round"/>
  <!-- M letter left side decoration -->
  <text x="22" y="78" font-family="serif" font-size="52" font-weight="900" fill="#1A3A5C" opacity="0.6">М</text>
</svg>`,
  },
  {
    id: 'sportrun-orange',
    name: 'SportRun',
    description: 'Классический оранжевый',
    primary: '#fc4c02',
    dark: '#1a1a1a',
    secondary: '#333',
    gold: '#ff7c3a',
    light: '#f0f2f5',
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
        const id = data?.['color_scheme'] ?? 'mirrun';
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
