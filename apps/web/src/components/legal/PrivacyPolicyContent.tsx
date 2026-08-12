import React from "react";
import { Mail, Calendar, Lock, Shield, Cookie, Users, FileText, Building, MapPin, Phone, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

const PrivacyPolicyContent = () => {
  const { t } = useTranslation();
  
  return (
    <section className="py-16">
      <div className="container mx-auto px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">{t("legal.privacy.title")}</h1>
          
          <div className="mb-8 text-center text-gray-600">
            <p>{t("legal.privacy.lastUpdated")} {new Date().toLocaleDateString('fr-FR')}</p>
          </div>

          <div className="space-y-8">
            {/* Informations légales de l'entreprise */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <Building className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.companyInfo.title")}</h2>
              </div>
              <div className="space-y-2 text-gray-600">
                <p><strong>{t("legal.privacy.companyInfo.companyName")}</strong> DECARBOTECH</p>
                <p><strong>{t("legal.privacy.companyInfo.address")}</strong> 3 BIS MADINAT ERROUSSAFA SOUKRA, La Soukra, Ariana, 2036, Tunisie</p>
                <p><strong>{t("legal.privacy.companyInfo.phone")}</strong> +216 55 053 505</p>
                <p><strong>{t("legal.privacy.companyInfo.email")}</strong> contact@carboscan.io</p>
                <p><strong>{t("legal.privacy.companyInfo.website")}</strong> www.carboscan.io</p>
                <p><strong>{t("legal.privacy.companyInfo.taxRegime")}</strong> Soumis au régime réel</p>
                <p><strong>{t("legal.privacy.companyInfo.taxId")}</strong> 1953399W</p>
                <p><strong>{t("legal.privacy.companyInfo.activity")}</strong> Activités d'ingénierie</p>
              </div>
            </div>

            {/* Base légale */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <Shield className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.legalBasis.title")}</h2>
              </div>
              <p className="text-gray-600 mb-3">
                {t("legal.privacy.legalBasis.description")}
              </p>
              <ul className="list-disc pl-10 text-gray-600 space-y-1">
                <li><strong>{t("legal.privacy.legalBasis.law1")}</strong></li>
                <li><strong>{t("legal.privacy.legalBasis.law2")}</strong></li>
                <li><strong>{t("legal.privacy.legalBasis.law3")}</strong></li>
                <li><strong>{t("legal.privacy.legalBasis.consent")}</strong></li>
                <li><strong>{t("legal.privacy.legalBasis.contract")}</strong></li>
                <li><strong>{t("legal.privacy.legalBasis.legitimateInterest")}</strong></li>
              </ul>
            </div>

            {/* Données collectées */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <FileText className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.dataCollected.title")}</h2>
              </div>
              <p className="text-gray-600 mb-3">
                {t("legal.privacy.dataCollected.description")}
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">{t("legal.privacy.dataCollected.identification.title")}</h4>
                  <ul className="list-disc pl-6 text-gray-600 space-y-1 text-sm">
                    {(t("legal.privacy.dataCollected.identification.items", { returnObjects: true }) as string[]).map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">{t("legal.privacy.dataCollected.activity.title")}</h4>
                  <ul className="list-disc pl-6 text-gray-600 space-y-1 text-sm">
                    {(t("legal.privacy.dataCollected.activity.items", { returnObjects: true }) as string[]).map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            {/* Finalités du traitement */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <Users className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.purposes.title")}</h2>
              </div>
              <p className="text-gray-600 mb-3">
                {t("legal.privacy.purposes.description")}
              </p>
              <ul className="list-disc pl-10 text-gray-600 space-y-1">
                {(t("legal.privacy.purposes.items", { returnObjects: true }) as string[]).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Destinataires des données */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <Users className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.recipients.title")}</h2>
              </div>
              <p className="text-gray-600 mb-3">
                {t("legal.privacy.recipients.description")}
              </p>
              <ul className="list-disc pl-10 text-gray-600 space-y-1">
                {(t("legal.privacy.recipients.items", { returnObjects: true }) as string[]).map((item: string, index: number) => (
                  <li key={index}><strong>{item.split(':')[0]}</strong>{item.includes(':') ? item.split(':')[1] : ''}</li>
                ))}
              </ul>
              <p className="text-gray-600 mt-3">
                <strong>Important :</strong> {t("legal.privacy.recipients.important")}
              </p>
            </div>

            {/* Conservation des données */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <Calendar className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.retention.title")}</h2>
              </div>
              <p className="text-gray-600 mb-3">
                {t("legal.privacy.retention.description")}
              </p>
              <ul className="list-disc pl-10 text-gray-600 space-y-1">
                <li><strong>Données de compte :</strong> {t("legal.privacy.retention.accountData")}</li>
                <li><strong>Données de facturation :</strong> {t("legal.privacy.retention.billingData")}</li>
                <li><strong>Données techniques :</strong> {t("legal.privacy.retention.technicalData")}</li>
                <li><strong>Données de connexion :</strong> {t("legal.privacy.retention.connectionData")}</li>
                <li><strong>Cookies :</strong> {t("legal.privacy.retention.cookies")}</li>
              </ul>
              <p className="text-gray-600 mt-3">
                {t("legal.privacy.retention.note")}
              </p>
            </div>

            {/* Sécurité */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <Lock className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.security.title")}</h2>
              </div>
              <p className="text-gray-600 mb-3">
                {t("legal.privacy.security.description")}
              </p>
              <ul className="list-disc pl-10 text-gray-600 space-y-1">
                {(t("legal.privacy.security.items", { returnObjects: true }) as string[]).map((item: string, index: number) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </div>

            {/* Droits des utilisateurs */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <Users className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.rights.title")}</h2>
              </div>
              <p className="text-gray-600 mb-3">
                {t("legal.privacy.rights.description")}
              </p>
              <ul className="list-disc pl-10 text-gray-600 space-y-1">
                {(t("legal.privacy.rights.items", { returnObjects: true }) as string[]).map((item: string, index: number) => (
                  <li key={index}><strong>{item.split(':')[0]}</strong>{item.includes(':') ? item.split(':')[1] : ''}</li>
                ))}
              </ul>
              <p className="text-gray-600 mt-3">
                {t("legal.privacy.rights.contact")}
              </p>
              <div className="mt-3 p-4 bg-gray-50 rounded-lg">
                <p className="text-gray-700"><strong>{t("legal.privacy.rights.dpoEmail")}</strong> dpo@carboscan.io</p>
                <p className="text-gray-700"><strong>{t("legal.privacy.rights.dpoAddress")}</strong> 3 BIS MADINAT ERROUSSAFA SOUKRA, La Soukra, Ariana, 2036, Tunisie</p>
                <p className="text-gray-700"><strong>{t("legal.privacy.rights.dpoPhone")}</strong> +216 55 053 505</p>
              </div>
            </div>

            {/* Cookies */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <Cookie className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.cookies.title")}</h2>
              </div>
              <p className="text-gray-600 mb-3">
                {t("legal.privacy.cookies.description")}
              </p>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">{t("legal.privacy.cookies.technical.title")}</h4>
                  <ul className="list-disc pl-6 text-gray-600 space-y-1 text-sm">
                    {(t("legal.privacy.cookies.technical.items", { returnObjects: true }) as string[]).map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">{t("legal.privacy.cookies.analytical.title")}</h4>
                  <ul className="list-disc pl-6 text-gray-600 space-y-1 text-sm">
                    {(t("legal.privacy.cookies.analytical.items", { returnObjects: true }) as string[]).map((item: string, index: number) => (
                      <li key={index}>{item}</li>
                    ))}
                  </ul>
                </div>
              </div>
              <p className="text-gray-600 mt-3">
                {t("legal.privacy.cookies.management")}
              </p>
            </div>

            {/* Transferts internationaux */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <Globe className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.transfers.title")}</h2>
              </div>
              <p className="text-gray-600">
                {t("legal.privacy.transfers.description")}
              </p>
            </div>

            {/* Contact et réclamations */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <Mail className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.contact.title")}</h2>
              </div>
              <p className="text-gray-600 mb-3">
                {t("legal.privacy.contact.description")}
              </p>
              <div className="space-y-2 text-gray-600">
                <p><strong>{t("legal.privacy.contact.mainEmail")}</strong> contact@carboscan.io</p>
                <p><strong>{t("legal.privacy.contact.dpoEmail")}</strong> dpo@carboscan.io</p>
                <p><strong>{t("legal.privacy.contact.postalAddress")}</strong> DECARBOTECH, 3 BIS MADINAT ERROUSSAFA SOUKRA, La Soukra, Ariana, 2036, Tunisie</p>
                <p><strong>{t("legal.privacy.contact.phone")}</strong> +216 55 053 505</p>
              </div>
              <p className="text-gray-600 mt-3">
                <strong>Réclamations :</strong> {t("legal.privacy.contact.complaints")}
              </p>
            </div>

            {/* Mises à jour */}
            <div className="bg-white p-6 rounded-lg border border-gray-100 shadow-sm">
              <div className="flex items-start mb-4">
                <Calendar className="h-6 w-6 text-primary mr-3 mt-1" />
                <h2 className="text-xl font-semibold">{t("legal.privacy.updates.title")}</h2>
              </div>
              <p className="text-gray-600">
                {t("legal.privacy.updates.description")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default PrivacyPolicyContent;