import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { ActivityDataCollector } from '@/modules/collect/components/ActivityDataCollector';

export const CollecteNouvelle: React.FC = () => {
  const [searchParams] = useSearchParams();
  const mode = searchParams.get('mode') || undefined;

  // Le mode guidé est géré directement via l'URL: ?mode=bilan-carbone|produit|acv
  return <ActivityDataCollector />;
};

