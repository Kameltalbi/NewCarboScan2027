import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Database, Info } from 'lucide-react';
import { supabase } from "@/integrations/api/client";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';

interface EmissionFactorsStats {
  total: number;
  categories: number;
  lastUpdated: string | null;
}

export const EmissionFactorsBadge: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<EmissionFactorsStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Get total count
        const { count: totalCount, error: countError } = await supabase
          .from('emission_factors')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;

        // Get number of unique categories
        const { data: categories, error: catError } = await supabase
          .from('emission_factors')
          .select('category')
          .order('category');

        if (catError) throw catError;

        const uniqueCategories = new Set(categories?.map(c => c.category)).size;

        // Get last updated (most recent updated_at)
        const { data: lastUpdate, error: updateError } = await supabase
          .from('emission_factors')
          .select('updated_at')
          .order('updated_at', { ascending: false })
          .limit(1);

        if (updateError) throw updateError;

        setStats({
          total: totalCount || 0,
          categories: uniqueCategories,
          lastUpdated: lastUpdate?.[0]?.updated_at || null
        });
      } catch (error) {
        console.error('Error fetching emission factors stats:', error);
        setStats({ total: 0, categories: 0, lastUpdated: null });
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-48"></div>
      </div>
    );
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Non disponible';
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <TooltipProvider>
      <div className="flex items-center gap-2">
        <Badge 
          variant="secondary" 
          className="bg-blue-50 text-blue-700 border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => navigate('/emission-factors')}
        >
          <Database className="h-3 w-3 mr-1" />
          {stats?.total || 0} facteurs d'émission
        </Badge>
        <Badge
          variant="secondary"
          className="bg-emerald-50 text-emerald-700 border-emerald-200"
        >
          Base ADEME v23.9
        </Badge>
        
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4 text-gray-400 hover:text-gray-600" />
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-sm">
            <div className="text-xs space-y-1">
              <div><strong>Total:</strong> {stats?.total || 0} facteurs</div>
              <div><strong>Catégories:</strong> {stats?.categories || 0}</div>
              <div><strong>Dernière MAJ:</strong> {formatDate(stats?.lastUpdated)}</div>
              <div className="text-gray-500 mt-2">
                Base de données des facteurs d'émission pour calculs carbone précis
              </div>
              <div className="text-blue-600 mt-2 font-medium">
                👆 Cliquez pour voir les détails
              </div>
            </div>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
}; 