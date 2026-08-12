import { useState, useEffect } from 'react';
import { getCacheStats, clearAllReportCache } from '@/lib/reportCache';
import { supabase } from "@/integrations/api/client";

interface CacheStats {
  count: number;
  totalSize: number;
  oldestEntry: number | null;
  sizeInMB: number;
  hitRate?: number;
}

export const useCacheStats = () => {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshStats = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const cacheStats = getCacheStats(user.id);
      const sizeInMB = cacheStats.totalSize / (1024 * 1024);

      setStats({
        ...cacheStats,
        sizeInMB: Math.round(sizeInMB * 100) / 100
      });
    } catch (error) {
      console.error('Error fetching cache stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const clearCache = async (): Promise<boolean> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return false;

      clearAllReportCache(user.id);
      await refreshStats();
      return true;
    } catch (error) {
      console.error('Error clearing cache:', error);
      return false;
    }
  };

  useEffect(() => {
    refreshStats();
  }, []);

  return {
    stats,
    loading,
    refreshStats,
    clearCache
  };
}; 