import React from "react";
import { Button } from "@/components/ui/button";
import { Download, Database, FileText, CheckCircle, Loader2 } from "lucide-react";
import { useExcelDownload } from "@/hooks/useExcelDownload";

export const CollecteDonnees: React.FC = () => {
  const { downloadExcel, isGenerating } = useExcelDownload();

  const handleDownload = () => {
    downloadExcel();
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-gray-50 p-6 rounded-lg border mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-4 flex items-center gap-3">
          <Database className="h-8 w-8 text-primary" />
          Collecte de données
        </h1>
        <p className="text-lg text-gray-600">
          Préparez toutes les informations nécessaires pour réaliser un bilan carbone fiable selon la méthodologie Bilan Carbone® de l'Association pour la transition bas carbone (ABC).
        </p>
      </div>

      {/* Importance section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircle className="h-6 w-6 text-green-600" />
          Pourquoi préparer sa data avant de commencer ?
        </h2>
        <p className="text-gray-600 mb-4">
          La qualité de votre bilan carbone dépend directement de l'exhaustivité et de la précision de vos données. 
          Une collecte rigoureuse selon la méthodologie ABC permet :
        </p>
        <ul className="space-y-2 text-gray-700 ml-6">
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            d'identifier précisément les postes d'émissions définis par la méthodologie Bilan Carbone® ;
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            de respecter les principes de complétude et de cohérence requis par l'ABC ;
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            d'assurer la traçabilité des données pour la validation du bilan ;
          </li>
          <li className="flex items-start gap-2">
            <span className="text-primary mt-1">•</span>
            d'établir un plan d'action de réduction basé sur des données fiables.
          </li>
        </ul>
      </section>

      {/* Méthodologie ABC section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileText className="h-6 w-6 text-blue-600" />
          Spécificités de la méthodologie Bilan Carbone®
        </h2>
        <div className="bg-blue-50 p-6 rounded-lg mb-6">
          <h3 className="font-semibold text-blue-900 mb-3">Périmètre organisationnel</h3>
          <p className="text-blue-800 mb-3">
            Le Bilan Carbone® couvre l'ensemble des émissions de GES liées aux activités de l'organisation, 
            réparties en 3 catégories (scopes) et 23 postes d'émissions standardisés.
          </p>
          <ul className="space-y-2 text-blue-700 ml-4">
            <li>• <strong>Scope 1</strong> : Émissions directes (combustion, procédés, fugitives)</li>
            <li>• <strong>Scope 2</strong> : Émissions indirectes liées à l'énergie</li>
            <li>• <strong>Scope 3</strong> : Autres émissions indirectes (transport, achats, déchets...)</li>
          </ul>
        </div>
      </section>

      {/* Étapes section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Comment organiser la collecte selon la méthodologie ABC ?
        </h2>
        <ol className="space-y-4 text-gray-700">
          <li className="flex gap-4">
            <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">1</span>
            <div>
              <strong>Définir le périmètre organisationnel</strong>
              <br />
              <span className="text-gray-600">
                Délimitez précisément les entités, sites et activités à inclure dans le bilan selon les critères de contrôle opérationnel ou financier.
              </span>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">2</span>
            <div>
              <strong>Cartographier les postes d'émissions</strong>
              <br />
              <span className="text-gray-600">
                Identifiez les 23 postes d'émissions applicables à votre organisation et les sources de données associées.
              </span>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">3</span>
            <div>
              <strong>Collecter les données d'activité</strong>
              <br />
              <span className="text-gray-600">
                Rassemblez les données quantitatives pour chaque poste : consommations énergétiques, distances parcourues, tonnes de matières, etc.
              </span>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">4</span>
            <div>
              <strong>Assurer la qualité des données</strong>
              <br />
              <span className="text-gray-600">
                Vérifiez la cohérence, la complétude et la représentativité des données collectées selon les exigences ABC.
              </span>
            </div>
          </li>
          <li className="flex gap-4">
            <span className="bg-primary text-white rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0">5</span>
            <div>
              <strong>Documenter les sources et hypothèses</strong>
              <br />
              <span className="text-gray-600">
                Tracez chaque donnée avec sa source, méthode de collecte et niveau d'incertitude pour assurer la transparence.
              </span>
            </div>
          </li>
        </ol>
      </section>

      {/* Tableau section */}
      <section className="mb-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">Tableau de collecte structuré</h2>
        <p className="text-gray-600 mb-6">
          Ce tableau complet suit la structure des postes d'émissions de la méthodologie Bilan Carbone® pour faciliter 
          la saisie et l'organisation de vos données d'activité. Il couvre tous les aspects nécessaires à un bilan exhaustif.
        </p>

        <div className="overflow-x-auto bg-white rounded-lg border shadow-sm">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-b">
                  Désignation
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-b">
                  Unité
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-b">
                  Quantité
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-500 uppercase tracking-wider border-b">
                  Source
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Nombre d'employés</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Nombre</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Gaz naturel consommé</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">m³</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Électricité achetée</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">kWh</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Consommation carburant flotte</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">L</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Distance moyenne déplacements pro</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">km</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Déchets générés</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">t</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
              </tr>
              <tr>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">Montant achats biens/services</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">TND</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <Button 
          onClick={handleDownload}
          disabled={isGenerating}
          className="mt-6 flex items-center gap-2"
          size="lg"
        >
          {isGenerating ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <Download className="h-5 w-5" />
          )}
          {isGenerating ? 'Génération en cours...' : 'Télécharger le tableau de collecte complet Bilan Carbone®'}
        </Button>
      </section>

      {/* Footer */}
      <footer className="bg-gray-50 p-6 rounded-lg border">
        <p className="text-gray-600 text-center">
          Ce tableau complet couvre tous les postes d'émissions de la méthodologie Bilan Carbone® pour une collecte exhaustive et structurée.
        </p>
      </footer>
    </div>
  );
};
