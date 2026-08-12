/**
 * PAGE DE CONFIGURATION SCOPE 3
 * 
 * Permet aux utilisateurs d'activer/désactiver les 15 catégories GHG Protocol
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Scope3CategoryConfig } from '@/components/scope3/Scope3CategoryConfig';

export const Scope3ConfigPage: React.FC = () => {
  const navigate = useNavigate();
  
  return (
    <div className="container max-w-7xl mx-auto p-6 space-y-6">
      {/* Bouton retour */}
      <Button 
        variant="outline" 
        onClick={() => navigate('/app/collecte/nouvelle')}
        className="gap-2 bg-white border-slate-300 hover:bg-slate-50 shadow-sm"
      >
        <ArrowLeft className="h-4 w-4" />
        Retour à la saisie
      </Button>
      
      {/* Composant de configuration */}
      <Scope3CategoryConfig />
    </div>
  );
};

export default Scope3ConfigPage;
