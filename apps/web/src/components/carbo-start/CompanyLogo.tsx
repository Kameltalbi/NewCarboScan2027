import React, { useState, useEffect } from 'react';
import { api } from '@/integrations/api/client';

interface CompanyLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const CompanyLogo: React.FC<CompanyLogoProps> = ({ size = 'md' }) => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);

  const sizeClasses = {
    sm: 'h-8 w-auto',
    md: 'h-10 w-auto',
    lg: 'h-12 w-auto',
    xl: 'h-16 w-auto'
  };

  useEffect(() => {
    loadLogo();
    
    // Écouter l'événement de mise à jour du logo
    const handleLogoUpdate = () => {
      
      loadLogo();
    };
    
    window.addEventListener('logoUpdated', handleLogoUpdate);
    
    return () => {
      window.removeEventListener('logoUpdated', handleLogoUpdate);
    };
  }, []);

  const loadLogo = async () => {
    try {
      const { organization } = await api.getOrganization();
      if (organization?.logoUrl) setLogoUrl(organization.logoUrl);
    } catch (error) {
      console.error('Error in loadLogo:', error);
    }
  };

  if (logoUrl) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={logoUrl}
          alt="Logo entreprise"
          className={`${sizeClasses[size]} max-w-32 object-contain`}
        />
      </div>
    );
  }

  // Afficher un placeholder avec le nom de l'entreprise si pas de logo
  return (
    <div className="flex items-center gap-2">
      <div className={`${sizeClasses[size]} flex items-center justify-center bg-primary/10 rounded px-3 py-1 border`}>
        <span className="text-sm font-medium text-primary">Mon Entreprise</span>
      </div>
    </div>
  );
};