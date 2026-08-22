import { useState, useEffect } from 'react';
import { api } from "@/integrations/api/client";
import { useToast } from '@/hooks/use-toast';

export interface InventoryItem {
  id: string;
  project_id: string;
  phase: string;
  flow_type: 'input' | 'output';
  category: string;
  item: string;
  quantity: number;
  unit: string;
  location?: string;
  period_start?: string;
  period_end?: string;
  data_source: string;
  data_quality: number;
  custom_factor_id?: string;
  recycled_percentage?: number;
  supplier_country?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface InventorySettings {
  id?: string;
  project_id: string;
  period_year: number;
  location_default: string;
  scope_boundaries: string[];
  allocation_rule: string;
  cutoff_individual_threshold: number;
  cutoff_cumulative_threshold: number;
}

export const useACVInventory = (projectId?: string) => {
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [settings, setSettings] = useState<InventorySettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchInventory = async () => {
    if (!projectId) return;
    
    try {
      const { items } = await api.listAcvInventory(projectId);
      setInventory((items || []) as unknown as InventoryItem[]);
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger l'inventaire",
        variant: "destructive",
      });
    }
  };

  const addInventoryItem = async (item: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const { item: created } = await api.createAcvInventory(item);
      const data = created as unknown as InventoryItem;
      
      setInventory(prev => [data as InventoryItem, ...prev]);
      toast({
        title: "Succès",
        description: "Élément ajouté à l'inventaire",
      });
      
      return data;
    } catch (error) {
      console.error('Error adding inventory item:', error);
      toast({
        title: "Erreur",
        description: "Impossible d'ajouter l'élément",
        variant: "destructive",
      });
    }
  };

  const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
    try {
      const { item } = await api.patchAcvInventory(id, updates);
      const data = item as unknown as InventoryItem;
      
      setInventory(prev => prev.map(item => item.id === id ? data as InventoryItem : item));
      toast({
        title: "Succès",
        description: "Élément mis à jour",
      });
    } catch (error) {
      console.error('Error updating inventory item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour l'élément",
        variant: "destructive",
      });
    }
  };

  const deleteInventoryItem = async (id: string) => {
    try {
      await api.deleteAcvInventory(id);
      
      setInventory(prev => prev.filter(item => item.id !== id));
      toast({
        title: "Succès",
        description: "Élément supprimé",
      });
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer l'élément",
        variant: "destructive",
      });
    }
  };

  const getInventoryByCategory = (category: string) => {
    return inventory.filter(item => item.category === category);
  };

  const saveSettings = async (newSettings: Partial<InventorySettings>) => {
    if (!projectId) return;

    try {
      const settingsData = {
        project_id: projectId,
        ...newSettings,
      };

      const { item } = await api.putAcvInventorySettings(settingsData);
      setSettings(item as unknown as InventorySettings);
      
      toast({
        title: "Succès",
        description: "Paramètres sauvegardés",
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: "Erreur",
        description: "Impossible de sauvegarder les paramètres",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const loadData = async () => {
      if (!projectId) return;
      
      setLoading(true);
      await Promise.all([fetchInventory()]);
      setLoading(false);
    };

    loadData();
  }, [projectId]);

  // Debug inventory state changes removed — use React DevTools instead

  return {
    inventory,
    settings,
    loading,
    addInventoryItem,
    updateInventoryItem,
    deleteInventoryItem,
    getInventoryByCategory,
    saveSettings,
    getCompletionStats: () => ({ categories: [], overall: 0 }),
    refetch: fetchInventory,
  };
};