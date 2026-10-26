import React from 'react';
import { MainHeader } from '@/components/MainHeader';
import { NewFooter } from '@/components/NewFooter';
import { PlanFeatureGuard } from '@/components/guards/PlanFeatureGuard';
import { CBAMQuestionnaire } from '@/components/cbam-calculator/CBAMQuestionnaire';

const CBAMCalculator: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <main className="flex-grow container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold mb-6">Calculateur CBAM : estimez le coût carbone de vos exportations</h1>
        <p className="mb-4">Évaluez les émissions liées à vos exportations vers l’Union européenne selon votre secteur et vos volumes. L’accès au calculateur nécessite un compte et un abonnement compatible.</p>
        <a className="text-primary underline" href="/cbam">Comprendre les exigences CBAM pour les exportateurs tunisiens et marocains</a>
        <PlanFeatureGuard feature="canAccessCBAM" featureName="le calculateur CBAM">
          <CBAMQuestionnaire />
        </PlanFeatureGuard>
      </main>
      <NewFooter />
    </div>
  );
};

export default CBAMCalculator;
