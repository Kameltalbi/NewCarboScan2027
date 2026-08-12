
import React from "react";
import { FileArchive, BarChart, PersonStanding } from "lucide-react";


export const FeaturesSection: React.FC = () => {
  
  
  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          Comment ça marche ?
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Feature 1 */}
          <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileArchive className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-3 text-primary">Remplissez le questionnaire</h3>
            <p className="text-gray-600 text-center">
              Répondez à nos questions adaptées à votre secteur d'activité
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-3" style={{color: '#00BECB'}}>Obtenez vos résultats</h3>
            <p className="text-gray-600 text-center">
              Recevez votre rapport détaillé et vos indicateurs clés
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-6 rounded-lg shadow-sm hover:shadow-md transition-shadow">
            <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <PersonStanding className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-center mb-3 text-primary">Bénéficiez de nos conseils</h3>
            <p className="text-gray-600 text-center">
              Accédez à nos recommandations pour réduire votre empreinte
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};
