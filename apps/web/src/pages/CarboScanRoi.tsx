import React from 'react';
import { Helmet } from 'react-helmet-async';
import { CarboScanROIWizard } from '@/components/roi/CarboScanROIWizard';

const CarboScanRoiPage: React.FC = () => {
  return (
    <>
      <Helmet>
        <title>Calculateur ROI CarboScan — Retour sur investissement plateforme</title>
        <meta
          name="description"
          content="Estimez le ROI de CarboScan : efficacité reporting, croissance business, accès au capital et risques évités. Calculateur multi-devises."
        />
        <link rel="canonical" href="https://carboscan.io/calculateur-roi" />
      </Helmet>
      <CarboScanROIWizard />
    </>
  );
};

export default CarboScanRoiPage;
