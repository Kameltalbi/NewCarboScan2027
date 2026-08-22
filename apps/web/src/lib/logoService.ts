import { api } from '@/integrations/api/client';

export const getCompanyLogoUrl = async (): Promise<string | null> => {
  try {
    const { organization } = await api.getOrganization();
    return organization?.logoUrl ?? null;
  } catch (error) {
    console.error('Error in getCompanyLogoUrl:', error);
    return null;
  }
};
