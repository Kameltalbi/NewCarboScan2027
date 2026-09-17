import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  CloudFog,
  Flag,
  Globe2,
  Menu,
  RefreshCcw,
  Truck,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

type PlatformItem = {
  labelKey: string;
  descriptionKey: string;
  to: string;
  icon: LucideIcon;
  tone: "green" | "purple" | "amber";
};

type PlatformSection = {
  titleKey: string;
  items: PlatformItem[];
};

const PLATFORM_SECTIONS: PlatformSection[] = [
  {
    titleKey: "homeHeader.sections.carbonManagement",
    items: [
      {
        labelKey: "homeHeader.items.bilanCarbone.label",
        descriptionKey: "homeHeader.items.bilanCarbone.description",
        to: "/bilan-carbone",
        icon: Globe2,
        tone: "green",
      },
      {
        labelKey: "homeHeader.items.suppliers.label",
        descriptionKey: "homeHeader.items.suppliers.description",
        to: "/engagement-fournisseurs",
        icon: Truck,
        tone: "green",
      },
      {
        labelKey: "homeHeader.items.decarbonation.label",
        descriptionKey: "homeHeader.items.decarbonation.description",
        to: "/strategie-decarbonation",
        icon: Flag,
        tone: "green",
      },
      {
        labelKey: "homeHeader.items.wattbim.label",
        descriptionKey: "homeHeader.items.wattbim.description",
        to: "/wattbim",
        icon: Zap,
        tone: "amber",
      },
    ],
  },
  {
    titleKey: "homeHeader.sections.lca",
    items: [
      {
        labelKey: "homeHeader.items.emissionFactors.label",
        descriptionKey: "homeHeader.items.emissionFactors.description",
        to: "/facteurs-emission",
        icon: CloudFog,
        tone: "purple",
      },
      {
        labelKey: "homeHeader.items.acv.label",
        descriptionKey: "homeHeader.items.acv.description",
        to: "/acv-landing",
        icon: RefreshCcw,
        tone: "purple",
      },
    ],
  },
];

const toneClass = {
  green: "text-[#0F9F6E]",
  purple: "text-[#7C3AED]",
  amber: "text-amber-500",
} as const;

export const HomeHeader: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const platformCloseTimer = useRef<number>();

  const navLinks = useMemo(
    () =>
      [
        { label: t("navigation.solutions"), to: "/solutions" },
        { label: t("navigation.resources"), to: "/blog" },
        { label: t("navigation.about"), to: "/about" },
      ] as const,
    [t],
  );

  const cancelPlatformClose = () => {
    window.clearTimeout(platformCloseTimer.current);
  };

  const openPlatform = () => {
    cancelPlatformClose();
    setPlatformOpen(true);
  };

  const scheduleClosePlatform = () => {
    cancelPlatformClose();
    platformCloseTimer.current = window.setTimeout(() => setPlatformOpen(false), 160);
  };

  useEffect(() => {
    if (!platformOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setPlatformOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [platformOpen]);

  useEffect(
    () => () => {
      window.clearTimeout(platformCloseTimer.current);
    },
    [],
  );

  const closePlatform = () => setPlatformOpen(false);

  return (
    <header
      className="sticky top-0 z-50 w-full bg-white font-manrope"
      onMouseLeave={scheduleClosePlatform}
    >
      <div className="mx-auto grid h-[84px] max-w-[1440px] grid-cols-[1fr_auto] items-center px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-10">
        <Link to="/" className="justify-self-start">
          <BrandLogo variant="light" className="h-8 md:h-9" priority />
        </Link>

        <nav className="hidden items-center gap-10 lg:flex">
          <Link
            to="/solutions"
            className="text-[15px] font-medium text-[#073D30]/85 transition-colors hover:text-[#073D30]"
          >
            {t("navigation.solutions")}
          </Link>

          <div className="relative" onMouseEnter={openPlatform}>
            <button
              type="button"
              aria-expanded={platformOpen}
              aria-haspopup="true"
              onClick={() => setPlatformOpen(true)}
              className="inline-flex items-center gap-1 rounded-[4px] text-[15px] font-medium text-[#073D30]/85 transition-colors hover:text-[#073D30]"
            >
              {t("navigation.platform")}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${platformOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {platformOpen && (
              <div
                className="absolute left-1/2 top-full z-50 w-[640px] -translate-x-1/2 pt-3"
                onMouseEnter={cancelPlatformClose}
              >
                <div className="rounded-[4px] border border-[#EEF2F0] bg-white p-5 shadow-[0_16px_40px_rgba(7,61,48,0.1)]">
                  <div className="grid grid-cols-2 divide-x divide-[#EEF2F0]">
                    {PLATFORM_SECTIONS.map((section) => (
                      <div key={section.titleKey} className="px-4 first:pl-0 last:pr-0">
                        <p className="mb-3 text-[12px] font-medium text-[#6B7280]">
                          {t(section.titleKey)}
                        </p>
                        <div className="space-y-1">
                          {section.items.map((item) => {
                            const Icon = item.icon;
                            return (
                              <Link
                                key={item.to}
                                to={item.to}
                                onClick={closePlatform}
                                className="group flex items-start gap-3 rounded-[4px] p-2.5 transition-colors hover:bg-[#F4F7F5]"
                              >
                                <Icon
                                  className={`mt-0.5 h-5 w-5 shrink-0 ${toneClass[item.tone]}${item.tone === "amber" ? " fill-amber-300" : ""}`}
                                  strokeWidth={1.75}
                                  aria-hidden="true"
                                />
                                <span className="min-w-0">
                                  <span className="block text-[14px] font-semibold text-[#111827]">
                                    {t(item.labelKey)}
                                  </span>
                                  <span className="mt-0.5 block text-[13px] leading-snug text-[#6B7280]">
                                    {t(item.descriptionKey)}
                                  </span>
                                </span>
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {navLinks
            .filter((link) => link.to !== "/solutions")
            .map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="text-[15px] font-medium text-[#073D30]/85 transition-colors hover:text-[#073D30]"
              >
                {link.label}
              </Link>
            ))}

          <Link
            to="/wattbim"
            className="inline-flex items-center gap-1.5 text-[15px] font-semibold text-emerald-600 transition-colors hover:text-emerald-700"
          >
            <Zap className="h-4 w-4 fill-amber-300 text-amber-500" aria-hidden="true" />
            WattBim
          </Link>
        </nav>

        <div className="hidden items-center justify-self-end gap-3 lg:flex">
          <LanguageSwitcher />
          <button
            type="button"
            onClick={() => navigate("/auth")}
            className="inline-flex h-11 items-center justify-center rounded-[4px] border border-[#07563F] bg-transparent px-5 text-[14px] font-semibold text-[#07563F] transition-colors hover:bg-[#07563F]/10"
          >
            {t("navigation.cta.login")}
          </button>
          <button
            type="button"
            onClick={() => navigate("/bilan-gratuit")}
            className="inline-flex h-11 items-center justify-center rounded-[4px] bg-[#07563F] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#054C36]"
          >
            Auto-Diagnostic
          </button>
        </div>

        <div className="flex items-center justify-self-end gap-2 lg:hidden">
          <LanguageSwitcher />
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                className="inline-flex h-10 w-10 items-center justify-center rounded-[4px] text-[#073D30]"
                aria-label={t("navigation.openMenu")}
              >
                <Menu className="h-5 w-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 bg-white pt-10">
              <nav className="flex flex-col gap-1">
                {PLATFORM_SECTIONS.map((section) => (
                  <div key={section.titleKey} className="mb-3">
                    <p className="px-3 pb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#073D30]/45">
                      {t(section.titleKey)}
                    </p>
                    {section.items.map((item) => {
                      const Icon = item.icon;
                      return (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setOpen(false)}
                          className="flex items-start gap-3 rounded-[4px] px-3 py-2.5 hover:bg-[#F4F7F5]"
                        >
                          <Icon
                            className={`mt-0.5 h-5 w-5 shrink-0 ${toneClass[item.tone]}${item.tone === "amber" ? " fill-amber-300" : ""}`}
                            strokeWidth={1.75}
                            aria-hidden="true"
                          />
                          <span>
                            <span className="block text-[14px] font-semibold text-[#111827]">
                              {t(item.labelKey)}
                            </span>
                            <span className="mt-0.5 block text-[12px] leading-snug text-[#6B7280]">
                              {t(item.descriptionKey)}
                            </span>
                          </span>
                        </Link>
                      );
                    })}
                  </div>
                ))}
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setOpen(false)}
                    className="rounded-[4px] px-3 py-3 text-[15px] font-medium text-[#073D30] hover:bg-[#F4F7F5]"
                  >
                    {link.label}
                  </Link>
                ))}
                <Link
                  to="/wattbim"
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-[4px] px-3 py-3 text-[15px] font-semibold text-emerald-600 hover:bg-[#F4F7F5]"
                >
                  <Zap className="h-4 w-4 fill-amber-300 text-amber-500" aria-hidden="true" />
                  WattBim
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/auth");
                  }}
                  className="mt-3 inline-flex h-12 items-center justify-center rounded-[4px] border border-[#07563F] bg-transparent px-5 text-[14px] font-semibold text-[#07563F]"
                >
                  {t("navigation.cta.login")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    navigate("/bilan-gratuit");
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-[4px] bg-[#07563F] px-5 text-[14px] font-semibold text-white"
                >
                  Auto-Diagnostic
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
};
