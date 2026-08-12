
import { useState } from 'react';
import { generateCollecteExcel, uploadExcelToSupabase } from '@/utils/excelGenerator';
import { toast } from 'sonner';

export const useExcelDownload = () => {
  const [isGenerating, setIsGenerating] = useState(false);

  const downloadExcel = async () => {
    try {
      setIsGenerating(true);
      
      // Générer le fichier Excel (fonction asynchrone)
      const blob = await generateCollecteExcel();
      
      // Télécharger directement
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tableau-collecte-donnees-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success('Tableau de collecte téléchargé avec succès !');
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
      toast.error('Erreur lors du téléchargement du tableau');
    } finally {
      setIsGenerating(false);
    }
  };

  const uploadAndGetUrl = async (): Promise<string | null> => {
    try {
      setIsGenerating(true);
      
      // Générer le fichier Excel (fonction asynchrone)
      const blob = await generateCollecteExcel();
      
      // Uploader vers Supabase
      const url = await uploadExcelToSupabase(blob);
      
      if (url) {
        toast.success('Tableau uploadé avec succès !');
        return url;
      } else {
        toast.error('Erreur lors de l\'upload du tableau');
        return null;
      }
    } catch (error) {
      console.error('Erreur lors de l\'upload:', error);
      toast.error('Erreur lors de l\'upload du tableau');
      return null;
    } finally {
      setIsGenerating(false);
    }
  };

  return {
    downloadExcel,
    uploadAndGetUrl,
    isGenerating
  };
};
