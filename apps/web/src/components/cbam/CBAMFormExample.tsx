/**
 * CBAM Form Example
 * Example integration of HSCodeField component in a CBAM form
 */

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormProvider } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { HSCodeField } from './HSCodeField';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Form schema with Zod validation
 */
const cbamFormSchema = z.object({
  hs_code: z
    .string()
    .min(1, 'Le code HS est requis')
    .regex(/^\d{6}$/, 'Le code HS doit contenir exactement 6 chiffres'),
  product_name: z.string().min(1, 'Le nom du produit est requis'),
  country: z.string().min(1, 'Le pays est requis'),
  period: z.string().min(1, 'La période est requise'),
});

type CBAMFormValues = z.infer<typeof cbamFormSchema>;

/**
 * Example CBAM form component using HSCodeField
 */
export const CBAMFormExample: React.FC = () => {
  const form = useForm<CBAMFormValues>({
    resolver: zodResolver(cbamFormSchema),
    defaultValues: {
      hs_code: '',
      product_name: '',
      country: '',
      period: '',
    },
  });

  const onSubmit = (data: CBAMFormValues) => {
    // TODO: handle form submission
    // Handle form submission
    // The hs_code will be a clean 6-digit string
  };

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Formulaire CBAM - Exemple</CardTitle>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* HS Code Field - Main integration example */}
            <HSCodeField
              name="hs_code"
              label="HS Code"
              placeholder="123456"
              required={true}
            />

            {/* Other form fields */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nom du produit <span className="text-red-500">*</span>
              </label>
              <input
                {...form.register('product_name')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ex: Acier inoxydable"
              />
              {form.formState.errors.product_name && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.product_name.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Pays <span className="text-red-500">*</span>
              </label>
              <input
                {...form.register('country')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ex: Tunisie"
              />
              {form.formState.errors.country && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.country.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Période <span className="text-red-500">*</span>
              </label>
              <input
                {...form.register('period')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Ex: 2024-Q1"
              />
              {form.formState.errors.period && (
                <p className="text-sm text-red-500">
                  {form.formState.errors.period.message}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline">
                Annuler
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700">
                Valider
              </Button>
            </div>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
};

/**
 * Alternative example using ShadCN Form components
 */
export const CBAMFormWithShadCN: React.FC = () => {
  const form = useForm<CBAMFormValues>({
    resolver: zodResolver(cbamFormSchema),
    defaultValues: {
      hs_code: '',
      product_name: '',
      country: '',
      period: '',
    },
  });

  const onSubmit = (data: CBAMFormValues) => {
    // TODO: handle form submission
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* HS Code Field integration */}
        <HSCodeField
          name="hs_code"
          label="Code HS"
          required={true}
        />

        {/* Access the value programmatically */}
        <div className="text-sm text-gray-600">
          Code HS saisi : {form.watch('hs_code') || '(vide)'}
        </div>

        <Button type="submit">Soumettre</Button>
      </form>
    </Form>
  );
};

