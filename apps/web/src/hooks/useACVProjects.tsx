import { useState, useEffect } from 'react';
import { api, getStoredUser } from "@/integrations/api/client";
import { ACVProject } from '@/types/acv';
import { useToast } from '@/hooks/use-toast';
import { analytics } from '@/lib/analytics';

export const useACVProjects = () => {
  const [projects, setProjects] = useState<ACVProject[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchProjects = async () => {
    try {
      const { items } = await api.listAcvProjects();
      setProjects((items || []) as unknown as ACVProject[]);
    } catch (error) {
      console.error('Error fetching ACV projects:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les projets ACV",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData: Omit<ACVProject, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
    try {
      const user = getStoredUser();
      if (!user) throw new Error('User not authenticated');

      const { item } = await api.createAcvProject({ ...projectData });
      const data = item as unknown as ACVProject;
      
      analytics.createProject('acv');
      setProjects(prev => [data, ...prev]);
      toast({
        title: "Succès",
        description: "Projet ACV créé avec succès",
      });
      
      return data;
    } catch (error) {
      console.error('Error creating ACV project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de créer le projet ACV",
        variant: "destructive",
      });
      throw error;
    }
  };

  const updateProject = async (id: string, updates: Partial<ACVProject>) => {
    try {
      const { item } = await api.patchAcvProject(id, updates);
      const data = item as unknown as ACVProject;
      
      setProjects(prev => prev.map(p => p.id === id ? data : p));
      toast({
        title: "Succès",
        description: "Projet ACV mis à jour",
      });
      
      return data;
    } catch (error) {
      console.error('Error updating ACV project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de mettre à jour le projet",
        variant: "destructive",
      });
      throw error;
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await api.deleteAcvProject(id);
      
      setProjects(prev => prev.filter(p => p.id !== id));
      toast({
        title: "Succès",
        description: "Projet ACV supprimé",
      });
    } catch (error) {
      console.error('Error deleting ACV project:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer le projet",
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  return {
    projects,
    loading,
    createProject,
    updateProject,
    deleteProject,
    refetch: fetchProjects,
  };
};