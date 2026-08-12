import React, { useState, useEffect } from 'react';
import { X, Cookie, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';
import { setAnalyticsConsent } from '@/lib/analytics';

const CONSENT_KEY = 'carboscan_cookie_consent';

type ConsentChoice = 'all' | 'essential' | null;

export const CookieBanner: React.FC = () => {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) {
      const timer = setTimeout(() => setVisible(true), 1500);
      return () => clearTimeout(timer);
    }
    setAnalyticsConsent(consent === 'all');
  }, []);

  const handleConsent = (choice: ConsentChoice) => {
    const value = choice || 'essential';
    localStorage.setItem(CONSENT_KEY, value);
    setAnalyticsConsent(value === 'all');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-0 inset-x-0 z-50 p-4 md:p-6"
      role="dialog"
      aria-label={t('cookieBanner.ariaLabel')}
      aria-modal="false"
    >
      <div className="max-w-4xl mx-auto bg-card border border-border rounded-2xl shadow-strong p-6 animate-fadeInUp">
        <div className="flex items-start gap-4">
          <div className="hidden sm:flex h-10 w-10 rounded-full bg-primary/10 items-center justify-center flex-shrink-0">
            <Cookie className="h-5 w-5 text-primary" aria-hidden="true" />
          </div>

          <div className="flex-1 space-y-3">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Cookie className="h-5 w-5 sm:hidden text-primary" aria-hidden="true" />
              {t('cookieBanner.title')}
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {t('cookieBanner.description')}{' '}
              <a href="/privacy-policy" className="text-primary underline hover:no-underline">
                {t('cookieBanner.privacyLink')}
              </a>.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button onClick={() => handleConsent('all')} size="sm">
                {t('cookieBanner.acceptAll')}
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleConsent('essential')}>
                {t('cookieBanner.essentialOnly')}
              </Button>
              <a
                href="/privacy-policy"
                className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Shield className="h-3.5 w-3.5" aria-hidden="true" />
                {t('cookieBanner.learnMore')}
              </a>
            </div>
          </div>

          <button
            onClick={() => handleConsent('essential')}
            className="p-1 hover:bg-muted rounded-full transition-colors flex-shrink-0"
            aria-label={t('cookieBanner.closeAriaLabel')}
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};
