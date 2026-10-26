import { verifierConfig } from "@cbam-verifier";
export const SITE_URL = 'https://carboscan.io';
export const SITE_NAME = 'CarboScan';
export const DEFAULT_OG_IMAGE = `${SITE_URL}/brand/carboscan-logo-light.png`;
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
  [verifierConfig.path]: { path: verifierConfig.path, title: verifierConfig.seo.title, description: verifierConfig.seo.description, breadcrumbs: [{ name: "Accueil", path: "/" }, { name: verifierConfig.intro.badge, path: verifierConfig.path }] },
  "/ateliers-internes": { path: "/ateliers-internes", title: "Ateliers climat en entreprise en Tunisie | CarboScan", description: "Sensibilisez vos équipes aux enjeux carbone grâce aux ateliers internes CarboScan. Découvrez les formats et préparez votre programme en Tunisie." },
  "/strategie-decarbonation": { path: "/strategie-decarbonation", title: "Stratégie de décarbonation en Tunisie | CarboScan", description: "Construisez votre stratégie de décarbonation : identifiez vos postes d’émissions, priorisez vos actions et suivez leur mise en œuvre avec CarboScan." },
  "/plan-essentiel": { path: "/plan-essentiel", title: "Plan Essentiel : démarrer votre bilan carbone | CarboScan", description: "Découvrez le Plan Essentiel CarboScan pour structurer la collecte de vos données et démarrer le bilan carbone de votre entreprise." },
  "/carbo-pro": { path: "/carbo-pro", title: "Carbo Pro : bilan carbone professionnel | CarboScan", description: "Découvrez Carbo Pro et ses fonctionnalités pour organiser vos données carbone, réaliser vos calculs et préparer votre reporting professionnel." },
  "/carbo-omnibus": { path: "/carbo-omnibus", title: "Carbo Omnibus : reporting et données carbone | CarboScan", description: "Découvrez l’offre Carbo Omnibus pour structurer les données carbone de votre entreprise et préparer votre démarche de reporting." },
  "/premium": { path: "/premium", title: "Offre Premium pour votre démarche carbone | CarboScan", description: "Explorez l’offre Premium CarboScan et échangez avec notre équipe pour adapter les outils et l’accompagnement à votre organisation." },
  "/empreinte-produit-calculator": { path: "/empreinte-produit-calculator", title: "Calculateur d’empreinte carbone produit | CarboScan", description: "Estimez l’empreinte carbone de vos produits à partir de leurs matériaux et données d’activité. Découvrez le calculateur produit CarboScan." },
  "/simulateur-economique": { path: "/simulateur-economique", title: "Simulateur économique de décarbonation | CarboScan", description: "Explorez les scénarios économiques de vos actions de décarbonation avec le simulateur CarboScan et préparez vos décisions d’investissement." },
  "/carboscan-academy": { path: "/carboscan-academy", title: "CarboScan Academy : apprendre le bilan carbone", description: "Découvrez CarboScan Academy pour développer vos compétences en mesure des émissions, collecte de données et décarbonation des entreprises." },
  "/autres-services": { path: "/autres-services", title: "Services carbone et accompagnement en Tunisie | CarboScan", description: "Découvrez les services complémentaires CarboScan pour accompagner vos équipes et vos projets de transition bas carbone en Tunisie." },
  "/emission-factors": { path: "/emission-factors", title: "Bibliothèque de facteurs d’émission | CarboScan", description: "Consultez la bibliothèque de facteurs d’émission CarboScan pour documenter vos calculs carbone et retrouver les sources méthodologiques." },
  "/calculateur-roi": { path: "/calculateur-roi", title: "Calculateur ROI de votre projet carbone | CarboScan", description: "Évaluez le retour sur investissement de votre démarche carbone avec le calculateur ROI CarboScan et comparez vos hypothèses économiques." },
  '/': {
    path: '/',
    title: "CarboScan | Bilan carbone et CBAM en Tunisie",
    description:
      "Mesurez vos émissions (scopes 1-2-3), préparez votre conformité CBAM et réduisez votre empreinte carbone. Plateforme tunisienne, Label Startup.",
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
    title: "Équipe CarboScan : Kamel Talbi, fondateur",
    description:
      "Découvrez Kamel Talbi, fondateur de CarboScan, et l’équipe qui accompagne les entreprises dans leur transition bas carbone.",
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
    title: "Prestataire bilan carbone en Tunisie | CarboScan",
    description:
      "Réalisez votre bilan carbone scopes 1-2-3 avec un expert et une plateforme dédiée en Tunisie. Livrables alignés sur le GHG Protocol.",
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: 'Bilan carbone', path: '/bilan-carbone' },
    ],
  },
  '/facteurs-emission': {
    path: '/facteurs-emission',
    title: "Facteurs d'émission carbone | CarboScan",
    description:
      "Explorez plus de 10 000 facteurs d'émission référencés et documentés dans CarboScan : ADEME, UK Government et nouvelles sources en cours d'intégration.",
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Plateforme', path: '/bilan-carbone' },
      { name: "Facteurs d'émission", path: '/facteurs-emission' },
    ],
  },
  '/empreinte-produit': {
    path: '/empreinte-produit',
    title: 'Empreinte Produit (PCF) — Calcul carbone produit | CarboScan',
    description:
      'Calculez l’empreinte carbone de vos produits (Product Carbon Footprint) : cradle-to-gate, données d’activité et rapports PCF.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
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
      { name: 'Solutions', path: '/solutions' },
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
      { name: 'Solutions', path: '/solutions' },
      { name: 'Collecte', path: '/collect' },
    ],
  },
  '/engagement-fournisseurs': {
    path: '/engagement-fournisseurs',
    title: 'Engagement fournisseurs — Scope 3 & supply chain | CarboScan',
    description:
      'Engagez votre chaîne d’approvisionnement : invitez vos fournisseurs, collectez leurs données carbone et fiabilisez votre Scope 3 avec CarboScan.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Plateforme', path: '/bilan-carbone' },
      { name: 'Engagement fournisseurs', path: '/engagement-fournisseurs' },
    ],
  },
  '/cbam-calculator': {
    path: '/cbam-calculator',
    title: 'Calculateur CBAM : coût carbone à l’export | CarboScan',
    description: 'Estimez le coût CBAM de vos exportations vers l’Union européenne selon votre secteur et vos volumes. Accès avec un abonnement compatible.',
  },
  '/cbam': {
    path: '/cbam',
    title: "CBAM Tunisie et Maroc : guide de conformité des exportateurs",
    description:
      "Exportateurs vers l’UE : qui est concerné par le CBAM, calendrier, données à fournir à vos clients européens. Estimez votre coût carbone.",
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: 'CBAM', path: '/cbam' },
    ],
  },
  '/wattbim': {
    path: '/wattbim',
    title: 'WattBim by CarboScan — Gérez vos bâtiments et vos économies d’énergie',
    description:
      'WattBim, le module énergie & bâtiments de CarboScan : pilotez la consommation de chaque bâtiment et reliez-la à votre bilan Scope 2.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
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
      { name: 'Solutions', path: '/solutions' },
      { name: 'Monitoring & Réduction', path: '/decarbotech' },
    ],
  },
  '/bilan-gratuit': {
    path: '/bilan-gratuit',
    title: 'Diagnostic Carbone 360° gratuit | CarboScan',
    description:
      'Évaluez gratuitement la maturité carbone de votre entreprise, la qualité de vos données et identifiez vos 3 priorités d’action avec CarboScan.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Diagnostic carbone', path: '/bilan-gratuit' },
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
    title: "Formation bilan carbone en Tunisie et au Maghreb | CarboScan",
    description:
      "Formez vos équipes au bilan carbone, au GHG Protocol et au CBAM. Formations en présentiel et à distance pour entreprises tunisiennes.",
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Formation', path: '/formation-bilan-carbone' },
    ],
  },
  '/solutions': {
    path: '/solutions',
    title: 'Solutions bilan carbone par secteur | CarboScan',
    description:
      'Pages solutions CarboScan : industrie, transport, BTP, agroalimentaire, énergie, finance, services, plus bilan GES, collecte, PCF, ACV, CBAM et WattBim.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
    ],
  },
  '/solutions/solutions': {
    path: '/solutions/solutions',
    title: 'Catalogue solutions carbone — Scopes 1, 2 et 3 | CarboScan',
    description:
      'Leviers de réduction par scope GHG Protocol : combustion, électricité, achats, transport et déchets. Catalogue des solutions CarboScan.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: 'Catalogue', path: '/solutions/solutions' },
    ],
  },
  '/solutions/accompagnement': {
    path: '/solutions/accompagnement',
    title: 'Accompagnement décarbonation — diagnostic et plan d’actions | CarboScan',
    description:
      'Accompagnement CarboScan : analyse des postes d’émissions, co-construction du plan, mise en œuvre et suivi des réductions.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: 'Accompagnement', path: '/solutions/accompagnement' },
    ],
  },
  '/bilan-carbone-industrie': {
    path: '/bilan-carbone-industrie',
    title: "Bilan carbone industrie et exportateurs | CarboScan",
    description:
      "Industries et exportateurs en Tunisie : mesurez vos émissions scopes 1-2-3, identifiez vos leviers de réduction et préparez vos données CBAM.",
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: 'Industrie', path: '/bilan-carbone-industrie' },
    ],
  },
  '/bilan-carbone-transport': {
    path: '/bilan-carbone-transport',
    title: "Bilan carbone transport et logistique | CarboScan",
    description:
      "Mesurez les émissions de votre flotte et de votre logistique en Tunisie : carburants, fret et sous-traitance. Pilotez votre bilan carbone avec CarboScan.",
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: 'Transport', path: '/bilan-carbone-transport' },
    ],
  },
  '/bilan-carbone-btp': {
    path: '/bilan-carbone-btp',
    title: "Bilan carbone BTP et chantiers | CarboScan",
    description:
      "Entreprises du BTP en Tunisie : mesurez les émissions des matériaux, engins et chantiers. Structurez votre bilan carbone avec CarboScan.",
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: 'Construction', path: '/bilan-carbone-btp' },
    ],
  },
  '/bilan-carbone-agroalimentaire': {
    path: '/bilan-carbone-agroalimentaire',
    title: 'Bilan Carbone Agroalimentaire | Empreinte de la chaîne alimentaire - CarboScan',
    description:
      'Mesurez l’empreinte carbone de votre chaîne alimentaire. De la production agricole à la distribution, collecte et PCF avec CarboScan.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: 'Agroalimentaire', path: '/bilan-carbone-agroalimentaire' },
    ],
  },
  '/bilan-carbone-energie': {
    path: '/bilan-carbone-energie',
    title: 'Bilan Carbone Énergie | Transition énergétique et décarbonation - CarboScan',
    description:
      'Mesurez l’empreinte carbone de votre activité énergétique. Production, distribution, sites et reporting avec CarboScan.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: 'Énergie', path: '/bilan-carbone-energie' },
    ],
  },
  '/bilan-carbone-finance': {
    path: '/bilan-carbone-finance',
    title: 'PCAF & émissions financées — bilan carbone banques et assurances | CarboScan',
    description:
      'Calculez les émissions financées de votre portefeuille selon le standard PCAF (contreparties, encours, score qualité 1–5) et l’empreinte opérationnelle Scopes 1, 2 et 3.',
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: 'Finance', path: '/bilan-carbone-finance' },
    ],
  },
  '/bilan-carbone-services': {
    path: '/bilan-carbone-services',
    title: "Bilan carbone pour entreprises de services | CarboScan",
    description:
      "Entreprises de services en Tunisie : mesurez les émissions de vos bureaux, déplacements et achats. Préparez votre bilan carbone scopes 1-2-3.",
    breadcrumbs: [
      { name: 'Accueil', path: '/' },
      { name: 'Solutions', path: '/solutions' },
      { name: 'Services', path: '/bilan-carbone-services' },
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

  if (/^\/(app|superadmin|admin|auth|checkout|payment|onboarding|preview)(\/|$)/.test(normalized)) {
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
  founder: { '@type': 'Person', name: 'Kamel Talbi', sameAs: ['https://www.linkedin.com/in/kamel-talbi-kt-consulting/'] },
  address: { '@type': 'PostalAddress', addressLocality: 'Tunis', addressCountry: 'TN' },
  sameAs: ['https://www.linkedin.com/company/108125482/', 'https://www.facebook.com/p/CarboScan-61581484901115/'],
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
