import { logger } from '@/utils/logger';

interface CacheEntry {
  reportData: any;
  structuredContent: any;
  timestamp: number;
  dataHash: string;
}

const CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 heures en millisecondes
const CACHE_KEY_PREFIX = 'carbon_report_';

// Génère un hash simple pour les données du rapport
const generateDataHash = (reportData: any): string => {
  const dataString = JSON.stringify({
    companyInfo: reportData.companyInfo,
    emissions: reportData.emissions,
    categoryBreakdown: reportData.emissions?.categoryBreakdown
  });
  
  // Hash simple basé sur le contenu
  let hash = 0;
  for (let i = 0; i < dataString.length; i++) {
    const char = dataString.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convertir en 32bit integer
  }
  return hash.toString();
};

// Génère une clé de cache basée sur l'utilisateur et les données
const generateCacheKey = (userId: string, dataHash: string): string => {
  return `${CACHE_KEY_PREFIX}${userId}_${dataHash}`;
};

// Sauvegarde le rapport dans le cache
export const saveReportToCache = (
  userId: string, 
  reportData: any, 
  structuredContent: any
): void => {
  try {
    const dataHash = generateDataHash(reportData);
    const cacheKey = generateCacheKey(userId, dataHash);
    
    const cacheEntry: CacheEntry = {
      reportData,
      structuredContent,
      timestamp: Date.now(),
      dataHash
    };
    
    localStorage.setItem(cacheKey, JSON.stringify(cacheEntry));
    
    // Nettoyer les anciens caches pour cet utilisateur
    cleanOldCache(userId);
    
    // Cache saved
  } catch (error) {
    // Cache save error - silent
  }
};

// Récupère le rapport depuis le cache
export const getReportFromCache = (
  userId: string, 
  reportData: any
): any | null => {
  try {
    const dataHash = generateDataHash(reportData);
    const cacheKey = generateCacheKey(userId, dataHash);
    
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const cacheEntry: CacheEntry = JSON.parse(cached);
    
    // Vérifier si le cache n'a pas expiré
    if (Date.now() - cacheEntry.timestamp > CACHE_EXPIRY) {
      localStorage.removeItem(cacheKey);
      // Cache expired
      return null;
    }
    
    // Vérifier si les données correspondent toujours
    if (cacheEntry.dataHash !== dataHash) {
      localStorage.removeItem(cacheKey);
      // Cache invalidated
      return null;
    }
    
    // Cache hit
    return cacheEntry.structuredContent;
    
  } catch (error) {
    // Cache retrieval error - silent
    return null;
  }
};

// Nettoie les anciens caches pour un utilisateur
const cleanOldCache = (userId: string): void => {
  try {
    const now = Date.now();
    const keysToRemove: string[] = [];
    
    // Parcourir tous les éléments du localStorage
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(`${CACHE_KEY_PREFIX}${userId}`)) continue;
      
      try {
        const cached = localStorage.getItem(key);
        if (!cached) continue;
        
        const cacheEntry: CacheEntry = JSON.parse(cached);
        
        // Marquer pour suppression si expiré
        if (now - cacheEntry.timestamp > CACHE_EXPIRY) {
          keysToRemove.push(key);
        }
      } catch (e) {
        // Supprimer les entrées corrompues
        keysToRemove.push(key);
      }
    }
    
    // Supprimer les clés expirées
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      // Cache cleaned
    });
    
  } catch (error) {
    // Cache cleanup error - silent
  }
};

// Vide tout le cache des rapports pour un utilisateur
export const clearAllReportCache = (userId: string): void => {
  try {
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(`${CACHE_KEY_PREFIX}${userId}`)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    // Caches deleted
    
  } catch (error) {
    // Cache deletion error - silent
  }
};

// Obtient des statistiques sur le cache
export const getCacheStats = (userId: string): {
  count: number;
  totalSize: number;
  oldestEntry: number | null;
} => {
  let count = 0;
  let totalSize = 0;
  let oldestEntry: number | null = null;
  
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(`${CACHE_KEY_PREFIX}${userId}`)) continue;
      
      const cached = localStorage.getItem(key);
      if (!cached) continue;
      
      count++;
      totalSize += cached.length;
      
      try {
        const cacheEntry: CacheEntry = JSON.parse(cached);
        if (!oldestEntry || cacheEntry.timestamp < oldestEntry) {
          oldestEntry = cacheEntry.timestamp;
        }
      } catch (e) {
        // Ignorer les entrées corrompues
      }
    }
  } catch (error) {
    // Cache stats error - silent
  }
  
  return { count, totalSize, oldestEntry };
}; 