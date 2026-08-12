import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, Loader2 } from 'lucide-react';
import { useCBAMProducts } from '../hooks/useCBAMData';

const SECTOR_COLORS: Record<string, string> = {
  'Fer & Acier': 'bg-slate-100 text-slate-800',
  'Aluminium': 'bg-blue-100 text-blue-800',
  'Ciment': 'bg-amber-100 text-amber-800',
  'Engrais': 'bg-green-100 text-green-800',
  'Hydrogène': 'bg-purple-100 text-purple-800',
  'Électricité': 'bg-yellow-100 text-yellow-800',
};

export const CBAMProductsPage: React.FC = () => {
  const { data: products, isLoading } = useCBAMProducts();

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Produits CBAM</h1>
        <p className="text-muted-foreground">Catalogue des produits soumis au mécanisme CBAM de l'Union européenne.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle>Catalogue des produits</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code CN</TableHead>
                  <TableHead>Produit</TableHead>
                  <TableHead>Secteur</TableHead>
                  <TableHead>Unité</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products?.map(product => (
                  <TableRow key={product.id}>
                    <TableCell className="font-mono text-sm">{product.cn_code}</TableCell>
                    <TableCell className="font-medium">{product.name}</TableCell>
                    <TableCell>
                      <Badge className={SECTOR_COLORS[product.sector] || 'bg-muted text-muted-foreground'} variant="secondary">
                        {product.sector}
                      </Badge>
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Règlement CBAM (UE) 2023/956</strong></p>
            <p>Le mécanisme d'ajustement carbone aux frontières (CBAM) s'applique aux importations dans l'UE des secteurs : fer & acier, aluminium, ciment, engrais, hydrogène et électricité.</p>
            <p>Les importateurs doivent déclarer les émissions intrinsèques des marchandises importées et acheter des certificats CBAM correspondants.</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
