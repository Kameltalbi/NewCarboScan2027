import React from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, FileText, UserCheck, RefreshCw } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";
import { useToast } from "@/hooks/use-toast";

const PlanEssentiel = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { hasActiveSubscription, loading: subscriptionLoading } = useSubscriptionStatus();

  const handleStartAssessment = async () => {
    // Show loading state
    if (authLoading || subscriptionLoading) {
      toast({
        title: t("common.loading"),
        description: "Vérification en cours...",
      });
      return;
    }

    // Check authentication
    if (!isAuthenticated) {
      toast({
        title: "Authentification requise",
        description: "Veuillez vous connecter pour commencer votre bilan.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    // Check subscription status
    if (!hasActiveSubscription) {
      toast({
        title: "Abonnement requis",
        description: "Souscrivez au Plan Essentiel pour commencer votre bilan carbone.",
        variant: "destructive",
      });
      navigate('/payment?plan=essential');
      return;
    }

    // User has subscription, redirect to assessment
    navigate('/carbo-start/dashboard');
  };

  const handleRequestQuote = () => {
    navigate('/contact');
  };

  const features = [
    {
      icon: <Zap className="h-6 w-6 text-primary" />,
      title: t("planEssentiel.features.scope1.title"),
      description: t("planEssentiel.features.scope1.description")
    },
    {
      icon: <Zap className="h-6 w-6 text-primary" />,
      title: t("planEssentiel.features.scope2.title"),
      description: t("planEssentiel.features.scope2.description")
    },
    {
      icon: <FileText className="h-6 w-6 text-primary" />,
      title: t("planEssentiel.features.automated.title"),
      description: t("planEssentiel.features.automated.description")
    },
    {
      icon: <UserCheck className="h-6 w-6 text-primary" />,
      title: t("planEssentiel.features.validation.title"),
      description: t("planEssentiel.features.validation.description")
    },
    {
      icon: <FileText className="h-6 w-6 text-primary" />,
      title: t("planEssentiel.features.report.title"),
      description: t("planEssentiel.features.report.description")
    },
    {
      icon: <RefreshCw className="h-6 w-6 text-primary" />,
      title: t("planEssentiel.features.revisions.title"),
      description: t("planEssentiel.features.revisions.description")
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <main className="flex-grow">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-background to-muted/20 py-20">
          <div className="container mx-auto px-4 text-center">
            <Badge variant="secondary" className="mb-6 text-sm font-medium">
              {t("planEssentiel.badge")}
            </Badge>
            <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              {t("planEssentiel.title")}
            </h1>
            <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto">
              {t("planEssentiel.description")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                className="text-lg px-8 hover-scale"
                onClick={handleStartAssessment}
                disabled={authLoading || subscriptionLoading}
              >
                {t("planEssentiel.ctaPrimary")}
              </Button>
              <Button 
                variant="outline" 
                size="lg" 
                className="text-lg px-8 hover-scale"
                onClick={handleRequestQuote}
              >
                {t("planEssentiel.ctaSecondary")}
              </Button>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("planEssentiel.featuresTitle")}
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t("planEssentiel.featuresSubtitle")}
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="hover-scale border-0 shadow-md hover:shadow-lg transition-all duration-300">
                  <CardHeader className="pb-4">
                    <div className="mb-3">
                      {feature.icon}
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      {feature.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base">
                      {feature.description}
                    </CardDescription>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Process Section */}
        <section className="py-20 bg-muted/30">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                {t("planEssentiel.processTitle")}
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {t("planEssentiel.processSubtitle")}
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-primary">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{t("planEssentiel.process.step1.title")}</h3>
                <p className="text-muted-foreground">
                  {t("planEssentiel.process.step1.description")}
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-primary">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{t("planEssentiel.process.step2.title")}</h3>
                <p className="text-muted-foreground">
                  {t("planEssentiel.process.step2.description")}
                </p>
              </div>
              
              <div className="text-center">
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                  <span className="text-2xl font-bold text-primary">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-3">{t("planEssentiel.process.step3.title")}</h3>
                <p className="text-muted-foreground">
                  {t("planEssentiel.process.step3.description")}
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              {t("planEssentiel.ctaTitle")}
            </h2>
            <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
              {t("planEssentiel.ctaSubtitle")}
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                <span>{t("planEssentiel.ctaFeatures.professional")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                <span>{t("planEssentiel.ctaFeatures.certified")}</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="h-5 w-5" />
                <span>{t("planEssentiel.ctaFeatures.revisions")}</span>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="lg" 
              className="text-lg px-8 hover-scale"
              onClick={handleStartAssessment}
              disabled={authLoading || subscriptionLoading}
            >
              {t("planEssentiel.ctaButton")}
            </Button>
          </div>
        </section>
      </main>
      <NewFooter />
    </div>
  );
};

export default PlanEssentiel;