import React from 'react';
import { AdaptiveCarbonQuestionnaire } from '@/components/questionnaire/AdaptiveCarbonQuestionnaire';
import { MainHeader } from '@/components/MainHeader';
import { NewFooter } from '@/components/NewFooter';

const AdaptiveCarbonCalculator: React.FC = () => {
  return (
    <div className="min-h-screen bg-background">
      <MainHeader />
      <main className="pt-20">
        <AdaptiveCarbonQuestionnaire />
      </main>
      <NewFooter />
    </div>
  );
};

export default AdaptiveCarbonCalculator;