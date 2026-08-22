import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api, sessionAuth } from "@/integrations/api/client";
import { useToast } from "@/hooks/use-toast";
import { usePricingPlans } from "@/components/pricing/PricingData";

export const PaymentContent: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const { plans, currency } = usePricingPlans();
  
  const [selectedPlanIndex, setSelectedPlanIndex] = useState<number>(0);
  const [cardPaymentMethod, setCardPaymentMethod] = useState("");
  const [otherPaymentMethod, setOtherPaymentMethod] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    address: "",
    notes: "",
    organization: "",
    password: ""
  });
  const [showSuccess, setShowSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Map plan names to keys for database storage
  const planKeyMap: { [key: string]: string } = {
    "Essentiel": "essential",
    "Essential": "essential",
    "Pro": "pro", 
    "Expert": "expert"
  };

  // Map plan names to prices (raw numbers for database)
  const planPriceMap: { [key: string]: { dt: number, usd: number } } = {
    "Essentiel": { dt: 1300, usd: 300 },
    "Essential": { dt: 1300, usd: 300 },
    "Pro": { dt: 2400, usd: 750 },
    "Expert": { dt: 0, usd: 0 } // Sur devis
  };

  // Récupérer le plan sélectionné depuis l'URL ou définir un plan par défaut
  useEffect(() => {
    const planParam = searchParams.get('plan');
    if (planParam && plans.length > 0) {
      // Map URL parameters to plan indices directly
      const paramToIndexMap: { [key: string]: number } = {
        'essentiel': 0,
        'essential': 0,
        'pro': 1,
        'expert': 2
      };
      
      const planIndex = paramToIndexMap[planParam];
      if (planIndex !== undefined && planIndex < plans.length) {
        setSelectedPlanIndex(planIndex);
      }
    }
  }, [searchParams, plans]);

  const currentPlan = plans[selectedPlanIndex];
  const planKey = planKeyMap[currentPlan?.name] || 'essential';
  
  // Try to find the plan price by name, or fallback to index-based pricing
  let rawPrices = planPriceMap[currentPlan?.name];
  if (!rawPrices && currentPlan) {
    // Fallback based on plan index
    const fallbackPrices = [
      { dt: 1300, usd: 300 }, // Essential
      { dt: 2400, usd: 750 }, // Pro
      { dt: 0, usd: 0 }       // Expert (sur devis)
    ];
    rawPrices = fallbackPrices[selectedPlanIndex] || { dt: 1000, usd: 300 };
  } else if (!rawPrices) {
    rawPrices = { dt: 1000, usd: 300 };
  }
  
  // Always use DT currency regardless of language
  const planPrice = rawPrices.dt;


  const handleCardPayment = async () => {
    // Vérifier qu'un utilisateur est connecté
    const { data: { user } } = await sessionAuth.getUser();
    if (!user) {
      toast({
        title: "Erreur",
        description: t("checkout.messages.loginRequired"),
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    try {
      // Enregistrer la commande en base de données pour le paiement par carte
      await api.createOrder({
        amount: planPrice,
        currency: currency === 'DT' ? 'TND' : 'USD',
        status: 'validated',
        user_data: {
          name: user.fullName || user.email,
          email: user.email,
          phone: formData.phone || "",
          address: formData.address || "",
          notes: formData.notes || "",
          organization: formData.organization || "",
          plan_details: {
            plan_name: currentPlan?.name,
            plan_description: currentPlan?.description,
            plan_type: planKey,
            payment_method: 'carte',
          },
        },
      });

      const paymentUrl = "https://knct.me/4X3yuWlur";
      window.open(paymentUrl, '_blank');
      
      // Redirection vers le tableau de bord CarboScan Starter
      navigate('/carbo-start/dashboard');
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: t("checkout.messages.unexpectedError"),
        variant: "destructive",
      });
    }
  };

  const handleOtherPaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      // Vérifier si un utilisateur est connecté
      const { data: { user } } = await sessionAuth.getUser();

      // Validation des champs requis
      if (!formData.name || !formData.email || !formData.phone) {
        toast({
          title: "Erreur",
          description: t("checkout.messages.fillRequiredFields"),
          variant: "destructive",
        });
        return;
      }

      // Validation spécifique pour le plan pro
      if (selectedPlanIndex === 1 && (!formData.organization || !formData.password)) {
        toast({
          title: "Erreur",
          description: "Veuillez remplir le nom de l'organisation et le mot de passe pour le plan Pro",
          variant: "destructive",
        });
        return;
      }

      // Pour les plans autres que Pro, rediriger vers l'authentification si pas connecté
      if (!user && selectedPlanIndex !== 1) {
        toast({
          title: "Erreur",
          description: t("checkout.messages.loginRequiredOrder"),
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      // Enregistrer la commande en base de données
      await api.createOrder({
        amount: planPrice,
        currency: currency === 'DT' ? 'TND' : 'USD',
        status: 'pending',
        user_data: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          address: formData.address,
          notes: formData.notes,
          organization: formData.organization,
          plan_details: {
            plan_name: currentPlan?.name,
            plan_description: currentPlan?.description,
            plan_type: planKey,
            payment_method: otherPaymentMethod,
          },
        },
      });

      setShowSuccess(true);
    } catch (error) {
      console.error('Erreur:', error);
      toast({
        title: "Erreur",
        description: t("checkout.messages.unexpectedError"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  return (
    <section className="py-20 px-4 md:px-10 bg-white text-primary leading-relaxed">
      <h1 className="text-3xl md:text-4xl font-bold text-center mb-10">
        {t("checkout.title")}
      </h1>

      <div className="max-w-6xl mx-auto">
        {/* Sélection du plan */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>📦 {t("checkout.selectedPlan")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-primary">
                  {currentPlan?.name && currentPlan.name.startsWith('professionalPlans.') 
                    ? t(currentPlan.name) 
                    : currentPlan?.name}
                </h3>
                <p className="text-muted-foreground">
                  {currentPlan?.description && currentPlan.description.startsWith('professionalPlans.') 
                    ? t(currentPlan.description) 
                    : currentPlan?.description}
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {planPrice > 0 ? `${planPrice} DT` : t("checkout.onQuote")}
                </div>
                {planPrice > 0 && <div className="text-sm text-muted-foreground">{t("checkout.perYear")}</div>}
              </div>
            </div>
          </CardContent>
        </Card>

        <p className="text-lg text-justify mb-8">
          {t("checkout.description")} <strong>{currentPlan?.name}</strong>, {t("checkout.description2")}
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Section 1: Carte bancaire */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6 text-blue-800">💳 {t("checkout.cardPayment.title")}</h2>
            <p className="text-gray-700 mb-6">
              {t("checkout.cardPayment.description")}
            </p>
            
            <RadioGroup value={cardPaymentMethod} onValueChange={setCardPaymentMethod} className="space-y-4">
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="carte" id="carte-section" />
                  <Label htmlFor="carte-section" className="text-lg font-semibold">{t("checkout.cardPayment.option")}</Label>
                </div>
                {cardPaymentMethod === "carte" && (
                  <div className="mt-4 text-center">
                    <p className="mb-4 text-gray-700">{t("checkout.cardPayment.securePayment")}</p>
                    <Button 
                      type="button"
                      className="bg-blue-600 hover:bg-blue-700 text-white w-full"
                      onClick={handleCardPayment}
                    >
                      {t("checkout.cardPayment.payButton")}
                    </Button>
                    <p className="mt-3 text-sm text-gray-600">
                      {t("checkout.cardPayment.redirectNote")}
                    </p>
                  </div>
                )}
              </div>
            </RadioGroup>
          </div>

          {/* Section 2: Autres méthodes de paiement */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-xl p-6">
            <h2 className="text-2xl font-bold mb-6 text-green-800">🏦 {t("checkout.otherPayment.title")}</h2>
            <p className="text-gray-700 mb-6">
              {t("checkout.otherPayment.description")}
            </p>

            <form onSubmit={handleOtherPaymentSubmit} className="space-y-6">
              <RadioGroup value={otherPaymentMethod} onValueChange={setOtherPaymentMethod} className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="virement" id="virement" />
                    <Label htmlFor="virement" className="text-lg font-semibold">💳 {t("checkout.otherPayment.bankTransfer.title")}</Label>
                  </div>
                  {otherPaymentMethod === "virement" && (
                    <div className="mt-3 ml-6 space-y-2 text-gray-700">
                      <p><strong>{t("checkout.otherPayment.bankTransfer.holder")} :</strong> ARCHIT BAT COMUMUNI ABC</p>
                      <p><strong>{t("checkout.otherPayment.bankTransfer.iban")} :</strong> TN59 0804 3013 0710 0000 8645</p>
                      <p><strong>{t("checkout.otherPayment.bankTransfer.bic")} :</strong> BIATTNTT</p>
                      <p><strong>{t("checkout.otherPayment.bankTransfer.rib")} :</strong> 08043-01307100000086-45</p>
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="cheque" id="cheque" />
                    <Label htmlFor="cheque" className="text-lg font-semibold">📄 {t("checkout.otherPayment.check.title")}</Label>
                  </div>
                  {otherPaymentMethod === "cheque" && (
                    <div className="mt-3 ml-6 text-gray-700">
                      <p>{t("checkout.otherPayment.check.description")} <strong>ABC Archibat</strong>.</p>
                      <p>{t("checkout.otherPayment.check.appointment")}</p>
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="espece" id="espece" />
                    <Label htmlFor="espece" className="text-lg font-semibold">💰 {t("checkout.otherPayment.cash.title")}</Label>
                  </div>
                  {otherPaymentMethod === "espece" && (
                    <div className="mt-3 ml-6 text-gray-700">
                      <p>{t("checkout.otherPayment.cash.description")}</p>
                    </div>
                  )}
                </div>

                <div className="bg-white p-4 rounded-lg border border-green-200">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="intermediaire" id="intermediaire" />
                    <Label htmlFor="intermediaire" className="text-lg font-semibold">🌍 {t("checkout.otherPayment.intermediary.title")}</Label>
                  </div>
                  {otherPaymentMethod === "intermediaire" && (
                    <div className="mt-3 ml-6 text-gray-700">
                      <p className="mb-2">{t("checkout.otherPayment.intermediary.description")}</p>
                      <ul className="ml-4 space-y-1">
                        {(t("checkout.otherPayment.intermediary.services", { returnObjects: true }) as string[]).map((service: string, index: number) => (
                          <li key={index}>• {service}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </RadioGroup>

              {otherPaymentMethod && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold">{t("checkout.form.title")}</h3>
                  
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="name">{t("checkout.form.fields.name")} *</Label>
                      <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="email">{t("checkout.form.fields.email")} *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>

                    {/* Champs spécifiques au plan pro */}
                    {selectedPlanIndex === 1 && (
                      <>
                        <div>
                          <Label htmlFor="organization">{t("checkout.form.fields.organization") || "Nom de l'organisation"} *</Label>
                          <Input
                            id="organization"
                            name="organization"
                            value={formData.organization || ""}
                            onChange={handleInputChange}
                            required
                            className="mt-1"
                            placeholder="Nom de votre entreprise/organisation"
                          />
                        </div>
                        
                        <div>
                          <Label htmlFor="password">{t("checkout.form.fields.password") || "Mot de passe souhaité"} *</Label>
                          <Input
                            id="password"
                            name="password"
                            type="password"
                            value={formData.password || ""}
                            onChange={handleInputChange}
                            required
                            className="mt-1"
                            placeholder="Mot de passe pour votre compte pro"
                          />
                        </div>
                      </>
                    )}
                    
                    <div>
                      <Label htmlFor="phone">{t("checkout.form.fields.phone")} *</Label>
                      <Input
                        id="phone"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        required
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="address">{t("checkout.form.fields.address")}</Label>
                      <Input
                        id="address"
                        name="address"
                        value={formData.address}
                        onChange={handleInputChange}
                        className="mt-1"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="notes">{t("checkout.form.fields.notes")}</Label>
                      <Textarea
                        id="notes"
                        name="notes"
                        value={formData.notes}
                        onChange={handleInputChange}
                        placeholder={t("checkout.form.placeholders.notes")}
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Bouton toujours visible mais désactivé si aucune méthode sélectionnée */}
              <div className="text-center mt-6">
                <Button 
                  type="submit"
                  size="lg" 
                  disabled={isSubmitting || !otherPaymentMethod}
                  className={`px-8 py-4 text-lg w-full transition-all ${
                    !otherPaymentMethod 
                      ? 'bg-gray-400 cursor-not-allowed text-gray-600' 
                      : 'bg-green-600 hover:bg-green-700 text-white'
                  }`}
                >
                  {!otherPaymentMethod 
                    ? t("checkout.form.selectPaymentMethod") || "Sélectionnez une méthode de paiement"
                    : isSubmitting 
                      ? t("checkout.form.processing") 
                      : t("checkout.form.submitButton")
                  }
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <Dialog open={showSuccess} onOpenChange={setShowSuccess}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-2xl text-green-600">🎉 {t("checkout.success.title")}</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4 py-4">
            <p className="text-lg">{t("checkout.success.message")}</p>
            <p className="text-gray-600">
              {t("checkout.success.description")}
            </p>
            <Button 
              onClick={() => {
                setShowSuccess(false);
                navigate('/');
              }}
              className="mt-4"
            >
              {t("checkout.success.closeButton")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
};