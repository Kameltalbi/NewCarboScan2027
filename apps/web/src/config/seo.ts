export const SITE_URL = 'https://carboscan.io';
export const SITE_NAME = 'CarboScan';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/logos/CarboScan-logo.png`;
export const TWITTER_HANDLE = '@carboscan';
export const DEFAULT_LOCALE = 'fr_FR';

export type PageSEO = {
  path: string;
  title: string;
  description: string;
  ogType?: 'website' | 'article';
  noindex?: boolean;
  breadcrumbs?: { name: string; path: string }[];
};

/** Unique SEO metadata for public marketing pages */
export const PAGE_SEO: Record<string, PageSEO> = {
  '/': {
    path: '/',
    title: 'CarboScan — Plateforme Bilan Carbone & Décarbonation pour entreprises',
    description:
      'Mesurez, pilotez et réduisez vos émissions GES. Collecte de données, bilan carbone scopes 1-2-3, empreinte produit, ACV et rapports professionnels alignés GHG Protocol.',
    breadcrumbs: [{ name: 'Accueil', path: '/' }],
  },
  '/about': {
    path: '/about',
    title: 'À propos de CarboScan — Mission climat & expertise carbone',
    description:
      'Découvrez CarboScan, la plateforme SaaS carbone conçue pour les PME et consultants : méthodologie GHG Protocol, accompagnement expert et outils de décarbonation.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'À propos', path: '/about' },
    ],
  },
  '/team': {
    path: '/team',
    title: 'Équipe CarboScan — Experts carbone & produit',
    description:
      'Rencontrez l’équipe derrière CarboScan : experts bilan carbone, data et produit au service de la transition bas carbone des entreprises.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Équipe', path: '/team' },
    ],
  },
  '/contact': {
    path: '/contact',
    title: 'Contact CarboScan — Parlez à un expert carbone',
    description:
      'Contactez l’équipe CarboScan pour un devis, une question produit ou un accompagnement bilan carbone. Réponse rapide par nos experts.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Contact', path: '/contact' },
    ],
  },
  '/pricing': {
    path: '/pricing',
    title: 'Tarifs CarboScan — Modules bilan carbone à la carte',
    description:
      'Configurez votre offre CarboScan : collecte, bilan carbone, empreinte produit, ACV, Net Zero, CBAM. Tarification modulaire adaptée aux PME.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Tarifs', path: '/pricing' },
    ],
  },
  '/demo': {
    path: '/demo',
    title: 'Demander une démo CarboScan — Démonstration plateforme carbone',
    description:
      'Réservez une démo personnalisée de CarboScan : collecte de données, calculs GHG, rapports et plan de décarbonation en 30 minutes.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Démo', path: '/demo' },
    ],
  },
  '/faq': {
    path: '/faq',
    title: 'FAQ CarboScan — Questions sur le bilan carbone & la plateforme',
    description:
      'Réponses aux questions fréquentes sur CarboScan : bilan carbone, scopes GHG, tarifs, sécurité des données et secteurs couverts.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'FAQ', path: '/faq' },
    ],
  },
  '/blog': {
    path: '/blog',
    title: 'Blog CarboScan — Actualités carbone, CSRD & décarbonation',
    description:
      'Articles et guides pratiques sur le bilan carbone, le GHG Protocol, la CSRD, le CBAM et la réduction des émissions pour les entreprises.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Blog', path: '/blog' },
    ],
  },
  '/bilan-carbone': {
    path: '/bilan-carbone',
    title: 'Bilan Carbone entreprise — Module CarboScan scopes 1, 2 & 3',
    description:
      'Réalisez votre bilan carbone professionnel avec CarboScan : facteurs ADEME, scopes 1-2-3, traçabilité et rapports prêts pour consultants.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Bilan carbone', path: '/bilan-carbone' },
    ],
  },
  '/empreinte-produit': {
    path: '/empreinte-produit',
    title: 'Empreinte Produit (PCF) — Calcul carbone produit | CarboScan',
    description:
      'Calculez l’empreinte carbone de vos produits (Product Carbon Footprint) : cradle-to-gate, données d’activité et rapports PCF.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Empreinte produit', path: '/empreinte-produit' },
    ],
  },
  '/acv-landing': {
    path: '/acv-landing',
    title: 'ACV — Analyse du Cycle de Vie simplifiée | CarboScan',
    description:
      'Module ACV CarboScan : analyse du cycle de vie produit, inventaires, impacts et export pour vos études environnementales.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'ACV', path: '/acv-landing' },
    ],
  },
  '/collect': {
    path: '/collect',
    title: 'Collecte de données carbone — Socle CarboScan Collect',
    description:
      'Centralisez énergie, déplacements, achats et déchets. Import Excel, saisie guidée et validation pour un bilan carbone fiable.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Collecte', path: '/collect' },
    ],
  },
  '/cbam': {
    path: '/cbam',
    title: 'CBAM — Reporting export UE & conformité | CarboScan',
    description:
      'Préparez vos déclarations CBAM : émissions embarquées, codes CN, exports et rapports pour le mécanisme d’ajustement carbone aux frontières.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'CBAM', path: '/cbam' },
    ],
  },
  '/wattbim': {
    path: '/wattbim',
    title: 'WattBim — Suivi énergie IoT & carbone temps réel | CarboScan',
    description:
      'Connectez vos compteurs et suivez la consommation énergétique en temps réel avec WattBim pour piloter vos émissions Scope 2.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'WattBim', path: '/wattbim' },
    ],
  },
  '/decarbotech': {
    path: '/decarbotech',
    title: 'Decarbotech — Solutions de décarbonation industrielle | CarboScan',
    description:
      'Explorez Decarbotech : leviers technologiques et plan d’actions pour réduire l’empreinte carbone industrielle.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Decarbotech', path: '/decarbotech' },
    ],
  },
  '/bilan-gratuit': {
    path: '/bilan-gratuit',
    title: 'Bilan carbone gratuit — Estimateur express CarboScan',
    description:
      'Estimez gratuitement l’empreinte carbone de votre entreprise en quelques minutes. Première étape vers un bilan carbone complet.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Bilan gratuit', path: '/bilan-gratuit' },
    ],
  },
  '/auth': {
    path: '/auth',
    title: 'Connexion CarboScan — Accéder à votre espace carbone',
    description: 'Connectez-vous à votre compte CarboScan pour gérer collectes, bilans carbone et rapports.',
    noindex: true,
  },
  '/inscription': {
    path: '/inscription',
    title: 'Inscription CarboScan — Créer votre compte entreprise',
    description:
      'Créez votre compte CarboScan et démarrez la mesure de vos émissions GES. Inscription simple pour PME et consultants.',
  },
  '/checkout': {
    path: '/checkout',
    title: 'Checkout CarboScan — Finaliser votre commande',
    description: 'Finalisez votre commande CarboScan et activez vos modules carbone.',
    noindex: true,
  },
  '/legal-mentions': {
    path: '/legal-mentions',
    title: 'Mentions légales — CarboScan',
    description: 'Mentions légales du site et de la plateforme CarboScan.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Mentions légales', path: '/legal-mentions' },
    ],
  },
  '/privacy-policy': {
    path: '/privacy-policy',
    title: 'Politique de confidentialité — CarboScan',
    description:
      'Comment CarboScan collecte, utilise et protège vos données personnelles et données d’activité carbone.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Confidentialité', path: '/privacy-policy' },
    ],
  },
  '/cgv': {
    path: '/cgv',
    title: 'Conditions générales de vente — CarboScan',
    description: 'Conditions générales de vente des services et modules CarboScan.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'CGV', path: '/cgv' },
    ],
  },
  '/comment-ca-marche': {
    path: '/comment-ca-marche',
    title: 'Comment ça marche — Parcours CarboScan',
    description:
      'Comprenez le parcours CarboScan : collecte, calcul bilan carbone, rapports et plan de décarbonation.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Comment ça marche', path: '/comment-ca-marche' },
    ],
  },
  '/developers': {
    path: '/developers',
    title: 'API & Développeurs — CarboScan',
    description:
      'Documentation API CarboScan pour intégrer collecte, calculs carbone et facteurs d’émission à vos systèmes.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Développeurs', path: '/developers' },
    ],
  },
  '/changelog': {
    path: '/changelog',
    title: 'Changelog CarboScan — Nouveautés produit',
    description: 'Suivez les évolutions de la plateforme CarboScan : modules, rapports et améliorations UX.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Changelog', path: '/changelog' },
    ],
  },
  '/formation-bilan-carbone': {
    path: '/formation-bilan-carbone',
    title: 'Formation Bilan Carbone — CarboScan Academy',
    description:
      'Formez vos équipes au bilan carbone et à l’usage de CarboScan avec nos programmes Academy.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Formation', path: '/formation-bilan-carbone' },
    ],
  },
  '/solutions': {
    path: '/solutions',
    title: 'Solutions carbone — CarboScan pour tous les secteurs',
    description:
      'Solutions CarboScan pour mesurer et réduire l’empreinte carbone selon votre secteur et vos enjeux réglementaires.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
    ],
  },
  '/bilan-carbone-industrie': {
    path: '/bilan-carbone-industrie',
    title: 'Bilan carbone industrie — CarboScan pour le secteur industriel',
    description:
      'Mesurez et réduisez les émissions industrielles : process, énergie, Scope 3 amont et plan de décarbonation.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Bilan carbone industrie', path: '/bilan-carbone-industrie' },
    ],
  },
  '/bilan-carbone-transport': {
    path: '/bilan-carbone-transport',
    title: 'Bilan carbone transport & logistique — CarboScan',
    description:
      'Bilan carbone pour le transport et la logistique : flottes, fret, carburants et trajectoire de réduction.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Bilan carbone transport', path: '/bilan-carbone-transport' },
    ],
  },
  '/bilan-carbone-btp': {
    path: '/bilan-carbone-btp',
    title: 'Bilan carbone BTP & construction — CarboScan',
    description:
      'Pilotez l’empreinte carbone du BTP : chantiers, matériaux, engins et reporting pour appels d’offres.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Bilan carbone BTP', path: '/bilan-carbone-btp' },
    ],
  },
  '/bilan-carbone-agroalimentaire': {
    path: '/bilan-carbone-agroalimentaire',
    title: 'Bilan carbone agroalimentaire — CarboScan',
    description:
      'Bilan carbone pour l’agroalimentaire : agriculture, process, packaging, froid et Scope 3 chaîne d’approvisionnement.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Bilan carbone agroalimentaire', path: '/bilan-carbone-agroalimentaire' },
    ],
  },
  '/bilan-carbone-energie': {
    path: '/bilan-carbone-energie',
    title: 'Bilan carbone énergie & utilities — CarboScan',
    description:
      'Mesurez les émissions du secteur énergie : production, réseaux, pertes et reporting réglementaire.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Bilan carbone énergie', path: '/bilan-carbone-energie' },
    ],
  },
};

export function getPageSEO(pathname: string): PageSEO {
  const normalized = pathname.replace(/\/$/, '') || '/';
  if (PAGE_SEO[normalized]) return PAGE_SEO[normalized];
  if (PAGE_SEO[pathname]) return PAGE_SEO[pathname];

  // Blog posts / dynamic
  if (normalized.startsWith('/blog/')) {
    return {
      path: normalized,
      title: 'Article — Blog CarboScan',
      description: 'Article du blog CarboScan sur le climat, le carbone et la décarbonation.',
      ogType: 'article',
      breadcrumbs: [
        { name: 'Accueil', path: '/' },
        { name: 'Blog', path: '/blog' },
        { name: 'Article', path: normalized },
      ],
    };
  }

  if (normalized.startsWith('/app')) {
    return {
      path: normalized,
      title: 'Application CarboScan',
      description: 'Espace applicatif CarboScan.',
      noindex: true,
    };
  }

  return {
    path: normalized,
    title: `${SITE_NAME} — Plateforme bilan carbone`,
    description:
      'CarboScan aide les entreprises à mesurer, piloter et réduire leurs émissions de gaz à effet de serre.',
  };
}

export const ORGANIZATION_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CarboScan',
  url: SITE_URL,
  logo: DEFAULT_OG_IMAGE,
  description:
    'Plateforme SaaS de bilan carbone, collecte de données GES et décarbonation pour entreprises.',
  sameAs: [],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'sales',
    url: `${SITE_URL}/contact`,
    availableLanguage: ['French', 'English', 'Arabic'],
  },
};

export const SOFTWARE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CarboScan',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web',
  url: SITE_URL,
  description:
    'Logiciel SaaS de mesure carbone : bilan GES scopes 1-2-3, empreinte produit, ACV, CBAM et reporting.',
  offers: {
    '@type': 'Offer',
    priceCurrency: 'TND',
    url: `${SITE_URL}/pricing`,
  },
  publisher: {
    '@type': 'Organization',
    name: 'CarboScan',
    url: SITE_URL,
  },
};

export const WEBSITE_SCHEMA = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'CarboScan',
  url: SITE_URL,
  inLanguage: 'fr-FR',
  publisher: {
    '@type': 'Organization',
    name: 'CarboScan',
    url: SITE_URL,
  },
  potentialAction: {
    '@type': 'SearchAction',
    target: `${SITE_URL}/blog?q={search_term_string}`,
    'query-input': 'required name=search_term_string',
  },
};

export function buildBreadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${SITE_URL}${item.path === '/' ? '' : item.path}`,
    })),
  };
}

export function buildFaqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  };
}
