import React from 'react';
import { SectorLanding } from '@/components/seo/SectorLanding';
import { Zap, CheckCircle2, Leaf, BarChart3 } from 'lucide-react';

const BilanCarboneEnergie: React.FC = () => (
  <SectorLanding
    sectorKey="energie"
    sectorSlug="energie"
    benefitIcons={[
      <Zap className="h-6 w-6 text-primary" />,
      <BarChart3 className="h-6 w-6 text-primary" />,
      <CheckCircle2 className="h-6 w-6 text-primary" />,
      <Leaf className="h-6 w-6 text-primary" />,
    ]}
  />
);

export default BilanCarboneEnergie;
