import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_LINKS = [
  { label: "Solutions", to: "/solutions" },
  { label: "Ressources", to: "/blog" },
  { label: "À propos", to: "/about" },
] as const;

const PLATFORM_LINKS = [
  { label: "Comptabilité carbone", to: "/bilan-carbone" },
  { label: "Facteurs d'émission", to: "/facteurs-emission" },
] as const;

export const HomeHeader: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [platformOpen, setPlatformOpen] = useState(false);
  const platformCloseTimer = useRef<number>();

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

  return (
    <header
      className="sticky top-0 z-50 w-full bg-white font-manrope"
      onMouseLeave={scheduleClosePlatform}
    >
      <div className="mx-auto grid h-[84px] max-w-[1440px] grid-cols-[1fr_auto] items-center px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-10">
        <Link to="/" className="justify-self-start">
          <img
            src="/logos/CarboScan-logo.png"
            alt="CarboScan"
            className="h-11 w-auto md:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-10 lg:flex">
          <Link
            to="/solutions"
            className="text-[15px] font-medium text-[#073D30]/85 transition-colors hover:text-[#073D30]"
          >
            Solutions
          </Link>

          <div className="relative" onMouseEnter={openPlatform}>
            <button
              type="button"
              aria-expanded={platformOpen}
              aria-haspopup="true"
              onClick={() => setPlatformOpen(true)}
              className="inline-flex items-center gap-1 text-[15px] font-medium text-[#073D30]/85 transition-colors hover:text-[#073D30]"
            >
              Plateforme
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform duration-200 ${platformOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {platformOpen && (
              <div
                className="absolute left-0 top-full z-50 min-w-[240px] pt-3"
                onMouseEnter={cancelPlatformClose}
              >
                <div className="rounded-2xl border border-[#EEF2F0] bg-white p-2 shadow-[0_16px_40px_rgba(7,61,48,0.1)]">
                  {PLATFORM_LINKS.map((link) => (
                    <Link
                      key={link.to}
                      to={link.to}
                      onClick={() => setPlatformOpen(false)}
                      className="block rounded-xl px-3 py-2.5 text-[14px] font-medium text-[#073D30] transition-colors hover:bg-[#F4F7F5]"
                    >
                      {link.label}
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>

          {NAV_LINKS.filter((link) => link.to !== "/solutions").map((link) => (
            <Link
              key={link.to}
              to={link.to}
              className="text-[15px] font-medium text-[#073D30]/85 transition-colors hover:text-[#073D30]"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-self-end gap-6 lg:flex">
          <Link
            to="/auth"
            className="text-[15px] font-medium text-[#073D30]/85 transition-colors hover:text-[#073D30]"
          >
            Se connecter
          </Link>
          <button
            type="button"
            onClick={() => navigate("/demo")}
            className="inline-flex h-11 items-center justify-center rounded-[10px] bg-[#07563F] px-5 text-[14px] font-semibold text-white transition-colors hover:bg-[#054C36]"
          >
            Demander une démo
          </button>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center justify-self-end rounded-[10px] text-[#073D30] lg:hidden"
              aria-label="Ouvrir le menu"
            >
              <Menu className="h-5 w-5" />
            </button>
          </SheetTrigger>
          <SheetContent side="right" className="w-80 bg-white pt-10">
            <nav className="flex flex-col gap-1">
              <p className="px-3 pb-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-[#073D30]/45">
                Plateforme
              </p>
              {PLATFORM_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="rounded-[10px] px-3 py-3 text-[15px] font-medium text-[#073D30] hover:bg-[#F4F7F5]"
                >
                  {link.label}
                </Link>
              ))}
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={() => setOpen(false)}
                  className="rounded-[10px] px-3 py-3 text-[15px] font-medium text-[#073D30] hover:bg-[#F4F7F5]"
                >
                  {link.label}
                </Link>
              ))}
              <Link
                to="/auth"
                onClick={() => setOpen(false)}
                className="rounded-[10px] px-3 py-3 text-[15px] font-medium text-[#073D30] hover:bg-[#F4F7F5]"
              >
                Se connecter
              </Link>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  navigate("/demo");
                }}
                className="mt-3 inline-flex h-12 items-center justify-center rounded-[10px] bg-[#07563F] px-5 text-[14px] font-semibold text-white"
              >
                Demander une démo
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </header>
  );
};
