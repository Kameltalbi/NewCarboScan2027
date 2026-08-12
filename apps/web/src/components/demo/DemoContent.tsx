import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar, Video, Clock, CheckCircle } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { analytics } from "@/lib/analytics";
import { api } from "@/integrations/api/client";

export const DemoContent: React.FC = () => {
  const { t } = useTranslation();

  const demoFormSchema = z.object({
    firstName: z.string().min(2, t('demoPage.validation.firstName')),
    lastName: z.string().min(2, t('demoPage.validation.lastName')),
    email: z.string().email(t('demoPage.validation.email')),
    company: z.string().min(2, t('demoPage.validation.company')),
    phone: z.string().min(8, t('demoPage.validation.phone')),
    preferredTime: z.string().min(1, t('demoPage.validation.preferredTime')),
    message: z.string().optional(),
  });

  type DemoFormValues = z.infer<typeof demoFormSchema>;

  const form = useForm<DemoFormValues>({
    resolver: zodResolver(demoFormSchema),
    defaultValues: { firstName: "", lastName: "", email: "", company: "", phone: "", preferredTime: "", message: "" },
  });

  const onSubmit = async (data: DemoFormValues) => {
    try {
      await api.submitLead({
        requestType: "demo",
        email: data.email,
        phone: data.phone,
        companyName: data.company,
        fullName: `${data.firstName} ${data.lastName}`,
        message: data.message,
        payload: { preferredTime: data.preferredTime },
      });
      analytics.requestDemo();
      toast.success(t('demoPage.toast.success'));
      form.reset();
    } catch (error) {
      console.error('Error sending demo request:', error);
      toast.error(t('demoPage.toast.error'));
    }
  };

  const timeSlots = [
    { value: "morning", label: t('demoPage.timeSlots.morning') },
    { value: "afternoon", label: t('demoPage.timeSlots.afternoon') },
    { value: "evening", label: t('demoPage.timeSlots.evening') },
  ];

  const during = t('demoPage.expectations.during.items', { returnObjects: true }) as string[];
  const after = t('demoPage.expectations.after.items', { returnObjects: true }) as string[];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <section className="py-16 px-4 text-center">
        <div className="container mx-auto max-w-4xl">
          <Video className="h-16 w-16 mx-auto mb-6 text-[#006F5A]" />
          <h1 className="text-4xl md:text-5xl font-bold mb-6 text-gray-900">{t('demoPage.hero.title')}</h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">{t('demoPage.hero.subtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm">
              <Calendar className="h-8 w-8 text-[#006F5A] mb-3" />
              <h3 className="font-semibold mb-2">{t('demoPage.perks.personalized.title')}</h3>
              <p className="text-sm text-gray-600 text-center">{t('demoPage.perks.personalized.desc')}</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm">
              <Clock className="h-8 w-8 text-[#006F5A] mb-3" />
              <h3 className="font-semibold mb-2">{t('demoPage.perks.duration.title')}</h3>
              <p className="text-sm text-gray-600 text-center">{t('demoPage.perks.duration.desc')}</p>
            </div>
            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-sm">
              <CheckCircle className="h-8 w-8 text-[#006F5A] mb-3" />
              <h3 className="font-semibold mb-2">{t('demoPage.perks.free.title')}</h3>
              <p className="text-sm text-gray-600 text-center">{t('demoPage.perks.free.desc')}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 px-4">
        <div className="container mx-auto max-w-2xl">
          <div className="bg-white p-8 rounded-lg shadow-lg">
            <h2 className="text-2xl font-bold mb-6 text-center">{t('demoPage.form.title')}</h2>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="firstName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('demoPage.form.firstName')} *</FormLabel>
                      <FormControl><Input placeholder={t('demoPage.form.firstNamePh')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="lastName" render={({ field }) => (
                    <FormItem>
                      <FormLabel>{t('demoPage.form.lastName')} *</FormLabel>
                      <FormControl><Input placeholder={t('demoPage.form.lastNamePh')} {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="email" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('demoPage.form.email')} *</FormLabel>
                    <FormControl><Input type="email" placeholder="your@email.com" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="company" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('demoPage.form.company')} *</FormLabel>
                    <FormControl><Input placeholder={t('demoPage.form.companyPh')} {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('demoPage.form.phone')} *</FormLabel>
                    <FormControl><Input placeholder="+216 00 000 000" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="preferredTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('demoPage.form.slot')} *</FormLabel>
                    <FormControl>
                      <select {...field} className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-[#006F5A] focus:border-transparent">
                        <option value="">{t('demoPage.form.slotPh')}</option>
                        {timeSlots.map((slot) => (
                          <option key={slot.value} value={slot.value}>{slot.label}</option>
                        ))}
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="message" render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t('demoPage.form.message')}</FormLabel>
                    <FormControl><Textarea placeholder={t('demoPage.form.messagePh')} className="min-h-[100px]" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="text-center">
                  <Button type="submit" className="w-full md:w-auto bg-[#006F5A] hover:bg-[#005243] text-white px-8 py-3 text-lg font-semibold">
                    {t('demoPage.form.submit')}
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        </div>
      </section>

      <section className="py-16 px-4 bg-gray-50">
        <div className="container mx-auto max-w-4xl text-center">
          <h2 className="text-3xl font-bold mb-8">{t('demoPage.expectations.title')}</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-left">
              <h3 className="text-xl font-semibold mb-4">{t('demoPage.expectations.during.title')}</h3>
              <ul className="space-y-3 text-gray-700">
                {during.map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-[#006F5A] mr-3 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="text-left">
              <h3 className="text-xl font-semibold mb-4">{t('demoPage.expectations.after.title')}</h3>
              <ul className="space-y-3 text-gray-700">
                {after.map((item, i) => (
                  <li key={i} className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-[#006F5A] mr-3 mt-0.5 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};
