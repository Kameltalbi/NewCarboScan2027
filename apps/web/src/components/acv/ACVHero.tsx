import React from "react";

export const ACVHero = () => {
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-blue-50 via-green-50 to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
            Analyse de Cycle de Vie (ACV) : mesurer l'impact de vos produits de A à Z
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground mb-8 leading-relaxed">
            Comprendre l'empreinte environnementale d'un produit
          </p>
          <div className="w-24 h-1 bg-gradient-to-r from-blue-600 to-green-600 mx-auto"></div>
        </div>
      </div>
    </section>
  );
};