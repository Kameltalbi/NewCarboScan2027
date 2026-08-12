import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";

// Logos clients
import logoArchibat from "@/assets/clients/logo_archibat.jpeg";
import logoExpressFM from "@/assets/clients/logo_express_fm.jpg";
import logoIris from "@/assets/clients/logo_iris.jpg";
import logoEnnakl from "@/assets/clients/logo_ennakl.jpg";
import logoCcitf from "@/assets/clients/logo_ccitf.jpg";

interface ClientLogo {
  name: string;
  src: string;
}

const clients: ClientLogo[] = [
  { name: "La Baguette", src: "/logos-clients/logo-baguette-baguette.jpg" },
  { name: "Startup Village", src: "/logos-clients/logo startup village.png" },
  { name: "SMIP", src: "/logos-clients/logo smip.jpeg" },
  { name: "Selvador Food", src: "/logos/logo-salvador.png" },
  { name: "Archibat", src: logoArchibat },
  { name: "Express FM", src: logoExpressFM },
  { name: "IRIS", src: logoIris },
  { name: "ENNAKL Automobiles", src: logoEnnakl },
  { name: "CCI Tuniso Française", src: logoCcitf },
];

export const NewReferencesSection: React.FC = () => {
  const { i18n } = useTranslation();
  const [isPaused, setIsPaused] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const currentLanguage = i18n.language || "fr";

  useEffect(() => {
    if (trackRef.current) {
      trackRef.current.style.animationPlayState = isPaused ? "paused" : "running";
    }
  }, [isPaused]);

  // Duplicate logos for seamless loop
  const loop = [...clients, ...clients];

  return (
    <section id="references" className="py-16 sm:py-20 bg-gradient-to-b from-white via-[#F8FAFC] to-white border-y border-[#E5E7EB]">
      <div className="container mx-auto px-4 sm:px-6">
        {/* Header retiré */}

        {/* Bandeau de logos défilants N&B */}
        <div
          className="relative overflow-hidden"
          onMouseEnter={() => setIsPaused(true)}
          onMouseLeave={() => setIsPaused(false)}
        >
          {/* Fades latéraux */}
          <div className="absolute left-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
          <div className="absolute right-0 top-0 bottom-0 w-16 sm:w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

          <div
            ref={trackRef}
            className="flex animate-scroll-testimonials gap-12 sm:gap-16 lg:gap-20 w-max items-center"
          >
            {loop.map((client, index) => (
              <div
                key={`${client.name}-${index}`}
                className="flex-shrink-0 h-16 sm:h-20 lg:h-24 flex items-center justify-center"
              >
                <img
                  src={client.src}
                  alt={client.name}
                  loading="lazy"
                  className="max-h-full max-w-[180px] sm:max-w-[200px] lg:max-w-[220px] object-contain opacity-70 hover:opacity-100 transition-all duration-300 [filter:grayscale(100%)_contrast(1.2)] hover:[filter:none]"
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
