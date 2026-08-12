import React from 'react';
import { SectorLanding } from '@/components/seo/SectorLanding';
import { BarChart3, CheckCircle2, Leaf, Target } from 'lucide-react';

const BilanCarboneIndustrie: React.FC = () => (
  <SectorLanding
    sectorKey="industrie"
    sectorSlug="industrie"
    benefitIcons={[
      <BarChart3 className="h-6 w-6 text-primary" />,
      <Target className="h-6 w-6 text-primary" />,
      <CheckCircle2 className="h-6 w-6 text-primary" />,
      <Leaf className="h-6 w-6 text-primary" />,
    ]}
  />
);

export default BilanCarboneIndustrie;
