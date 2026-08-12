import React from "react";
import { BarChart, ClipboardEdit, FileCheck } from "lucide-react";

export const SolutionsSection: React.FC = () => {
  return (
    <section className="py-16 bg-white">
      <div className="container mx-auto">
        <h2 className="text-3xl font-bold text-center mb-12">
          Nos Solutions
        </h2>
        
        <div className="grid md:grid-cols-3 gap-8">
          {/* Solution 1 */}
          <div className="space-y-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <BarChart className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-primary">Mesurer</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 bg-primary rounded-full mr-2"></span>
                <span>Calculer votre empreinte carbone</span>
              </li>
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 bg-primary rounded-full mr-2"></span>
                <span>Identifier vos sources d'émissions</span>
              </li>
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 bg-primary rounded-full mr-2"></span>
                <span>Suivre vos progrès</span>
              </li>
            </ul>
          </div>

          {/* Solution 2 */}
          <div className="space-y-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <ClipboardEdit className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold" style={{color: '#00BECB'}}>Agir</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 bg-primary rounded-full mr-2"></span>
                <span>Mettre en place des actions</span>
              </li>
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 bg-primary rounded-full mr-2"></span>
                <span>Optimiser vos processus</span>
              </li>
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 bg-primary rounded-full mr-2"></span>
                <span>Réduire vos émissions</span>
              </li>
            </ul>
          </div>

          {/* Solution 3 */}
          <div className="space-y-4">
            <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <FileCheck className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-semibold text-primary">Se conformer</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 bg-primary rounded-full mr-2"></span>
                <span>Respecter la réglementation</span>
              </li>
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 bg-primary rounded-full mr-2"></span>
                <span>Préparer vos rapports</span>
              </li>
              <li className="flex items-center">
                <span className="h-1.5 w-1.5 bg-primary rounded-full mr-2"></span>
                <span>Obtenir vos certifications</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};