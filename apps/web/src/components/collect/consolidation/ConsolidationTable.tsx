// Tableau des données consolidées
import React from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Building2, Filter, X } from 'lucide-react';

interface ConsolidatedDataItem {
  question_key: string;
  question_category: string;
  scope: number | null;
  total_value: number;
  unit: string | null;
  site_count: number;
  sources: Record<string, number> | null;
}

interface ConsolidationTableProps {
  data: ConsolidatedDataItem[];
  onCategoryFilter: (category: string | null) => void;
  selectedCategory: string | null;
}

export const ConsolidationTable: React.FC<ConsolidationTableProps> = ({
  data,
  onCategoryFilter,
  selectedCategory,
}) => {
  // Récupérer les catégories uniques
  const categories = [...new Set(data.map(d => d.question_category))].filter(Boolean);

  // Filtrer les données
  const filteredData = selectedCategory 
    ? data.filter(d => d.question_category === selectedCategory)
    : data;

  // Formater la valeur
  const formatValue = (value: number, unit: string | null) => {
    if (value === 0) return '0';
    
    const formatted = value >= 1000 
      ? value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })
      : value.toFixed(2);
    
    return unit ? `${formatted} ${unit}` : formatted;
  };

  // Formater le nom de la question
  const formatQuestionKey = (key: string) => {
    return key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  // Couleur du badge de scope
  const getScopeBadge = (scope: number | null) => {
    if (!scope) return null;
    const colors: Record<number, string> = {
      1: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
      2: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
      3: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
    };
    return (
      <Badge className={colors[scope] || ''}>
        Scope {scope}
      </Badge>
    );
  };

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Filtrer par catégorie:</span>
        </div>
        <Select 
          value={selectedCategory || 'all'} 
          onValueChange={(v) => onCategoryFilter(v === 'all' ? null : v)}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Toutes les catégories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes les catégories</SelectItem>
            {categories.map(cat => (
              <SelectItem key={cat} value={cat}>
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {selectedCategory && (
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => onCategoryFilter(null)}
          >
            <X className="h-4 w-4 mr-1" />
            Effacer
          </Button>
        )}
        <div className="ml-auto text-sm text-muted-foreground">
          {filteredData.length} indicateur(s)
        </div>
      </div>

      {/* Tableau */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="font-semibold">Indicateur</TableHead>
              <TableHead className="font-semibold">Catégorie</TableHead>
              <TableHead className="font-semibold">Scope</TableHead>
              <TableHead className="font-semibold text-right">Valeur totale</TableHead>
              <TableHead className="font-semibold text-center">
                <div className="flex items-center justify-center gap-1">
                  <Building2 className="h-4 w-4" />
                  Sites
                </div>
              </TableHead>
              <TableHead className="font-semibold">Sources</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Aucune donnée consolidée disponible
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item, idx) => (
                <TableRow key={`${item.question_key}-${idx}`}>
                  <TableCell className="font-medium">
                    {formatQuestionKey(item.question_key)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {item.question_category?.charAt(0).toUpperCase() + item.question_category?.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {getScopeBadge(item.scope)}
                  </TableCell>
                  <TableCell className="text-right font-mono font-semibold">
                    {formatValue(item.total_value, item.unit)}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {item.site_count}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.sources && (
                      <div className="flex gap-1 flex-wrap">
                        {Object.entries(item.sources).map(([source, count]) => (
                          <Badge key={source} variant="outline" className="text-xs">
                            {source}: {count}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
