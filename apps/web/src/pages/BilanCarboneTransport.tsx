import React from 'react';
import { SectorLanding } from '@/components/seo/SectorLanding';
import { Truck, CheckCircle2, Leaf, BarChart3 } from 'lucide-react';

const BilanCarboneTransport: React.FC = () => (
  <SectorLanding
    sectorKey="transport"
    sectorSlug="transport"
    benefitIcons={[
      <BarChart3 className="h-6 w-6 text-primary" />,
      <Truck className="h-6 w-6 text-primary" />,
      <CheckCircle2 className="h-6 w-6 text-primary" />,
      <Leaf className="h-6 w-6 text-primary" />,
    ]}
  />
);

export default BilanCarboneTransport;
