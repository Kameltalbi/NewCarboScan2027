import React, { useState, useEffect } from 'react';
import { X, Phone, Mail, MessageCircle } from 'lucide-react';
import { useLocation } from 'react-router-dom';

export const NotificationBanner = () => {
  const [isVisible, setIsVisible] = useState(false);
  const location = useLocation();

  useEffect(() => {
    // Ne s'affiche que sur la page du rapport carbone
    setIsVisible(location.pathname.includes('/empreinte-produit-report'));
  }, [location]);

  if (!isVisible) return null;

  return (
    <div className="bg-slate-800 text-white py-3 px-4 relative overflow-hidden">
      {/* Animation de défilement */}
      <div className="animate-marquee whitespace-nowrap">
        <div className="inline-flex items-center gap-6 text-sm font-medium">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            Votre bilan carbone sera révisé par un expert bas carbone et vous sera envoyé par mail dans les 48 heures ouvrables qui suivent.
          </span>
          <span className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            Pour toute information ou question, veuillez nous contacter par
          </span>
          <span className="flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </span>
          <span className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            email
          </span>
          <span className="flex items-center gap-2">
            <Phone className="h-4 w-4" />
            téléphone - tous disponibles sur notre page contact
          </span>
          {/* Répétition du message pour effet continu */}
          <span className="mx-8">•</span>
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
            Votre bilan carbone sera révisé par un expert bas carbone et vous sera envoyé par mail dans les 48 heures ouvrables qui suivent.
          </span>
        </div>
      </div>
      
      {/* Bouton fermer */}
      <button
        onClick={() => setIsVisible(false)}
        className="absolute right-4 top-1/2 -translate-y-1/2 p-1 hover:bg-slate-700 rounded-full transition-colors"
        aria-label="Fermer la notification"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};