import React from 'react';
import { SectorLanding } from '@/components/seo/SectorLanding';
import { Briefcase, CheckCircle2, Leaf, Building2 } from 'lucide-react';

const BilanCarboneServices: React.FC = () => (
  <SectorLanding
    sectorKey="services"
    sectorSlug="services"
    benefitIcons={[
      <Building2 className="h-6 w-6 text-primary" />,
      <Briefcase className="h-6 w-6 text-primary" />,
      <CheckCircle2 className="h-6 w-6 text-primary" />,
      <Leaf className="h-6 w-6 text-primary" />,
    ]}
  />
);

export default BilanCarboneServices;
