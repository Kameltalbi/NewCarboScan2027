import React from 'react';
import { SectorLanding } from '@/components/seo/SectorLanding';
import { Utensils, CheckCircle2, Leaf, BarChart3 } from 'lucide-react';

const BilanCarboneAgroalimentaire: React.FC = () => (
  <SectorLanding
    sectorKey="agroalimentaire"
    sectorSlug="agroalimentaire"
    benefitIcons={[
      <Utensils className="h-6 w-6 text-primary" />,
      <BarChart3 className="h-6 w-6 text-primary" />,
      <CheckCircle2 className="h-6 w-6 text-primary" />,
      <Leaf className="h-6 w-6 text-primary" />,
    ]}
  />
);

export default BilanCarboneAgroalimentaire;
