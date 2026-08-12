// Composant : Guide détaillé pour collecter un poste spécifique

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { HelpCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import type { ChecklistItem } from '@/lib/types/collection-checklist';

interface CollectionGuideProps {
  item: ChecklistItem;
  onAddData?: () => void;
}

export const CollectionGuide = ({ item, onAddData }: CollectionGuideProps) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button variant="ghost" size="sm" className="w-full justify-start">
          <HelpCircle className="mr-2 h-4 w-4" />
          Comment collecter ces données ?
          {isOpen ? (
            <ChevronUp className="ml-auto h-4 w-4" />
          ) : (
            <ChevronDown className="ml-auto h-4 w-4" />
          )}
        </Button>
      </CollapsibleTrigger>

      <CollapsibleContent className="mt-2">
        <div className="p-4 space-y-4 bg-blue-50 border border-blue-200 rounded-lg">
          {/* Documents nécessaires */}
          {item.documents_needed && item.documents_needed.length > 0 && (
            <div>
              <h4 className="font-medium text-sm mb-2 flex items-center">
                <FileText className="mr-2 h-4 w-4" />
                📋 Documents nécessaires
              </h4>
              <ul className="list-disc pl-5 space-y-1 text-sm text-muted-foreground">
                {item.documents_needed.map((doc, index) => (
                  <li key={index}>{doc}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Méthode de calcul */}
          {item.method_description && (
            <div>
              <h4 className="font-medium text-sm mb-2">
                📊 Méthode de calcul
              </h4>
              <p className="text-sm text-muted-foreground bg-white p-3 rounded border">
                {item.method_description}
              </p>
            </div>
          )}

          {/* Exemple concret */}
          {item.example_text && (
            <div>
              <h4 className="font-medium text-sm mb-2">
                📝 Exemple de calcul
              </h4>
              <div className="text-sm bg-white p-3 rounded border border-green-200 bg-green-50">
                <code className="text-green-800">{item.example_text}</code>
              </div>
            </div>
          )}

          {/* Bouton d'action */}
          {onAddData && (
            <Button 
              onClick={onAddData} 
              className="w-full mt-4"
              size="sm"
            >
              ▶️ Ajouter ces données
            </Button>
          )}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
};
