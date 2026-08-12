import React from 'react';
import { MainHeader } from '@/components/MainHeader';
import { NewFooter } from '@/components/NewFooter';
import { Badge } from '@/components/ui/badge';
import { Helmet } from 'react-helmet-async';

interface ChangelogEntry {
  version: string;
  date: string;
  type: 'feature' | 'improvement' | 'fix';
  items: string[];
}

const changelog: ChangelogEntry[] = [
  {
    version: '2.5.0',
    date: '2026-03-18',
    type: 'feature',
    items: [
      'Onboarding wizard pour les nouveaux utilisateurs',
      'Centre de notifications in-app',
      'Landing pages SEO par secteur (Industrie, Transport, BTP, Agroalimentaire, Énergie)',
      'Bandeau cookies RGPD',
      'Monitoring d\'erreurs intégré',
      'Dark mode complet avec tokens personnalisés',
    ],
  },
  {
    version: '2.4.0',
    date: '2026-03-10',
    type: 'feature',
    items: [
      'Module fournisseurs avec scoring carbone',
      'Collecte périodique automatisée',
      'Commentaires et collaboration sur les données',
      'Export Excel multi-format',
    ],
  },
  {
    version: '2.3.0',
    date: '2026-02-20',
    type: 'improvement',
    items: [
      'Performance : réduction de 70% des re-renders',
      'Suppression de 594 console.log en production',
      'Lazy loading sur toutes les routes',
      'Tests unitaires : 260+ tests',
    ],
  },
  {
    version: '2.2.0',
    date: '2026-02-01',
    type: 'feature',
    items: [
      'Module ACV complet (Analyse Cycle de Vie)',
      'Calculateur CBAM',
      'Simulateur économique',
      'CarboScan Academy',
    ],
  },
];

const typeColors: Record<string, string> = {
  feature: 'bg-primary/10 text-primary',
  improvement: 'bg-blue-500/10 text-blue-600',
  fix: 'bg-amber-500/10 text-amber-600',
};

const typeLabels: Record<string, string> = {
  feature: 'Nouveauté',
  improvement: 'Amélioration',
  fix: 'Correctif',
};

const Changelog: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Changelog - Nouveautés CarboScan</title>
        <meta name="description" content="Découvrez les dernières mises à jour et nouvelles fonctionnalités de CarboScan, la plateforme de bilan carbone." />
      </Helmet>

      <MainHeader />

      <main id="main-content" className="py-20">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="text-center mb-16">
            <h1 className="text-4xl font-bold text-foreground mb-4">Changelog</h1>
            <p className="text-lg text-muted-foreground">
              Les dernières mises à jour et améliorations de CarboScan
            </p>
          </div>

          <div className="space-y-12">
            {changelog.map((entry, i) => (
              <div key={i} className="relative pl-8 border-l-2 border-border">
                <div className="absolute -left-2.5 top-0 h-5 w-5 rounded-full bg-primary border-4 border-background" />
                
                <div className="flex items-center gap-3 mb-3">
                  <span className="font-mono font-bold text-foreground text-lg">v{entry.version}</span>
                  <Badge variant="secondary" className={typeColors[entry.type]}>
                    {typeLabels[entry.type]}
                  </Badge>
                  <span className="text-sm text-muted-foreground">{entry.date}</span>
                </div>

                <ul className="space-y-2">
                  {entry.items.map((item, j) => (
                    <li key={j} className="text-muted-foreground flex items-start gap-2">
                      <span className="text-primary mt-1.5">•</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </main>

      <NewFooter />
    </>
  );
};

export default Changelog;
