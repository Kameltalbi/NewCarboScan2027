import React from 'react';
import { SectorLanding } from '@/components/seo/SectorLanding';
import { Landmark, CheckCircle2, Leaf, BarChart3 } from 'lucide-react';

const BilanCarboneFinance: React.FC = () => (
  <SectorLanding
    sectorKey="finance"
    sectorSlug="finance"
    benefitIcons={[
      <BarChart3 className="h-6 w-6 text-primary" />,
      <Landmark className="h-6 w-6 text-primary" />,
      <CheckCircle2 className="h-6 w-6 text-primary" />,
      <Leaf className="h-6 w-6 text-primary" />,
    ]}
  />
);

export default BilanCarboneFinance;
