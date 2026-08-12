// Types pour le système de checklist de collecte

export interface ChecklistItem {
  id: string;
  organization_id: string;
  poste_code: string;
  poste_name: string;
  scope: 1 | 2 | 3;
  is_mandatory: boolean;
  is_csrd_required: boolean;
  status: 'not_started' | 'in_progress' | 'completed';
  data_count: number;
  documents_needed?: string[];
  method_description?: string;
  example_text?: string;
  last_updated_at: string;
  created_at: string;
}

export interface CollectionProgress {
  organization_id: string;
  total_postes: number;
  mandatory_postes: number;
  completed_postes: number;
  completed_mandatory: number;
  completion_percentage: number;
  audit_status: 'insufficient' | 'partial' | 'audit_ready';
}

export interface ChecklistItemsByScope {
  scope: number;
  items: ChecklistItem[];
  completed: number;
  total: number;
  percentage: number;
}

export const AUDIT_STATUS_CONFIG = {
  insufficient: {
    label: 'Insuffisant',
    color: 'destructive' as const,
    icon: '❌',
    description: 'Données insuffisantes pour un bilan auditable',
    minPercentage: 0,
    maxPercentage: 39
  },
  partial: {
    label: 'Partiel',
    color: 'secondary' as const,
    icon: '⚠️',
    description: 'Bilan partiel - Quelques postes obligatoires manquants',
    minPercentage: 40,
    maxPercentage: 99
  },
  audit_ready: {
    label: 'Audit-ready',
    color: 'default' as const,
    icon: '✅',
    description: 'Toutes les données obligatoires sont collectées',
    minPercentage: 100,
    maxPercentage: 100
  }
} as const;

export const SCOPE_CONFIG = {
  1: {
    name: 'Scope 1',
    description: 'Émissions directes',
    color: 'bg-red-100 text-red-800 border-red-300',
    icon: '🏭'
  },
  2: {
    name: 'Scope 2',
    description: 'Émissions indirectes liées à l\'énergie',
    color: 'bg-orange-100 text-orange-800 border-orange-300',
    icon: '⚡'
  },
  3: {
    name: 'Scope 3',
    description: 'Autres émissions indirectes',
    color: 'bg-blue-100 text-blue-800 border-blue-300',
    icon: '🌍'
  }
} as const;
