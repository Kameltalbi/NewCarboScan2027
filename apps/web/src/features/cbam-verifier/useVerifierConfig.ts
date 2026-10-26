import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { getVerifierConfig, normalizeVerifierLocale } from '@cbam-verifier';

export function useVerifierConfig() {
  const { i18n } = useTranslation();
  const locale = normalizeVerifierLocale(i18n.resolvedLanguage || i18n.language);
  return useMemo(() => getVerifierConfig(locale), [locale]);
}
