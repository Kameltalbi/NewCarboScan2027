import React from 'react';
import { MainHeader } from '@/components/MainHeader';
import { NewFooter } from '@/components/NewFooter';
import { PlanFeatureGuard } from '@/components/guards/PlanFeatureGuard';
import { CBAMQuestionnaire } from '@/components/cbam-calculator/CBAMQuestionnaire';

const CBAMCalculator: React.FC = () => {
  return (
    <PlanFeatureGuard 
      feature="canAccessCBAM" 
      featureName="le calculateur CBAM"
      description="Le calculateur CBAM vous permet d'estimer les taxes carbone aux frontières pour vos exportations vers l'Europe."
      upgradeMessage="Le calculateur CBAM est disponible à partir du Plan Complet (2400 DT/an). Contactez-nous pour une mise à niveau."
    >
      <div className="min-h-screen flex flex-col">
        <MainHeader />
        <main className="flex-grow">
          <CBAMQuestionnaire />
        </main>
        <NewFooter />
      </div>
    </PlanFeatureGuard>
  );
};

export default CBAMCalculator;