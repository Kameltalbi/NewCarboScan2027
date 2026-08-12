import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Eye } from 'lucide-react';

export const ProduitDetail: React.FC = () => {
  return (
    <div className="p-6">
      <Card>
        <CardContent className="py-8">
          <p className="text-muted-foreground text-center">
            Sélectionnez un produit pour voir les détails.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
