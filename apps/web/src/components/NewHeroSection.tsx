import React, { useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowRight, Calculator } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
const heroVideo = "/media/hero-wind.mp4";
const heroPoster = "/media/hero-wind-poster.jpg";

export const NewHeroSection: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const ensurePlaying = () => {
      if (video.paused || video.ended) {
        video.currentTime = 0;
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            // Autoplay blocked or transient error; will retry on next interaction/ended event.
          });
        }
      }
    };

    const handleEnded = () => {
      video.currentTime = 0;
      video.play().catch(() => {});
    };

    video.addEventListener("ended", handleEnded);
    video.addEventListener("pause", ensurePlaying);
    const interval = window.setInterval(ensurePlaying, 1000);

    return () => {
      video.removeEventListener("ended", handleEnded);
      video.removeEventListener("pause", ensurePlaying);
      window.clearInterval(interval);
    };
  }, []);

  return (
    <section
      id="home"
      className="relative min-h-[640px] h-[92vh] max-h-[880px] flex items-center justify-center overflow-hidden bg-[#0B2E24]"
    >
      {/* Background video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        src={heroVideo}
        poster={heroPoster}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        aria-hidden="true"
      />

      {/* Cinematic overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#04211A]/85 via-[#04211A]/55 to-[#04211A]/92" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_25%,rgba(4,33,26,0.75)_100%)]" />

      {/* Content */}
      <div className="container relative z-10 mx-auto px-6 pt-24 pb-20 text-center">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 backdrop-blur-md rounded-full px-4 py-1.5 mb-8">
          <span className="w-2 h-2 rounded-full bg-[#4ADE80] animate-pulse" />
          <span className="text-xs font-semibold tracking-wide text-white">
            {t("homepage.hero.badge")}
          </span>
        </div>



        {/* Title */}
        <h1 className="mx-auto max-w-4xl text-4xl md:text-6xl lg:text-[4.25rem] font-bold leading-[1.05] tracking-tight text-white drop-shadow-[0_2px_24px_rgba(0,0,0,0.45)]">
          {t("homepage.hero.titlePart1")}
          <span className="text-[#4ADE80]">{t("homepage.hero.titleHighlight")}</span>
        </h1>

        {/* Subtitle */}
        <p className="mx-auto mt-7 max-w-xl text-base md:text-lg text-white/85 leading-relaxed">
          {t("homepage.hero.subtitle")}
        </p>

        {/* CTAs */}
        <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            className="bg-[#10B981] hover:bg-[#059669] text-white px-8 py-6 text-base font-semibold rounded-full shadow-xl shadow-[#0B2E24]/40 transition-all"
            onClick={() => navigate("/contact")}
          >
            {t("homepage.hero.ctaPrimary")}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <button
            type="button"
            onClick={() => navigate("/calculateur-carbone")}
            className="group inline-flex items-center gap-3 text-white font-semibold"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#BEF264] bg-white/10 backdrop-blur-md transition-transform group-hover:scale-105">
              <Calculator className="h-5 w-5 text-white" />
            </span>
            <span className="text-base">{t("homepage.hero.ctaSecondary")}</span>
          </button>
        </div>
      </div>

      {/* Curved bottom edge */}
      <svg
        className="absolute bottom-0 left-0 w-full h-[70px] md:h-[110px] z-10 text-background"
        viewBox="0 0 1440 110"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <path d="M0,110 L0,60 C360,110 1080,110 1440,50 L1440,110 Z" fill="currentColor" />
      </svg>
    </section>
  );
};
