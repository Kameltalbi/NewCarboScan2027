import React from 'react';
import { EmpreinteProduitReportContent } from '@/components/empreinte-produit-report/EmpreinteProduitReportContent';

interface EmpreinteProduitReportGeneratorProps {
  formData?: any;
  emissionsResult?: any;
  emissionsData?: any;
  companyInfo?: any;
  onGenerate?: () => void;
  onClose?: () => void;
}

export const EmpreinteProduitReportGenerator: React.FC<EmpreinteProduitReportGeneratorProps> = (props) => {
  return <EmpreinteProduitReportContent {...props} />;
};