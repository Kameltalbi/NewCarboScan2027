// Composant pour afficher un CTA d'activation de module
// Utilisé dans le dashboard quand un module n'est pas activé

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ModuleCTAProps {
  moduleSlug: 'bilan-carbone' | 'empreinte-produit' | 'acv';
  title: string;
  description: string;
}

const MODULE_INFO: Record<string, { title: string; description: string; link: string }> = {
  'bilan-carbone': {
    title: 'Bilan Carbone',
    description: 'Calculez l\'impact global de votre entreprise (Scopes 1, 2, 3)',
    link: '/bilan-carbone',
  },
  'empreinte-produit': {
    title: 'Empreinte Produit',
    description: 'Calculez l\'empreinte carbone de vos produits par unité fonctionnelle',
    link: '/empreinte-produit',
  },
  'acv': {
    title: 'ACV Simple',
    description: 'Analysez vos produits selon une logique cycle de vie simplifiée',
    link: '/acv-landing',
  },
};

export const ModuleCTA: React.FC<ModuleCTAProps> = ({ moduleSlug, title, description }) => {
  const navigate = useNavigate();
  const moduleInfo = MODULE_INFO[moduleSlug] || MODULE_INFO['bilan-carbone'];

  return (
    <Card className="border-dashed border-2 border-muted-foreground/25">
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center">
            <Lock className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <CardTitle className="text-lg">{title}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">
          Ce module n'est pas activé pour votre organisation.
        </p>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(moduleInfo.link)}
        >
          Découvrir {moduleInfo.title}
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </CardContent>
    </Card>
  );
};

