import React from "react";
import { useTranslation } from "react-i18next";

export const CarboScanReferences: React.FC = () => {
  const { t } = useTranslation();

  const references = [
    {
      title: `🥖 ${t("references.client1.title")}`,
      sector: t("references.client1.sector"),
      services: t("references.client1.services", { returnObjects: true })
    },
    {
      title: `🏢 ${t("references.client2.title")}`,
      sector: t("references.client2.sector"),
      services: t("references.client2.services", { returnObjects: true })
    },
    {
      title: `🏢 ${t("references.client3.title")}`,
      sector: t("references.client3.sector"),
      services: t("references.client3.services", { returnObjects: true })
    },
    {
      title: `📻 ${t("references.client4.title")}`,
      sector: t("references.client4.sector"),
      services: t("references.client4.services", { returnObjects: true })
    },
    {
      title: `🏭 ${t("references.client5.title")}`,
      sector: t("references.client5.sector"),
      services: t("references.client5.services", { returnObjects: true })
    }
  ];

  // Duplicate references for seamless infinite scroll
  const duplicatedReferences = [...references, ...references];

  return (
    <section className="py-16 bg-gray-50 text-center">
      <style>
        {`
          @keyframes scroll-references {
            0% {
              transform: translateX(0);
            }
            100% {
              transform: translateX(-50%);
            }
          }
          
          .scrolling-references {
            animation: scroll-references 30s linear infinite;
          }
          
          .scrolling-references:hover {
            animation-play-state: paused;
          }
        `}
      </style>
      
      <div className="container mx-auto px-4">
        <h2 className="text-primary text-3xl md:text-4xl font-bold mb-8">
          {t("references.title")}
        </h2>

        <div className="relative max-w-full mx-auto overflow-hidden">
          {/* Continuous Scrolling Container */}
          <div className="scrolling-references flex gap-6" style={{ width: `${duplicatedReferences.length * 384}px` }}>
            {duplicatedReferences.map((reference, index) => (
              <div
                key={`${reference.title}-${index}`}
                className="flex-shrink-0 w-80 md:w-96"
              >
                <div className="bg-white p-6 rounded-lg shadow-sm h-full mx-3">
                  <h3 className="text-green-accent text-xl font-semibold mb-2">
                    {reference.title}
                  </h3>
                  <p className="font-bold mb-4">{t("references.sector")} : {reference.sector}</p>
                  <ul className="pl-5 text-left text-gray-700 space-y-2">
                    {(reference.services as string[]).map((service, serviceIndex) => (
                      <li key={serviceIndex} className="text-sm">
                        {service}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <p className="text-primary text-lg text-center font-bold mt-8">
          {t("references.subtitle")}
        </p>
      </div>
    </section>
  );
};