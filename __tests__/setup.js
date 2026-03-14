import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';
import { translations } from '../app/lib/translations';

// Mock useLanguage so components render with actual Spanish text in tests
vi.mock('../app/contexts/LanguageContext', () => ({
  useLanguage: () => ({
    lang: 'es',
    setLang: vi.fn(),
    t: (key) => translations.es?.[key] || key,
  }),
  LanguageProvider: ({ children }) => children,
}));
