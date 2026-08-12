import React from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Check, Network, Users, BarChart3, Shield, FileSpreadsheet, Target, Headphones } from "lucide-react";

export const CarboOmnibusContent: React.FC = () => {
  const { t } = useTranslation();

  const features = [
    {
      icon: <Network className="h-6 w-6 text-primary" />,
      title: t("carboComplet.features.multiEntity.title"),
      description: t("carboComplet.features.multiEntity.description")
    },
    {
      icon: <Users className="h-6 w-6 text-primary" />,
      title: t("carboComplet.features.users.title"),
      description: t("carboComplet.features.users.description")
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-primary" />,
      title: t("carboComplet.features.reporting.title"),
      description: t("carboComplet.features.reporting.description")
    },
    {
      icon: <Shield className="h-6 w-6 text-primary" />,
      title: t("carboComplet.features.support.title"),
      description: t("carboComplet.features.support.description")
    },
    {
      icon: <FileSpreadsheet className="h-6 w-6 text-primary" />,
      title: t("carboComplet.features.exports.title"),
      description: t("carboComplet.features.exports.description")
    },
    {
      icon: <Target className="h-6 w-6 text-primary" />,
      title: t("carboComplet.features.trajectory.title"),
      description: t("carboComplet.features.trajectory.description")
    }
  ];

  const clients = [
    {
      name: t("carboComplet.clients.baguette.name"),
      description: t("carboComplet.clients.baguette.description")
    },
    {
      name: t("carboComplet.clients.startup.name"),
      description: t("carboComplet.clients.startup.description")
    },
    {
      name: t("carboComplet.clients.abc.name"),
      description: t("carboComplet.clients.abc.description")
    }
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-background to-muted/20 py-20">
        <div className="container mx-auto px-4 text-center">
          <Badge variant="secondary" className="mb-6 text-sm font-medium">
            {t("carboComplet.badge")}
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            {t("carboComplet.title")}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {t("carboComplet.description")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary mb-2">{t("carboComplet.price")}</div>
              <div className="text-muted-foreground">{t("carboComplet.priceUnit")}</div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Headphones className="h-4 w-4" />
              <span>{t("carboComplet.supportNote")}</span>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8 hover-scale" asChild>
              <a href="/contact">{t("carboComplet.ctaPrimary")}</a>
            </Button>
            <Button variant="outline" size="lg" className="text-lg px-8 hover-scale" asChild>
              <a href="/contact">{t("carboComplet.ctaSecondary")}</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 bg-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              {t("carboComplet.featuresTitle")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("carboComplet.featuresSubtitle")}
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
              {t("carboComplet.processTitle")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("carboComplet.processSubtitle")}
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{t("carboComplet.process.step1.title")}</h3>
              <p className="text-muted-foreground">
                {t("carboComplet.process.step1.description")}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{t("carboComplet.process.step2.title")}</h3>
              <p className="text-muted-foreground">
                {t("carboComplet.process.step2.description")}
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-bold text-primary">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">{t("carboComplet.process.step3.title")}</h3>
              <p className="text-muted-foreground">
                {t("carboComplet.process.step3.description")}
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
              {t("carboComplet.clientsTitle")}
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("carboComplet.clientsSubtitle")}
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

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Pourquoi choisir Carbo Complet ?
            </h2>
          </div>
          
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl font-semibold mb-6">Gérez la complexité de votre réseau</h3>
              <ul className="space-y-4">
                <li className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <span>Structures variées et dispersées géographiquement</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <span>Besoins spécifiques en gestion environnementale</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <span>Centralisation de la collecte de données</span>
                </li>
                <li className="flex items-start gap-3">
                  <Check className="h-6 w-6 text-primary mt-0.5 flex-shrink-0" />
                  <span>Vision consolidée à l'échelle du groupe</span>
                </li>
              </ul>
            </div>
            
            <div className="bg-primary/5 p-8 rounded-lg">
              <h3 className="text-2xl font-semibold mb-4 text-primary">Solution idéale pour :</h3>
              <ul className="space-y-3 text-lg">
                <li>• Réseaux de franchises</li>
                <li>• Groupes multi-entreprises</li>
                <li>• Fédérations d'entreprises</li>
                <li>• Holdings et portefeuilles</li>
                <li>• Réseaux d'agences</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            {t("carboComplet.ctaTitle")}
          </h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto opacity-90">
            {t("carboComplet.ctaSubtitle")}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span>{t("carboComplet.ctaFeatures.consolidated")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span>{t("carboComplet.ctaFeatures.personalized")}</span>
            </div>
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5" />
              <span>{t("carboComplet.ctaFeatures.priority")}</span>
            </div>
          </div>
          <Button variant="secondary" size="lg" className="text-lg px-8 hover-scale" asChild>
            <a href="/contact">{t("carboComplet.ctaButton")}</a>
          </Button>
        </div>
      </section>
    </div>
  );
};