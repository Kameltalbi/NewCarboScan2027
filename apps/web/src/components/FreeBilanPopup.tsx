
import React from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface FreeBilanPopupProps {
  onClose: () => void;
}

export const FreeBilanPopup: React.FC<FreeBilanPopupProps> = ({ onClose }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black bg-opacity-50 animate-fadeIn">
      <div className="bg-[#1A1F2C] rounded-lg p-8 max-w-md w-full mx-4 relative shadow-2xl border border-gray-800">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
          aria-label="Fermer"
        >
          <X className="h-5 w-5" />
        </button>
        
        <div className="text-center space-y-6">
          <div className="mx-auto">
            <div className="h-16 w-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto">
              <svg className="h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                <path d="M12 16v-4"/>
                <path d="M12 8h.01"/>
              </svg>
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-2xl font-semibold text-white">
              Découvrez gratuitement votre impact carbone !
            </h3>
            
            <p className="text-gray-400">
              En quelques minutes, obtenez une première estimation de l'empreinte carbone de votre entreprise et identifiez vos principaux postes d'émission.
            </p>
          </div>
          
          <Button 
            className="w-full bg-[#4CAF50] text-white hover:bg-[#45a049] border border-[#3d8b40] font-medium py-2 px-6 rounded-[4px] transition-colors"
            onClick={() => {
              // Add action for the button
              onClose();
            }}
          >
            Lancer le diagnostic gratuit
          </Button>
        </div>
      </div>
    </div>
  );
};
