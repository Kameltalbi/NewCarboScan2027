
import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, MessageSquare } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

type PopupV1Props = {
  onClose?: () => void;
};

export const PopupV1: React.FC<PopupV1Props> = ({ onClose }) => {
  const [isOpen, setIsOpen] = useState(false);
  const isMobile = useIsMobile();

  useEffect(() => {
    // Get visit count from localStorage or initialize it
    const visitCount = localStorage.getItem('visitCount') ? 
      parseInt(localStorage.getItem('visitCount') || '0') : 0;
    
    // Increment visit count
    const newVisitCount = visitCount + 1;
    localStorage.setItem('visitCount', newVisitCount.toString());
    
    // Show popup every 5 visits (1, 6, 11, etc.)
    if (newVisitCount % 5 === 1) {
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    if (onClose) onClose();
  };

  const handleWhatsAppClick = () => {
    window.open('https://wa.me/21698704385', '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md bg-[#1F2937] text-white border-none max-w-[85vw] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
            🎉 Bienvenue sur CarboScan !
          </DialogTitle>
        </DialogHeader>
        
        <div className="py-3 sm:py-4">
          <p className="text-white/90 text-sm sm:text-base">
            Nous lançons notre bêta ! Découvrez nos outils de calcul du bilan carbone et contactez-nous pour un accès privilégié.
          </p>
        </div>
        
        <DialogFooter className="flex flex-col sm:flex-row gap-2">
          <Button
            className="bg-[#25D366] hover:bg-[#20C059] text-white w-full sm:flex-1"
            onClick={handleWhatsAppClick}
          >
            <MessageSquare className="mr-2 h-4 w-4" />
            {isMobile ? "WhatsApp" : "Contactez-nous"}
          </Button>
          <Button
            variant="ghost"
            className="text-[#D1D5DB] hover:text-white hover:bg-gray-700 w-full sm:w-auto"
            onClick={handleClose}
          >
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default PopupV1;
