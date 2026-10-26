import React from 'react';
import { SEOHead } from '@/components/seo/SEOHead';
import { CarboScanROIWizard } from '@/components/roi/CarboScanROIWizard';

const CarboScanRoiPage: React.FC = () => {
  return (
    <>
      <SEOHead path="/calculateur-roi" />
      <h1 className="text-3xl font-bold text-center pt-8">Calculateur ROI de votre projet carbone</h1>
      <CarboScanROIWizard />
    </>
  );
};

export default CarboScanRoiPage;
