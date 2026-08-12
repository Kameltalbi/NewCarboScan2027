import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, BookOpen, CheckCircle2, Loader2, ArrowRight, X, FileText, Download } from "lucide-react";
import { api } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";

const GUIDE_PDF_URL_FR = "/guides/guide-bilan-carbone-fr.pdf";
const GUIDE_PDF_URL_EN = "/guides/guide-bilan-carbone-en.pdf";

const SECTORS = [
  "Industrie",
  "Construction / BTP",
  "Transport & Logistique",
  "Agroalimentaire",
  "Énergie",
  "Services & Conseil",
  "Commerce & Distribution",
  "Technologie / IT",
  "Santé",
  "Autre",
];

export const GuideDownloadSection: React.FC = () => {
  const { i18n } = useTranslation();
  const { toast } = useToast();
  const lang = i18n.language || "fr";

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    sector: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const isValid =
    form.firstName.trim() &&
    form.lastName.trim() &&
    form.email.trim() &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email) &&
    form.phone.trim() &&
    form.sector;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setLoading(true);
    try {
      await api.submitLead({
        requestType: "guide_download",
        email: form.email.trim(),
        phone: form.phone.trim(),
        companyName: form.sector,
        fullName: `${form.firstName.trim()} ${form.lastName.trim()}`,
        message: `Téléchargement guide Bilan Carbone - ${form.lastName.trim()} ${form.firstName.trim()} - Secteur: ${form.sector}`,
        payload: {
          guideUrl: lang === "fr" ? GUIDE_PDF_URL_FR : GUIDE_PDF_URL_EN,
          language: lang,
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
        },
      });

      setSubmitted(true);
      toast({
        title: lang === "fr" ? "Guide envoyé !" : "Guide sent!",
        description:
          lang === "fr"
            ? "Le guide a été envoyé en pièce jointe à votre adresse email."
            : "The guide has been sent as an attachment to your email.",
      });
    } catch {
      toast({
        title: lang === "fr" ? "Erreur" : "Error",
        description:
          lang === "fr"
            ? "Une erreur est survenue. Veuillez réessayer."
            : "An error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="py-20 sm:py-24 bg-white relative">
        <div className="container mx-auto px-6">
          <div className="max-w-5xl mx-auto text-center">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 bg-[#1ABC9C]/10 text-[#1ABC9C] px-4 py-2 rounded-full text-sm font-semibold mb-8">
              <BookOpen className="w-4 h-4" />
              <span>{lang === "fr" ? "Guide gratuit • 20 pages" : "Free guide • 20 pages"}</span>
            </div>

            {/* Title */}
            <h2 className="text-3xl lg:text-4xl font-bold text-foreground mb-6">
              {lang === "fr"
                ? "Comment calculer votre bilan carbone ?"
                : "How to calculate your carbon footprint?"}
            </h2>

            {/* Subtitle */}
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
              {lang === "fr"
                ? "Téléchargez notre guide complet pour maîtriser les étapes clés du calcul de votre empreinte carbone, de la collecte des données à la mise en place d'actions de réduction."
                : "Download our comprehensive guide to master the key steps of calculating your carbon footprint, from data collection to implementing reduction actions."}
            </p>

            {/* Content highlights */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-12">
              {(lang === "fr"
                ? [
                    { title: "Méthodologie", desc: "ISO 14064 & GHG Protocol" },
                    { title: "Scopes 1, 2 & 3", desc: "Périmètres expliqués simplement" },
                    { title: "Checklist", desc: "Données à collecter par poste" },
                    { title: "Cas concrets", desc: "Exemples par secteur d'activité" },
                  ]
                : [
                    { title: "Methodology", desc: "ISO 14064 & GHG Protocol" },
                    { title: "Scopes 1, 2 & 3", desc: "Boundaries explained simply" },
                    { title: "Checklist", desc: "Data to collect by category" },
                    { title: "Case studies", desc: "Examples by industry sector" },
                  ]
              ).map((item) => (
                <div
                  key={item.title}
                  className="bg-[#F5F7FA] rounded-xl p-5 text-left border border-[#E5E7EB]/50"
                >
                  <div className="w-10 h-10 bg-[#1ABC9C]/10 rounded-lg flex items-center justify-center mb-3">
                    <CheckCircle2 className="w-5 h-5 text-[#1ABC9C]" />
                  </div>
                  <h3 className="font-semibold text-[#1F2937] mb-1">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.desc}</p>
                </div>
              ))}
            </div>

            {/* CTA Button */}
            <Button
              onClick={() => setShowForm(true)}
              size="lg"
              className="text-white px-10 py-6 text-lg font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all"
              style={{ background: "linear-gradient(135deg, #1ABC9C 0%, #0F172A 100%)" }}
            >
              <FileDown className="w-5 h-5 mr-2" />
              {lang === "fr" ? "Recevoir le guide gratuitement" : "Get the guide for free"}
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Modal overlay for the form */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg relative animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            {/* Close button */}
            <button
              onClick={() => setShowForm(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#F5F7FA] hover:bg-[#E5E7EB] flex items-center justify-center transition-colors z-10"
            >
              <X className="w-4 h-4 text-[#6B7280]" />
            </button>

            {submitted ? (
              <div className="text-center py-12 px-8">
                <div className="w-16 h-16 bg-[#1ABC9C]/15 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle2 className="w-8 h-8 text-[#1ABC9C]" />
                </div>
                <h3 className="text-xl font-bold text-[#1F2937] mb-3">
                  {lang === "fr" ? "Merci !" : "Thank you!"}
                </h3>
                <p className="text-[#6B7280]">
                  {lang === "fr"
                    ? "Votre guide est en route vers votre boîte mail. Pensez à vérifier vos spams."
                    : "Your guide is on its way to your inbox. Don't forget to check your spam folder."}
                </p>
              </div>
            ) : (
              <div className="p-8">
                {/* Header */}
                <div className="flex items-center gap-4 mb-8">
                  <div className="w-14 h-14 bg-gradient-to-br from-[#1ABC9C] to-[#0E7C66] rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-7 h-7 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#1F2937]">
                      {lang === "fr" ? "Recevez votre guide" : "Get your guide"}
                    </h3>
                    <p className="text-sm text-[#6B7280]">
                      {lang === "fr" ? "PDF gratuit • 20 pages" : "Free PDF • 20 pages"}
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="guide-lastName" className="text-[#1F2937] text-sm font-medium">
                        {lang === "fr" ? "Nom" : "Last name"} *
                      </Label>
                      <Input
                        id="guide-lastName"
                        value={form.lastName}
                        onChange={(e) => handleChange("lastName", e.target.value)}
                        placeholder={lang === "fr" ? "Dupont" : "Smith"}
                        maxLength={100}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="guide-firstName" className="text-[#1F2937] text-sm font-medium">
                        {lang === "fr" ? "Prénom" : "First name"} *
                      </Label>
                      <Input
                        id="guide-firstName"
                        value={form.firstName}
                        onChange={(e) => handleChange("firstName", e.target.value)}
                        placeholder={lang === "fr" ? "Jean" : "John"}
                        maxLength={100}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="guide-email" className="text-[#1F2937] text-sm font-medium">
                      {lang === "fr" ? "Adresse e-mail" : "Email address"} *
                    </Label>
                    <Input
                      id="guide-email"
                      type="email"
                      value={form.email}
                      onChange={(e) => handleChange("email", e.target.value)}
                      placeholder="jean.dupont@entreprise.com"
                      maxLength={255}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="guide-phone" className="text-[#1F2937] text-sm font-medium">
                      {lang === "fr" ? "Téléphone" : "Phone"} *
                    </Label>
                    <Input
                      id="guide-phone"
                      type="tel"
                      value={form.phone}
                      onChange={(e) => handleChange("phone", e.target.value)}
                      placeholder="+216 XX XXX XXX"
                      maxLength={20}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[#1F2937] text-sm font-medium">
                      {lang === "fr" ? "Secteur d'activité" : "Industry sector"} *
                    </Label>
                    <Select value={form.sector} onValueChange={(v) => handleChange("sector", v)}>
                      <SelectTrigger>
                        <SelectValue
                          placeholder={lang === "fr" ? "Sélectionnez votre secteur" : "Select your sector"}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {SECTORS.map((s) => (
                          <SelectItem key={s} value={s}>
                            {s}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    type="submit"
                    disabled={!isValid || loading}
                    className="w-full text-white py-6 text-base font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all mt-2"
                    style={{ background: "linear-gradient(135deg, #1ABC9C 0%, #0F172A 100%)" }}
                  >
                    {loading ? (
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    ) : (
                      <FileDown className="w-5 h-5 mr-2" />
                    )}
                    {lang === "fr" ? "Recevoir le guide par email" : "Receive the guide by email"}
                  </Button>

                  <p className="text-xs text-[#9CA3AF] text-center pt-1">
                    {lang === "fr"
                      ? "En soumettant ce formulaire, vous acceptez d'être contacté par CarboScan."
                      : "By submitting this form, you agree to be contacted by CarboScan."}
                  </p>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
