/**
 * Google Analytics 4 helpers for CarboScan.
 * Loads only in production (non-localhost) when VITE_GA_MEASUREMENT_ID is set.
 */

export const GA_MEASUREMENT_ID =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GA_MEASUREMENT_ID) ||
  (typeof window !== 'undefined' ? (window as Window & { __GA_ID__?: string }).__GA_ID__ : '') ||
  '';

export type AnalyticsEventName =
  | 'sign_up'
  | 'login'
  | 'create_project'
  | 'create_assessment'
  | 'create_carbon_report'
  | 'export_report'
  | 'request_demo'
  | 'contact_form_submit'
  | 'purchase'
  | 'begin_checkout'
  | 'page_view';

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    __GA_ID__?: string;
    __GA_SHOULD_LOAD__?: () => boolean;
    __GA_CONSENT__?: 'granted' | 'denied';
  }
}

const CONSENT_KEY = 'carboscan_cookie_consent';

export function isLocalHost(hostname = typeof window !== 'undefined' ? window.location.hostname : ''): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1';
}

export function isAnalyticsEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (isLocalHost()) return false;
  const id = GA_MEASUREMENT_ID || window.__GA_ID__ || '';
  if (!id || id.includes('%VITE_')) return false;
  if (typeof window.__GA_SHOULD_LOAD__ === 'function' && !window.__GA_SHOULD_LOAD__()) return false;
  return true;
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === 'undefined') return false;
  if (window.__GA_CONSENT__ === 'granted') return true;
  if (window.__GA_CONSENT__ === 'denied') return false;
  try {
    return localStorage.getItem(CONSENT_KEY) === 'all';
  } catch {
    return false;
  }
}

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined') return;
  if (typeof window.gtag === 'function') {
    window.gtag(...args);
    return;
  }
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push(args);
}

/** Update GA consent mode after cookie banner choice. */
export function setAnalyticsConsent(granted: boolean) {
  if (typeof window === 'undefined') return;
  window.__GA_CONSENT__ = granted ? 'granted' : 'denied';
  if (!isAnalyticsEnabled()) return;
  gtag('consent', 'update', {
    analytics_storage: granted ? 'granted' : 'denied',
    ad_storage: 'denied',
    ad_user_data: 'denied',
    ad_personalization: 'denied',
  });
  if (granted) {
    gtag('event', 'page_view', {
      page_path: window.location.pathname + window.location.search,
      page_title: document.title,
      page_location: window.location.href,
    });
  }
}

export function trackPageView(path?: string, title?: string) {
  if (typeof window === 'undefined') return;
  if (isLocalHost()) return;
  const id = GA_MEASUREMENT_ID || window.__GA_ID__ || '';
  if (!id || id.includes('%VITE_')) return;
  const pagePath = path ?? `${window.location.pathname}${window.location.search}`;
  gtag('event', 'page_view', {
    page_path: pagePath,
    page_title: title ?? document.title,
    page_location: `${window.location.origin}${pagePath}`,
  });
}

export function trackEvent(
  name: AnalyticsEventName,
  params?: Record<string, string | number | boolean | undefined>
) {
  if (typeof window === 'undefined') return;
  if (isLocalHost()) return;
  const id = GA_MEASUREMENT_ID || window.__GA_ID__ || '';
  if (!id || id.includes('%VITE_')) return;
  const cleaned = Object.fromEntries(
    Object.entries(params || {}).filter(([, v]) => v !== undefined)
  );
  gtag('event', name, cleaned);
}

export const analytics = {
  signUp: (method = 'email') => trackEvent('sign_up', { method }),
  login: (method = 'email') => trackEvent('login', { method }),
  createProject: (projectType?: string) =>
    trackEvent('create_project', { project_type: projectType }),
  createAssessment: (assessmentType?: string) =>
    trackEvent('create_assessment', { assessment_type: assessmentType }),
  createCarbonReport: (templateId?: string) =>
    trackEvent('create_carbon_report', { template_id: templateId }),
  exportReport: (format?: string, reportType?: string) =>
    trackEvent('export_report', { format, report_type: reportType }),
  requestDemo: () => trackEvent('request_demo'),
  contactFormSubmit: (formName?: string) =>
    trackEvent('contact_form_submit', { form_name: formName }),
  purchase: (value?: number, currency = 'TND', transactionId?: string) =>
    trackEvent('purchase', {
      value,
      currency,
      transaction_id: transactionId,
    }),
  beginCheckout: (value?: number, currency = 'TND') =>
    trackEvent('begin_checkout', { value, currency }),
  pageView: trackPageView,
};
