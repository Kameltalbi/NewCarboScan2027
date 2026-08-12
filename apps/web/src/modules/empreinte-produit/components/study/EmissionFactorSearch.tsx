// Composant de recherche de facteurs d'émission pour le BOM et la fabrication
import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/api/client";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, X, Check } from 'lucide-react';

interface EmissionFactorResult {
  id: string;
  factor_name: string;
  emission_factor: number;
  unit: string;
  category: string;
  subcategory: string | null;
  source: string | null;
}

interface EmissionFactorSearchProps {
  onSelect: (factor: EmissionFactorResult) => void;
  onClose: () => void;
  initialSearch?: string;
}

const EmissionFactorSearch: React.FC<EmissionFactorSearchProps> = ({ onSelect, onClose, initialSearch = '' }) => {
  const [search, setSearch] = useState(initialSearch);

  const { data: factors, isLoading } = useQuery({
    queryKey: ['emission-factors-search'],
    staleTime: 1000 * 60 * 30,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('emission_factors')
        .select('id, factor_name, emission_factor, unit, category, subcategory, source')
        .order('factor_name');
      if (error) throw error;
      return data as EmissionFactorResult[];
    },
  });

  const filtered = useMemo(() => {
    if (!factors || !search.trim()) return factors?.slice(0, 20) || [];
    const q = search.toLowerCase();
    return factors
      .filter(f =>
        f.factor_name.toLowerCase().includes(q) ||
        f.category.toLowerCase().includes(q) ||
        (f.subcategory && f.subcategory.toLowerCase().includes(q))
      )
      .slice(0, 30);
  }, [factors, search]);

  return (
    <Card className="p-4 border-primary/30 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Search className="w-4 h-4" /> Rechercher un facteur d'émission
        </h4>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <Input
        value={search}
        onChange={e => setSearch(e.target.value)}
        placeholder="Rechercher par nom, catégorie..."
        className="h-8 text-sm"
        autoFocus
      />

      <div className="max-h-60 overflow-y-auto space-y-1">
        {isLoading ? (
          <p className="text-xs text-muted-foreground p-2">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-muted-foreground p-2">Aucun résultat</p>
        ) : (
          filtered.map(f => (
            <button
              key={f.id}
              onClick={() => onSelect(f)}
              className="w-full flex items-center justify-between p-2 rounded-md hover:bg-muted/50 text-left text-sm transition-colors"
            >
              <div className="flex-1 min-w-0">
                <p className="font-medium text-foreground truncate">{f.factor_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge variant="outline" className="text-[9px]">{f.category}</Badge>
                  {f.subcategory && <span className="text-[10px] text-muted-foreground">{f.subcategory}</span>}
                  {f.source && <span className="text-[10px] text-muted-foreground">· {f.source}</span>}
                </div>
              </div>
              <div className="text-right flex-shrink-0 ml-3">
                <p className="font-semibold text-foreground">{f.emission_factor}</p>
                <p className="text-[10px] text-muted-foreground">{f.unit}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </Card>
  );
};

export default EmissionFactorSearch;
