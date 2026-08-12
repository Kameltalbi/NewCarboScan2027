
import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Check, Mail, Phone } from "lucide-react";
import { useForm } from "react-hook-form";
import { useToast } from "@/hooks/use-toast";

type FormValues = {
  firstName: string;
  lastName: string;
  email: string;
  company: string;
  message: string;
};

export const PremiumContent: React.FC = () => {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>();
  
  const onSubmit = (data: FormValues) => {
    setIsSubmitting(true);
    
    // Simulate form submission
    setTimeout(() => {
      // Form submitted
      setIsSubmitting(false);
      setIsSubmitted(true);
      toast({
        title: "Demande envoyée",
        description: "Merci ! Nous vous contacterons sous 24h.",
      });
    }, 1000);
  };

  return (
    <div className="container mx-auto py-12 px-4">
      {/* Hero section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4">Formule Premium – Sur devis</h1>
        <p className="text-xl text-gray-600 max-w-3xl mx-auto">
          La solution sur mesure pour les grandes entreprises, groupes multi-sites ou organisations soumises à des obligations réglementaires.
          Bénéficiez d'un accompagnement expert, d'une trajectoire Net Zero pilotée et d'outils complets adaptés à vos enjeux.
        </p>
      </div>

      {/* Main content grid */}
      <div className="grid md:grid-cols-3 gap-8">
        {/* Features column */}
        <div className="md:col-span-2">
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Fonctionnalités Premium</CardTitle>
              <CardDescription>
                Une solution complète adaptée aux besoins des grandes entreprises
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {[
                  { 
                    title: "Toutes les fonctionnalités avancées incluses",
                    description: "Accès à l'ensemble des outils et fonctionnalités de la plateforme"
                  },
                  { 
                    title: "Utilisateurs illimités", 
                    description: "Comptes collaborateurs avec permissions personnalisées, reporting et validation"
                  },
                  { 
                    title: "Support expert", 
                    description: "RDV mensuels avec un expert climat + hotline dédiée"
                  },
                  { 
                    title: "Feuille de route climat sur 10 ans", 
                    description: "Trajectoire bas carbone avec jalons intermédiaires et objectifs quantifiés"
                  },
                  { 
                    title: "Accompagnement CSRD, MACF, SBTi", 
                    description: "Conformité aux exigences réglementaires européennes et internationales"
                  },
                  { 
                    title: "Exports personnalisés", 
                    description: "Rapports PDF, Excel et dashboards multi-sites"
                  }
                ].map((feature, index) => (
                  <li key={index} className="flex items-start">
                    <div className="bg-primary/10 p-1 rounded-full mr-3 mt-1">
                      <Check className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">{feature.title}</h3>
                      <p className="text-sm text-gray-500">{feature.description}</p>
                    </div>
                  </li>
                ))}
              </ul>

              <div className="mt-8 p-4 bg-gray-50 border border-gray-100 rounded-lg">
                <h3 className="font-semibold text-gray-800 mb-2">Notes complémentaires</h3>
                <ul className="space-y-1 text-sm text-gray-600">
                  <li><span className="font-medium">CSRD :</span> Corporate Sustainability Reporting Directive - Directive européenne sur le reporting extra-financier</li>
                  <li><span className="font-medium">MACF :</span> Mécanisme d'Ajustement Carbone aux Frontières - Taxe carbone européenne sur les importations</li>
                  <li><span className="font-medium">SBTi :</span> Science-Based Targets Initiative - Cadre international pour les objectifs climat alignés avec l'Accord de Paris</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Contact column */}
        <div>
          <Card className="mb-6">
            <CardHeader className="bg-primary/5">
              <CardTitle className="text-xl">Contactez-nous</CardTitle>
              <CardDescription>Pour obtenir un devis personnalisé</CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4 mb-6">
                <div className="flex items-center">
                  <Mail className="h-5 w-5 mr-3 text-primary" />
                  <a href="mailto:contact@carboscan.io" className="hover:text-primary">
                    contact@carboscan.io
                  </a>
                </div>
                <div className="flex items-center">
                  <Phone className="h-5 w-5 mr-3 text-primary" />
                  <a href="tel:+21698704385" className="hover:text-primary">
                    +216 98 704 385
                  </a>
                </div>
              </div>

              <div className="border-t pt-4">
                <h3 className="font-medium mb-3">Ou laissez-nous un message</h3>

                {isSubmitted ? (
                  <div className="p-4 bg-green-50 text-green-700 rounded-md text-center">
                    <p className="font-medium">Merci ! Nous vous contacterons sous 24h.</p>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Input
                          placeholder="Prénom"
                          {...register("firstName", { required: true })}
                          className={errors.firstName ? "border-red-300" : ""}
                        />
                      </div>
                      <div>
                        <Input
                          placeholder="Nom"
                          {...register("lastName", { required: true })}
                          className={errors.lastName ? "border-red-300" : ""}
                        />
                      </div>
                    </div>
                    <div>
                      <Input
                        type="email"
                        placeholder="Email professionnel"
                        {...register("email", { 
                          required: true, 
                          pattern: /^\S+@\S+$/i 
                        })}
                        className={errors.email ? "border-red-300" : ""}
                      />
                    </div>
                    <div>
                      <Input
                        placeholder="Société"
                        {...register("company", { required: true })}
                        className={errors.company ? "border-red-300" : ""}
                      />
                    </div>
                    <div>
                      <Textarea
                        placeholder="Votre message ou demande spécifique..."
                        {...register("message")}
                        className="min-h-[100px]"
                      />
                    </div>
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "Envoi en cours..." : "Envoyer ma demande"}
                    </Button>
                  </form>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="bg-gradient-to-br from-primary/10 to-primary/5 p-5 rounded-lg border border-primary/20">
            <h3 className="text-lg font-medium mb-2 text-gray-800">Offre sur devis uniquement</h3>
            <p className="text-sm text-gray-600">
              Notre équipe établira une proposition adaptée à la taille et aux besoins spécifiques de votre organisation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
