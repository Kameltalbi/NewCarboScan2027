import React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Mail } from "lucide-react";

export const ACVCTA = () => {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-blue-100 via-green-100 to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-5xl mx-auto">
          <Card className="bg-background/90 backdrop-blur-sm border border-blue-200 shadow-2xl overflow-hidden">
            <CardContent className="p-0">
              <div className="relative">
                {/* Background gradient */}
                <div className="absolute inset-0 bg-gradient-to-r from-blue-50 to-green-50"></div>
                
                {/* Content */}
                <div className="relative p-8 md:p-12 lg:p-16 text-center">
                  {/* Icon and heading */}
                  <div className="flex items-center justify-center gap-4 mb-8">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-green-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Mail className="w-8 h-8 text-white" />
                    </div>
                    <div className="text-left">
                      <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-blue-800">
                        Nos experts ACV
                      </h2>
                      <p className="text-xl md:text-2xl text-green-700">
                        sont à votre disposition
                      </p>
                    </div>
                  </div>

                  <p className="text-lg md:text-xl text-muted-foreground mb-10 leading-relaxed max-w-3xl mx-auto">
                    Bénéficiez de l'expertise de nos spécialistes pour réaliser une analyse complète 
                    et personnalisée de votre produit ou service selon les normes ISO 14040/14044.
                  </p>

                  {/* CTA Button */}
                  <Button 
                    size="lg"
                    className="bg-gradient-to-r from-blue-600 to-green-600 hover:from-blue-700 hover:to-green-700 text-white px-8 py-6 text-lg font-semibold rounded-[4px] shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 group"
                    onClick={() => window.location.href = '/contact'}
                  >
                    <span className="mr-3">Demander une étude ACV</span>
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Button>

                  <p className="text-sm text-muted-foreground mt-6 opacity-75">
                    Contactez-nous pour discuter de votre projet ACV
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};