import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  GraduationCap, 
  Target, 
  Users, 
  BookOpen, 
  Award, 
  CheckCircle, 
  Calendar, 
  Globe, 
  FileText,
  Download,
  Mail
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const CarboScanAcademy = () => {
  const { t } = useTranslation();
  
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      
      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary-light/10 via-white to-accent/10 py-20">
        <div className="container mx-auto px-6">
          <div className="max-w-4xl mx-auto text-center">
            <div className="flex items-center justify-center mb-6">
              <GraduationCap className="h-12 w-12 text-primary mr-3" />
              <h1 className="text-4xl lg:text-5xl font-bold text-gray-900">
                {t("academy.title")}
              </h1>
            </div>
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {t("academy.subtitle")}
            </p>
            <h2 className="text-2xl lg:text-3xl font-semibold text-gray-800 mb-6">
              {t("academy.description")}
            </h2>
            <p className="text-lg text-gray-600 mb-10 max-w-3xl mx-auto">
              {t("academy.intro")}
            </p>
          </div>
        </div>
      </section>

      {/* Pourquoi se former */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Target className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t("academy.whyTrain.title")}
            </h2>
          </div>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            {(t("academy.whyTrain.reasons", { returnObjects: true }) as any[]).map((reason: any, index: number) => (
              <Card key={index} className={`border-l-4 ${index === 0 ? 'border-l-red-500' : index === 1 ? 'border-l-primary' : index === 2 ? 'border-l-accent' : 'border-l-secondary'}`}>
                <CardContent className="pt-6">
                  <h3 className="text-xl font-semibold text-gray-900 mb-3">
                    {reason.title}
                  </h3>
                  <p className="text-gray-600">
                    {reason.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Notre approche pédagogique */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <BookOpen className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t("academy.pedagogicalApproach.title")}
            </h2>
          </div>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("academy.pedagogicalApproach.practicalTraining.title")}
                </h3>
                <p className="text-gray-600">
                  {t("academy.pedagogicalApproach.practicalTraining.description")}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("academy.pedagogicalApproach.completeSupport.title")}
                </h3>
                <p className="text-gray-600">
                  {t("academy.pedagogicalApproach.completeSupport.description")}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("academy.pedagogicalApproach.realCases.title")}
                </h3>
                <p className="text-gray-600">
                  {t("academy.pedagogicalApproach.realCases.description")}
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <CheckCircle className="h-6 w-6 text-accent mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t("academy.pedagogicalApproach.certificate.title")}
                </h3>
                <p className="text-gray-600">
                  {t("academy.pedagogicalApproach.certificate.description")}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Nos formules */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Calendar className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t("academy.formulas.title")}
            </h2>
          </div>
          
          <div className="max-w-6xl mx-auto grid lg:grid-cols-3 gap-8">
            {/* 1 Journée */}
            <Card className="relative">
              <CardHeader className="text-center pb-4">
                <Badge variant="outline" className="w-fit mx-auto mb-3">
                  {t("academy.formulas.oneDay.title")}
                </Badge>
                <CardTitle className="text-xl text-gray-900">
                  {t("academy.formulas.oneDay.subtitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-6 text-center">
                  {t("academy.formulas.oneDay.description")}
                </p>
                <div className="space-y-3">
                  {(t("academy.formulas.oneDay.features", { returnObjects: true }) as string[]).map((feature: string, index: number) => (
                    <div key={index} className="flex items-center text-sm text-gray-600">
                      <CheckCircle className="h-4 w-4 text-accent mr-2" />
                      {feature}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* 2 Jours */}
            <Card className="relative border-2 border-primary">
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-white">
                  Populaire
                </Badge>
              </div>
              <CardHeader className="text-center pb-4">
                <Badge variant="outline" className="w-fit mx-auto mb-3">
                  {t("academy.formulas.twoDays.title")}
                </Badge>
                <CardTitle className="text-xl text-gray-900">
                  {t("academy.formulas.twoDays.subtitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="font-semibold text-gray-900">Jour 1 :</p>
                    <p className="text-sm text-gray-600">{t("academy.formulas.twoDays.day1")}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Jour 2 :</p>
                    <p className="text-sm text-gray-600">{t("academy.formulas.twoDays.day2")}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  {t("academy.formulas.twoDays.audience")}
                </p>
              </CardContent>
            </Card>

            {/* 3 Jours */}
            <Card className="relative">
              <CardHeader className="text-center pb-4">
                <Badge variant="outline" className="w-fit mx-auto mb-3">
                  {t("academy.formulas.threeDays.title")}
                </Badge>
                <CardTitle className="text-xl text-gray-900">
                  {t("academy.formulas.threeDays.subtitle")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="font-semibold text-gray-900">Jour 1-2 :</p>
                    <p className="text-sm text-gray-600">{t("academy.formulas.threeDays.day1_2")}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Jour 3 :</p>
                    <p className="text-sm text-gray-600">{t("academy.formulas.threeDays.day3")}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 font-medium">
                  {t("academy.formulas.threeDays.audience")}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Modalités pratiques */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Globe className="h-12 w-12 text-primary mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {t("academy.practical.title")}
            </h2>
          </div>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <Globe className="h-6 w-6 text-primary mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">{t("academy.practical.format.title")}</h3>
                </div>
                <p className="text-gray-600">{t("academy.practical.format.description")}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <Globe className="h-6 w-6 text-accent mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">{t("academy.practical.languages.title")}</h3>
                </div>
                <p className="text-gray-600">{t("academy.practical.languages.description")}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <FileText className="h-6 w-6 text-secondary mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">{t("academy.practical.support.title")}</h3>
                </div>
                <p className="text-gray-600">{t("academy.practical.support.description")}</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <Award className="h-6 w-6 text-primary mr-3" />
                  <h3 className="text-lg font-semibold text-gray-900">{t("academy.practical.certification.title")}</h3>
                </div>
                <p className="text-gray-600">{t("academy.practical.certification.description")}</p>
              </CardContent>
            </Card>
          </div>
          
          <div className="text-center mt-8">
            <Card className="max-w-md mx-auto">
              <CardContent className="pt-6">
                <Users className="h-8 w-8 text-indigo-600 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Groupe limité
                </h3>
                <p className="text-gray-600">
                  Pour favoriser les échanges et l'apprentissage
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pourquoi choisir CarboScan Academy */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Award className="h-12 w-12 text-amber-600 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Pourquoi choisir CarboScan Academy ?
            </h2>
          </div>
          
          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-8">
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Target className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Expertise terrain
                </h3>
                <p className="text-gray-600">
                  Issue du bilan carbone, accompagnement stratégique et CBAM.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Formateurs certifiés
                </h3>
                <p className="text-gray-600">
                  Avec expérience internationale reconnue.
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <BookOpen className="h-6 w-6 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Méthodologie claire
                </h3>
                <p className="text-gray-600">
                  Basée sur des outils reconnus (Bilan Carbone®, ACV ISO 14040).
                </p>
              </div>
            </div>
            
            <div className="flex items-start space-x-4">
              <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Approche pragmatique
                </h3>
                <p className="text-gray-600">
                  Opérationnelle et adaptée à vos besoins.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Final */}
      <section className="py-20 bg-gradient-to-r from-carbon-impact to-carbon-dark">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl lg:text-4xl font-bold text-white mb-6">
            {t("academy.cta.title")}
          </h2>
          <p className="text-xl text-white/90 mb-10 max-w-2xl mx-auto">
            {t("academy.cta.description")}
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-white text-primary hover:bg-gray-100 px-8 py-3 text-lg"
              asChild
            >
              <Link to="/contact">
                <Mail className="h-5 w-5 mr-2" />
                {t("academy.cta.button")}
              </Link>
            </Button>
            
            <Button 
              size="lg" 
              className="!bg-transparent border-2 border-white text-white hover:bg-white hover:text-primary px-8 py-3 text-lg"
            >
              <Download className="h-5 w-5 mr-2" />
              Télécharger le programme détaillé
            </Button>
          </div>
        </div>
      </section>

      <NewFooter />
    </div>
  );
};

export default CarboScanAcademy;