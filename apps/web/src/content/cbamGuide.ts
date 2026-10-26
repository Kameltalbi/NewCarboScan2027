import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { localizeTree, normalizeVerifierLocale } from '@cbam-verifier';
import guide from './cbam.json';

export function useCbamGuide() {
  const { i18n } = useTranslation();
  const locale = normalizeVerifierLocale(i18n.resolvedLanguage || i18n.language);
  return useMemo(() => localizeTree(guide, locale), [locale]);
}

export function afterLabel(text: string) {
  const cut = text.indexOf(' : ');
  return cut === -1 ? text : text.slice(cut + 3);
}
