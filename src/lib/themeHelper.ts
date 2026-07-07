export interface ColorPalette {
  name: string;
  primary: string;
  secondary: string;
  '50': string;
  '100': string;
  '200': string;
  '300': string;
  '405'?: string; // padding placeholder
  '400': string;
  '500': string;
  '600': string;
  '700': string;
  '800': string;
  '900': string;
  '950': string;
}

export const THEME_PALETTES: Record<string, ColorPalette> = {
  'sky-blue': {
    name: 'Sky Blue (Default)',
    primary: '#0EA5E9',
    secondary: '#0284C7',
    '50': '#f0f9ff',
    '100': '#e0f2fe',
    '200': '#bae6fd',
    '300': '#7dd3fc',
    '400': '#38bdf8',
    '500': '#0ea5e9',
    '600': '#0284c7',
    '700': '#0369a1',
    '800': '#075985',
    '900': '#0c4a6e',
    '950': '#082f49',
  },
  'royal-purple': {
    name: 'Royal Purple',
    primary: '#5B21FF',
    secondary: '#7C3AED',
    '50': '#f5f3ff',
    '100': '#ede9fe',
    '200': '#ddd6fe',
    '300': '#c4b5fd',
    '400': '#a78bfa',
    '500': '#8b5cf6',
    '600': '#7c3aed',
    '700': '#6d28d9',
    '800': '#5b21b6',
    '900': '#4c1d95',
    '950': '#2e1065',
  },
  'emerald-green': {
    name: 'Emerald Green',
    primary: '#10B981',
    secondary: '#059669',
    '50': '#ecfdf5',
    '100': '#d1fae5',
    '200': '#a7f3d0',
    '300': '#6ee7b7',
    '400': '#34d399',
    '500': '#10b981',
    '600': '#059669',
    '700': '#047857',
    '800': '#065f46',
    '900': '#064e3b',
    '950': '#022c22',
  },
  'amber-orange': {
    name: 'Amber Orange',
    primary: '#F59E0B',
    secondary: '#D97706',
    '50': '#fffbeb',
    '100': '#fef3c7',
    '200': '#fde68a',
    '300': '#fcd34d',
    '400': '#fbbf24',
    '500': '#f59e0b',
    '600': '#d97706',
    '700': '#b45309',
    '800': '#92400e',
    '900': '#78350f',
    '950': '#451a03',
  },
  'rose-red': {
    name: 'Rose Red',
    primary: '#F43F5E',
    secondary: '#E11D48',
    '50': '#fff1f2',
    '100': '#ffe4e6',
    '200': '#fecdd3',
    '300': '#fda4af',
    '400': '#fb7185',
    '500': '#f43f5e',
    '600': '#e11d48',
    '700': '#be123c',
    '800': '#9f1239',
    '900': '#881337',
    '950': '#4c0519',
  },
  'slate-gray': {
    name: 'Slate Gray',
    primary: '#64748B',
    secondary: '#475569',
    '50': '#f8fafc',
    '100': '#f1f5f9',
    '200': '#e2e8f0',
    '300': '#cbd5e1',
    '400': '#94a3b8',
    '500': '#64748b',
    '600': '#475569',
    '700': '#334155',
    '800': '#1e293b',
    '900': '#0f172a',
    '950': '#020617',
  }
};

export function applyThemeColor(themeKey: string = 'sky-blue') {
  const theme = THEME_PALETTES[themeKey] || THEME_PALETTES['sky-blue'];
  const root = document.documentElement;
  
  root.style.setProperty('--theme-primary', theme.primary);
  root.style.setProperty('--theme-secondary', theme.secondary);
  root.style.setProperty('--theme-50', theme['50']);
  root.style.setProperty('--theme-100', theme['100']);
  root.style.setProperty('--theme-200', theme['200']);
  root.style.setProperty('--theme-300', theme['300']);
  root.style.setProperty('--theme-400', theme['400']);
  root.style.setProperty('--theme-500', theme['500']);
  root.style.setProperty('--theme-600', theme['600']);
  root.style.setProperty('--theme-700', theme['700']);
  root.style.setProperty('--theme-800', theme['800']);
  root.style.setProperty('--theme-900', theme['900']);
  root.style.setProperty('--theme-950', theme['950']);
}
