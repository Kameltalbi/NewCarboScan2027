import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SEOHead } from '@/components/seo/SEOHead';
import { trackPageView, isLocalHost, GA_MEASUREMENT_ID } from '@/lib/analytics';

/**
 * Tracks SPA route changes for GA4 and applies default SEO metadata per path.
 * Consent is handled lightly: production always loads the standard gtag snippet
 * in index.html (required for Search Console). SPA page_view events still fire
 * when analytics is enabled.
 */
export function AnalyticsRouteListener() {
  const location = useLocation();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isLocalHost()) return;
    if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID.includes('%')) return;
    trackPageView(`${location.pathname}${location.search}`);
  }, [location.pathname, location.search]);

  const isApp =
    location.pathname.startsWith('/app') ||
    location.pathname.startsWith('/superadmin');

  return (
    <SEOHead
      path={location.pathname}
      includeGlobalSchemas={location.pathname === '/'}
      noindex={isApp || undefined}
    />
  );
}
