import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const contactFormSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  company: z.string().min(2, "Le nom de l'entreprise doit contenir au moins 2 caractères"),
  phone: z.string().min(8, "Le numéro de téléphone doit contenir au moins 8 caractères"),
  email: z.string().email("Adresse email invalide"),
  message: z.string().min(10, "Le message doit contenir au moins 10 caractères"),
});

type ContactFormValues = z.infer<typeof contactFormSchema>;

export const DecarbotechLandingContactForm: React.FC = () => {
  const { t } = useTranslation();
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: "",
      company: "",
      phone: "",
      email: "",
      message: "",
    },
  });

  const onSubmit = async (data: ContactFormValues) => {
    // In a real application, you would send the form data to a server
    // TODO: send form data to server
    
    // Show success message
    toast.success(t("decarbotechLanding.contact.successMessage"));
    form.reset();
  };

  return (
    <section id="contact-form" className="py-20 bg-gradient-to-b from-gray-50 to-white">
      <div className="container mx-auto px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("decarbotechLanding.contact.title")}
            </h2>
            <p className="text-lg text-muted-foreground">
              {t("decarbotechLanding.contact.subtitle")}
            </p>
          </div>
          
          <div className="bg-white p-8 md:p-10 rounded-xl shadow-soft border border-gray-100">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("decarbotechLanding.contact.fields.name")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("decarbotechLanding.contact.placeholders.name")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("decarbotechLanding.contact.fields.company")}</FormLabel>
                        <FormControl>
                          <Input placeholder={t("decarbotechLanding.contact.placeholders.company")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("decarbotechLanding.contact.fields.phone")}</FormLabel>
                        <FormControl>
                          <Input type="tel" placeholder={t("decarbotechLanding.contact.placeholders.phone")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("decarbotechLanding.contact.fields.email")}</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder={t("decarbotechLanding.contact.placeholders.email")} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                
                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t("decarbotechLanding.contact.fields.message")}</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder={t("decarbotechLanding.contact.placeholders.message")}
                          className="min-h-[150px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div>
                  <Button 
                    type="submit" 
                    size="lg"
                    className="w-full"
                  >
                    {t("decarbotechLanding.contact.submitButton")}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </div>
    </section>
  );
};

