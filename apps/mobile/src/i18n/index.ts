import { getLocales } from 'expo-localization';
import { createInstance } from 'i18next';
import { initReactI18next } from 'react-i18next';

import { cacheKeys, getCachedValue, setCachedValue } from '@/lib/cache';
import type { AppLanguage } from '@/types/database';

import { resources } from './resources';

const cachedLanguage = getCachedValue<AppLanguage>(cacheKeys.language);
const deviceLanguage = getLocales()[0]?.languageCode === 'en' ? 'en' : 'fr';
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources,
  lng: cachedLanguage ?? deviceLanguage,
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
});

export async function setAppLanguage(language: AppLanguage): Promise<void> {
  setCachedValue(cacheKeys.language, language);
  await i18n.changeLanguage(language);
}

export default i18n;
