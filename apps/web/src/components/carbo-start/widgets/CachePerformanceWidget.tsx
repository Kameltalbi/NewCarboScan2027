import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Database, Zap, HardDrive, Clock, Trash2 } from 'lucide-react';
import { useCacheStats } from '@/hooks/useCacheStats';
import { useToast } from '@/hooks/use-toast';

export const CachePerformanceWidget: React.FC = () => {
  const { stats, loading, clearCache } = useCacheStats();
  const { toast } = useToast();

  const handleClearCache = async () => {
    const success = await clearCache();
    if (success) {
      toast({
        title: "Cache vidé",
        description: "Le cache des rapports a été supprimé avec succès.",
      });
    } else {
      toast({
        title: "Erreur",
        description: "Impossible de vider le cache.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card className="h-40">
        <CardContent className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-600"></div>
        </CardContent>
      </Card>
    );
  }

  const formatAge = (timestamp: number | null) => {
    if (!timestamp) return 'N/A';
    const now = Date.now();
    const age = now - timestamp;
    const hours = Math.floor(age / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}j`;
    if (hours > 0) return `${hours}h`;
    return '<1h';
  };

  const getCacheStatus = () => {
    if (!stats || stats.count === 0) {
      return { color: 'gray', text: 'Aucun cache' };
    }
    if (stats.count <= 3) {
      return { color: 'green', text: 'Optimal' };
    }
    if (stats.count <= 8) {
      return { color: 'yellow', text: 'Modéré' };
    }
    return { color: 'red', text: 'Élevé' };
  };

  const cacheStatus = getCacheStatus();
  const hasCache = stats && stats.count > 0;

  return (
    <Card className="border-blue-200 bg-blue-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Zap className="h-4 w-4 text-blue-600" />
          Performance Rapports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Status Badge */}
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-600">Statut cache</span>
          <Badge 
            variant="outline" 
            className={`text-xs ${
              cacheStatus.color === 'green' ? 'border-green-500 text-green-700 bg-green-50' :
              cacheStatus.color === 'yellow' ? 'border-yellow-500 text-yellow-700 bg-yellow-50' :
              cacheStatus.color === 'red' ? 'border-red-500 text-red-700 bg-red-50' :
              'border-gray-500 text-gray-700 bg-gray-50'
            }`}
          >
            {cacheStatus.text}
          </Badge>
        </div>

        {/* Cache Stats */}
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <Database className="h-3 w-3 text-blue-600" />
            <div>
              <div className="font-medium">{stats?.count || 0}</div>
              <div className="text-gray-500">Rapports</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <HardDrive className="h-3 w-3 text-blue-600" />
            <div>
              <div className="font-medium">{stats?.sizeInMB || 0} MB</div>
              <div className="text-gray-500">Stockage</div>
            </div>
          </div>
        </div>

        {/* Performance Info */}
        {hasCache && (
          <div className="pt-2 border-t border-blue-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 flex items-center gap-1">
                <Clock className="h-3 w-3" />
                Plus ancien
              </span>
              <span className="font-medium text-blue-700">
                {formatAge(stats?.oldestEntry)}
              </span>
            </div>
            
            <div className="bg-green-100 border border-green-200 rounded p-2">
              <div className="text-xs text-green-700 font-medium">
                ⚡ Chargement instantané
              </div>
              <div className="text-xs text-green-600">
                Rapports identiques servis depuis le cache
              </div>
            </div>
          </div>
        )}

        {/* Clear Cache Button */}
        {hasCache && (
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearCache}
              className="w-full text-xs border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Vider le cache
            </Button>
          </div>
        )}

        {/* No Cache State */}
        {!hasCache && (
          <div className="text-center py-2">
            <div className="text-xs text-gray-500 mb-1">
              Aucun rapport en cache
            </div>
            <div className="text-xs text-blue-600">
              Le prochain rapport sera mis en cache automatiquement
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}; 