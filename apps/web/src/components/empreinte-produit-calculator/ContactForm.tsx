import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ContactData } from "./types";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Send } from "lucide-react";

interface ContactFormProps {
  onSubmit: (data: ContactData) => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ onSubmit }) => {
  const { t } = useTranslation();

  const contactSchema = z.object({
    firstName: z.string().min(2, t("carbonCalculator.contactForm.validation.firstNameMin")),
    lastName: z.string().min(2, t("carbonCalculator.contactForm.validation.lastNameMin")),
    email: z.string().email(t("carbonCalculator.contactForm.validation.emailInvalid")),
    company: z.string().min(2, t("carbonCalculator.contactForm.validation.companyMin")),
    phone: z.string().min(8, t("carbonCalculator.contactForm.validation.phoneMin")),
    position: z.string().optional(),
  });

  const form = useForm<ContactData>({
    resolver: zodResolver(contactSchema),
    defaultValues: { firstName: "", lastName: "", email: "", company: "", phone: "", position: "" },
  });

  return (
    <div className="max-w-lg mx-auto py-8 sm:py-12 px-4 sm:px-0">
      <h2 className="text-2xl font-semibold text-foreground mb-2">{t("carbonCalculator.contactForm.title")}</h2>
      <p className="text-sm text-muted-foreground mb-10">{t("carbonCalculator.contactForm.subtitle")}</p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="firstName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">{t("carbonCalculator.contactForm.firstName")}</FormLabel>
                <FormControl><Input placeholder={t("carbonCalculator.contactForm.placeholders.firstName")} className="h-11" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="lastName" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">{t("carbonCalculator.contactForm.lastName")}</FormLabel>
                <FormControl><Input placeholder={t("carbonCalculator.contactForm.placeholders.lastName")} className="h-11" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="email" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-muted-foreground">{t("carbonCalculator.contactForm.email")}</FormLabel>
              <FormControl><Input type="email" placeholder={t("carbonCalculator.contactForm.placeholders.email")} className="h-11" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField control={form.control} name="company" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">{t("carbonCalculator.contactForm.company")}</FormLabel>
                <FormControl><Input placeholder={t("carbonCalculator.contactForm.placeholders.company")} className="h-11" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-medium text-muted-foreground">{t("carbonCalculator.contactForm.phone")}</FormLabel>
                <FormControl><Input placeholder={t("carbonCalculator.contactForm.placeholders.phone")} className="h-11" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>

          <FormField control={form.control} name="position" render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-medium text-muted-foreground">{t("carbonCalculator.contactForm.position")}</FormLabel>
              <FormControl><Input placeholder={t("carbonCalculator.contactForm.placeholders.position")} className="h-11" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />

          <div className="pt-4">
            <Button type="submit" size="lg" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground">
              <Send className="w-4 h-4 mr-2" />
              {t("carbonCalculator.contactForm.submitButton")}
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
};
