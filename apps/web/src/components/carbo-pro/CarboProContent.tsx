import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Users, BarChart3, Headphones, Target, FileSpreadsheet, RefreshCw, Building } from "lucide-react";

export const CarboProContent: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Building className="h-6 w-6 text-primary" />,
      title: t("carboPro.features.complete.title"),
      description: t("carboPro.features.complete.description")
    },
    {
      icon: <Users className="h-6 w-6 text-primary" />,
      title: t("carboPro.features.users.title"),
      description: t("carboPro.features.users.description")
    },
    {
      icon: <Headphones className="h-6 w-6 text-primary" />,
      title: t("carboPro.features.support.title"),
      description: t("carboPro.features.support.description")
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-primary" />,
      title: t("carboPro.features.reporting.title"),
      description: t("carboPro.features.reporting.description")
    },
    {
      icon: <Target className="h-6 w-6 text-primary" />,
      title: t("carboPro.features.trajectory.title"),
      description: t("carboPro.features.trajectory.description")
    },
    {
      icon: <FileSpreadsheet className="h-6 w-6 text-primary" />,
      title: t("carboPro.features.exports.title"),
      description: t("carboPro.features.exports.description")
    }
  ];

  const clients = [
    {
      name: t("carboPro.clients.baguette.name"),
      description: t("carboPro.clients.baguette.description")
    },
    {
      name: t("carboPro.clients.startup.name"),
      description: t("carboPro.clients.startup.description")
    },
    {
      name: t("carboPro.clients.abc.name"),
      description: t("carboPro.clients.abc.description")
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-background to-muted/20 py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 text-sm font-medium">
            {t("carboPro.badge")}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("carboPro.title")}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("carboPro.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">{t("carboPro.price")}</div>
              <div className="text-muted-foreground">{t("carboPro.priceUnit")}</div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 hover-scale" asChild>
              <a href="/contact">{t("carboPro.ctaPrimary")}</a>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 hover-scale" asChild>
              <a href="/contact">{t("carboPro.ctaSecondary")}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("carboPro.featuresTitle")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("carboPro.featuresSubtitle")}
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
              {t("carboPro.processTitle")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("carboPro.processSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{t("carboPro.process.step1.title")}</h3>
              <p className="text-muted-foreground">
                {t("carboPro.process.step1.description")}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{t("carboPro.process.step2.title")}</h3>
              <p className="text-muted-foreground">
                {t("carboPro.process.step2.description")}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{t("carboPro.process.step3.title")}</h3>
              <p className="text-muted-foreground">
                {t("carboPro.process.step3.description")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Clients Section */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("carboPro.clientsTitle")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("carboPro.clientsSubtitle")}
            </p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8">
            {clients.map((client, index) => (
              <Card key={index} className="text-center border-2 border-primary/20 hover:border-primary/40 transition-colors">
                <CardHeader>
                  <CardTitle className="text-xl text-primary">
                    {client.name}
                  </CardTitle>
                  <CardDescription className="text-base">
                    {client.description}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("carboPro.ctaTitle")}
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            {t("carboPro.ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span>{t("carboPro.ctaFeatures.expert")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span>{t("carboPro.ctaFeatures.complete")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span>{t("carboPro.ctaFeatures.support")}</span>
            </div>
          </div>
          <Button variant="secondary" size="lg" className="text-lg px-8 hover-scale" asChild>
            <a href="/contact">{t("carboPro.ctaButton")}</a>
          </Button>
        </div>
      </section>
    </div>
  );
};