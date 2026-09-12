import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useTranslation } from 'react-i18next';
import {
  DEFAULT_OG_IMAGE,
  DEFAULT_LOCALE,
  SITE_NAME,
  SITE_URL,
  getPageSEO,
  buildBreadcrumbSchema,
  ORGANIZATION_SCHEMA,
  SOFTWARE_SCHEMA,
  WEBSITE_SCHEMA,
  type PageSEO,
} from '@/config/seo';

const OG_LOCALES: Record<string, string> = {
  fr: 'fr_FR',
  en: 'en_US',
  de: 'de_DE',
  es: 'es_ES',
};

type SEOHeadProps = {
  title?: string;
  description?: string;
  path?: string;
  image?: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
  breadcrumbs?: { name: string; path: string }[];
  jsonLd?: Record<string, unknown> | Record<string, unknown>[];
  /** When true, emit Organization + SoftwareApplication + WebSite schemas */
  includeGlobalSchemas?: boolean;
};

function absoluteUrl(path: string) {
  if (path.startsWith('http')) return path;
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${SITE_URL}${clean === '/' ? '' : clean}`;
}

export const SEOHead: React.FC<SEOHeadProps> = ({
  title,
  description,
  path,
  image = DEFAULT_OG_IMAGE,
  ogType,
  noindex,
  breadcrumbs,
  jsonLd,
  includeGlobalSchemas = false,
}) => {
  const { i18n } = useTranslation();
  const htmlLang = (i18n.language || 'fr').slice(0, 2);
  const ogLocale = OG_LOCALES[htmlLang] ?? DEFAULT_LOCALE;

  const resolvedPath =
    path ?? (typeof window !== 'undefined' ? window.location.pathname : '/');
  const defaults: PageSEO = getPageSEO(resolvedPath);
  const pageTitle = title ?? defaults.title;
  const pageDescription = description ?? defaults.description;
  const canonical = absoluteUrl(defaults.path || resolvedPath);
  const type = ogType ?? defaults.ogType ?? 'website';
  const robots = (noindex ?? defaults.noindex) ? 'noindex, nofollow' : 'index, follow';
  const crumbs = breadcrumbs ?? defaults.breadcrumbs;

  const schemas: Record<string, unknown>[] = [];
  if (includeGlobalSchemas) {
    schemas.push(ORGANIZATION_SCHEMA, SOFTWARE_SCHEMA, WEBSITE_SCHEMA);
  }
  if (crumbs?.length) {
    schemas.push(buildBreadcrumbSchema(crumbs));
  }
  if (jsonLd) {
    schemas.push(...(Array.isArray(jsonLd) ? jsonLd : [jsonLd]));
  }

  return (
    <Helmet>
      <html lang={htmlLang} />
      <title>{pageTitle}</title>
      <meta name="description" content={pageDescription} />
      <meta name="robots" content={robots} />
      <link rel="canonical" href={canonical} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:locale" content={ogLocale} />
      <meta property="og:type" content={type} />
      <meta property="og:title" content={pageTitle} />
      <meta property="og:description" content={pageDescription} />
      <meta property="og:url" content={canonical} />
      <meta property="og:image" content={image} />
      <meta property="og:image:alt" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      <meta name="twitter:description" content={pageDescription} />
      <meta name="twitter:image" content={image} />

      <meta name="theme-color" content="#006F5A" />

      {schemas.map((schema, i) => (
        <script key={i} type="application/ld+json">
          {JSON.stringify(schema)}
        </script>
      ))}
    </Helmet>
  );
};
