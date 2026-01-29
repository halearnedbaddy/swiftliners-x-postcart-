import { useState, useEffect, useMemo } from 'react';
import en from '@/locales/en';
import sw from '@/locales/sw';
import fr from '@/locales/fr';

const messages: Record<string, Record<string, unknown>> = {
  en,
  sw,
  fr,
};

function getInitialLanguage(): string {
  if (typeof window === 'undefined') return 'en';
  return localStorage.getItem('payloom_lang') || 'en';
}

function getNested(obj: Record<string, unknown>, path: string): string | undefined {
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return typeof current === 'string' ? current : undefined;
}

export function useTranslations() {
  const [language, setLanguage] = useState<string>(getInitialLanguage);

  useEffect(() => {
    const handler = (e: Event) => setLanguage((e as CustomEvent).detail);
    window.addEventListener('payloom-language-changed', handler);
    return () => window.removeEventListener('payloom-language-changed', handler);
  }, []);

  const dict = useMemo(() => messages[language] ?? messages.en, [language]);

  const t = useMemo(() => {
    return (key: string): string => {
      const value = getNested(dict as unknown as Record<string, unknown>, key);
      return value ?? key;
    };
  }, [dict]);

  return { t, language };
}
