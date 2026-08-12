import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { CollectSite } from '@/hooks/useCollectSites';

const siteFormSchema = z.object({
  name: z.string().min(1, 'Le nom est requis'),
  code: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  site_type: z.string().optional(),
  surface_m2: z.coerce.number().optional(),
  employees_count: z.coerce.number().optional(),
  contact_name: z.string().optional(),
  contact_email: z.string().email().optional().or(z.literal('')),
  is_active: z.boolean(),
  is_consolidated: z.boolean(),
});

type SiteFormValues = z.infer<typeof siteFormSchema>;

interface SiteFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  site?: CollectSite;
  companyId: string;
  onSubmit: (data: SiteFormValues & { company_id: string }) => void;
  isLoading?: boolean;
}

const siteTypes = [
  { value: 'usine', label: 'Usine' },
  { value: 'bureau', label: 'Bureau' },
  { value: 'entrepot', label: 'Entrepôt' },
  { value: 'magasin', label: 'Magasin' },
  { value: 'siege', label: 'Siège social' },
  { value: 'autre', label: 'Autre' },
];

export const SiteFormModal: React.FC<SiteFormModalProps> = ({
  open,
  onOpenChange,
  site,
  companyId,
  onSubmit,
  isLoading,
}) => {
  const form = useForm<SiteFormValues>({
    resolver: zodResolver(siteFormSchema),
    defaultValues: {
      name: site?.name || '',
      code: site?.code || '',
      address: site?.address || '',
      city: site?.city || '',
      country: site?.country || 'Tunisie',
      site_type: site?.site_type || '',
      surface_m2: site?.surface_m2 || undefined,
      employees_count: site?.employees_count || undefined,
      contact_name: site?.contact_name || '',
      contact_email: site?.contact_email || '',
      is_active: site?.is_active ?? true,
      is_consolidated: site?.is_consolidated ?? true,
    },
  });

  React.useEffect(() => {
    if (site) {
      form.reset({
        name: site.name,
        code: site.code || '',
        address: site.address || '',
        city: site.city || '',
        country: site.country || 'Tunisie',
        site_type: site.site_type || '',
        surface_m2: site.surface_m2 || undefined,
        employees_count: site.employees_count || undefined,
        contact_name: site.contact_name || '',
        contact_email: site.contact_email || '',
        is_active: site.is_active,
        is_consolidated: site.is_consolidated,
      });
    } else {
      form.reset({
        name: '',
        code: '',
        address: '',
        city: '',
        country: 'Tunisie',
        site_type: '',
        surface_m2: undefined,
        employees_count: undefined,
        contact_name: '',
        contact_email: '',
        is_active: true,
        is_consolidated: true,
      });
    }
  }, [site, form]);

  const handleSubmit = (data: SiteFormValues) => {
    onSubmit({ ...data, company_id: companyId });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {site ? 'Modifier le site' : 'Ajouter un site'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du site *</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: Usine Tunis" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Code interne</FormLabel>
                    <FormControl>
                      <Input placeholder="ex: SITE-001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="site_type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type de site</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Sélectionner..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {siteTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Adresse</FormLabel>
                    <FormControl>
                      <Input placeholder="Adresse du site" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="city"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ville</FormLabel>
                    <FormControl>
                      <Input placeholder="Ville" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="country"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pays</FormLabel>
                    <FormControl>
                      <Input placeholder="Pays" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="surface_m2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Surface (m²)</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employees_count"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre d'employés</FormLabel>
                    <FormControl>
                      <Input type="number" placeholder="0" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nom du contact</FormLabel>
                    <FormControl>
                      <Input placeholder="Responsable du site" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email du contact</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="email@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex flex-col gap-4 pt-4 border-t">
              <FormField
                control={form.control}
                name="is_active"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Site actif</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_consolidated"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between">
                    <FormLabel>Inclure dans les consolidations</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? 'Enregistrement...' : site ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
