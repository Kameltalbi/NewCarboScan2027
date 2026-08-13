import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

const NAV_LINKS = [
  { label: "Solutions", to: "/solutions" },
  { label: "Plateforme", to: "/bilan-carbone" },
  { label: "Ressources", to: "/blog" },
  { label: "À propos", to: "/about" },
] as const;

export const HomeHeader: React.FC = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full bg-white font-manrope">
      <div className="mx-auto grid h-[84px] max-w-[1440px] grid-cols-[1fr_auto] items-center px-6 lg:grid-cols-[1fr_auto_1fr] lg:px-10">
        <Link to="/" className="justify-self-start">
          <img
            src="/logos/CarboScan-logo.png"
            alt="CarboScan"
            className="h-11 w-auto md:h-12"
          />
        </Link>

        <nav className="hidden items-center gap-10 lg:flex">
          {NAV_LINKS.map((link) => (
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
