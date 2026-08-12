// Utilitaire de logging pour la production
// Désactive les logs en production, active en dev si DEBUG=true

const isDev = import.meta.env.DEV;
const isDebug = import.meta.env.VITE_DEBUG === 'true';

// Logger conditionnel - n'affiche que si en mode debug
export const logger = {
  // Logs de debug - uniquement en mode développement avec VITE_DEBUG=true
  debug: (...args: any[]) => {
    if (isDebug) console.log(...args);
  },
  
  // Logs d'information - uniquement en développement
  log: (...args: any[]) => {
    if (isDev && isDebug) console.log(...args);
  },
  
  // Logs importants - toujours en dev, jamais en prod
  info: (...args: any[]) => {
    if (isDev) console.info(...args);
  },
  
  // Warnings - toujours affichés en dev
  warn: (...args: any[]) => {
    if (isDev) console.warn(...args);
  },
  
  // Erreurs - toujours affichées
  error: (...args: any[]) => {
    console.error(...args);
  },
  
  // Performance timing - uniquement en debug
  time: (label: string) => {
    if (isDebug) console.time(label);
  },
  
  timeEnd: (label: string) => {
    if (isDebug) console.timeEnd(label);
  },
  
  // Groupes - uniquement en debug
  group: (label: string) => {
    if (isDebug) console.group(label);
  },
  
  groupEnd: () => {
    if (isDebug) console.groupEnd();
  },
};

// Export par défaut
export default logger;
