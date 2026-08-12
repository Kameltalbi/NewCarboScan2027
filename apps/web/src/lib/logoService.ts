import { supabase } from "@/integrations/api/client";

export const getCompanyLogoUrl = async (): Promise<string | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase.storage
      .from('company-logos')
      .list(`${user.id}/`, {
        limit: 1,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) {
      console.error('Error loading logo:', error);
      return null;
    }

    if (data && data.length > 0) {
      const { data: urlData } = supabase.storage
        .from('company-logos')
        .getPublicUrl(`${user.id}/${data[0].name}`);
      
      return urlData.publicUrl;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getCompanyLogoUrl:', error);
    return null;
  }
}; 