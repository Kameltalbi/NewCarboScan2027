import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MessageCircle, Clock, ArrowRight, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";
import carboScanLogoWhite from "@/assets/carboscan-logo-white.png";
import { api } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";

export const ContactContent: React.FC = () => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [subject, setSubject] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !message) {
      toast({
        title: "Champs requis",
        description: "Email et message sont obligatoires.",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);
    try {
      await api.submitLead({
        requestType: "contact",
        email,
        fullName: `${firstName} ${lastName}`.trim(),
        message: `[${subject || "contact"}] ${message}`,
        payload: { subject, firstName, lastName },
      });
      toast({
        title: "Message envoyé",
        description: "Nous vous répondrons rapidement.",
      });
      setSubject("");
      setFirstName("");
      setLastName("");
      setEmail("");
      setMessage("");
    } catch (err) {
      toast({
        title: "Erreur",
        description: err instanceof Error ? err.message : "Envoi impossible",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-grow bg-forest-bg">
      <section className="container mx-auto px-4 py-12 lg:py-16">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row bg-white rounded-[2rem] shadow-2xl shadow-forest-deep/5 overflow-hidden ring-1 ring-black/5">
          <div className="lg:w-5/12 bg-forest-deep p-10 lg:p-16 text-white flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-forest-light/20 rounded-full blur-3xl" />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-12">
                <img src={carboScanLogoWhite} alt="CarboScan" className="h-12 w-auto" />
              </div>
              <h1 className="text-4xl lg:text-5xl font-normal leading-tight mb-6 font-sora">
                {t("contact.title")}
              </h1>
              <p className="text-forest-sage/90 text-lg max-w-sm mb-12 leading-relaxed font-manrope">
                {t("contact.subtitle")}
              </p>
              <div className="space-y-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-forest-mid flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5 text-forest-sage" />
                  </div>
                  <div>
                    <h4 className="font-medium text-forest-sage text-sm uppercase tracking-wider mb-1">
                      {t("contact.contactInfo.email")}
                    </h4>
                    <p className="text-white">{t("contact.email")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-forest-mid flex items-center justify-center shrink-0">
                    <Phone className="w-5 h-5 text-forest-sage" />
                  </div>
                  <div>
                    <h4 className="font-medium text-forest-sage text-sm uppercase tracking-wider mb-1">
                      {t("contact.contactInfo.phone")}
                    </h4>
                    <p className="text-white">{t("contact.phone")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-forest-mid flex items-center justify-center shrink-0">
                    <MessageCircle className="w-5 h-5 text-forest-sage" />
                  </div>
                  <div>
                    <h4 className="font-medium text-forest-sage text-sm uppercase tracking-wider mb-1">
                      {t("contact.contactInfo.whatsapp")}
                    </h4>
                    <p className="text-white">{t("contact.whatsapp")}</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-forest-mid flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-forest-sage" />
                  </div>
                  <div>
                    <h4 className="font-medium text-forest-sage text-sm uppercase tracking-wider mb-1">
                      {t("contact.contactInfo.hours")}
                    </h4>
                    <p className="text-white whitespace-pre-line">
                      {t("contact.contactInfo.hoursContent")}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative z-10 pt-12 border-t border-forest-mid">
              <div className="flex items-center gap-3">
                <Shield className="w-4 h-4 text-forest-sage" />
                <p className="text-sm text-forest-sage/70">{t("contact.trust")}</p>
              </div>
            </div>
          </div>

          <div className="lg:w-7/12 p-10 lg:p-20 bg-white flex flex-col justify-center">
            <div className="max-w-md mx-auto w-full">
              <h2 className="text-sm font-bold uppercase tracking-[0.2em] text-forest-light mb-2 font-sora">
                {t("contact.talkProject.title")}
              </h2>
              <h3 className="text-2xl font-semibold text-slate-900 mb-2 font-sora">
                {t("contact.form.title")}
              </h3>
              <p className="text-slate-500 mb-10 font-manrope">{t("contact.responseTime")}</p>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      {t("contact.form.firstName")}
                    </Label>
                    <Input
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      type="text"
                      placeholder="Jean"
                      className="px-4 py-3 rounded-xl border border-slate-200"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      {t("contact.form.lastName")}
                    </Label>
                    <Input
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      type="text"
                      placeholder="Dupont"
                      className="px-4 py-3 rounded-xl border border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    {t("contact.form.email")}
                  </Label>
                  <Input
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    type="email"
                    required
                    placeholder="jean@entreprise.com"
                    className="px-4 py-3 rounded-xl border border-slate-200"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    {t("contact.form.subject")}
                  </Label>
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-white text-sm"
                  >
                    <option value="">{t("contact.form.subjectPlaceholder")}</option>
                    <option value="carbon">{t("contact.form.subjectOptions.carbon")}</option>
                    <option value="demo">{t("contact.form.subjectOptions.demo")}</option>
                    <option value="other">{t("contact.form.subjectOptions.other")}</option>
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium text-slate-700">
                    {t("contact.form.message")}
                  </Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    rows={5}
                    className="rounded-xl border border-slate-200"
                  />
                </div>

                <Button type="submit" disabled={loading} className="w-full rounded-xl">
                  {loading ? "..." : t("contact.form.submit")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
};
