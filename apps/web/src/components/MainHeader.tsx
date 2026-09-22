import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import { Separator } from "@/components/ui/separator";
import { Menu, X, ChevronDown, Leaf, BookOpen, Users, Phone, BarChart3, Calculator, FileText, Award, Shield, GraduationCap, PenTool, Package, Database, Zap, Target, HelpCircle } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/contexts/AppDataContext";

export const MainHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, i18n } = useTranslation();
  const diagnosticLabel = i18n.language.startsWith("en") ? "Carbon Diagnostic 360°" : "Diagnostic 360°";
  const isMobile = useIsMobile();
  const { isSuperAdmin, hasModule } = useAppData();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const isHome = location.pathname === "/";
  // Light homepage hero — never use the old dark transparent header on `/`
  const transparent = false;
  const homeOverHero = isHome && !scrolled;
  const homeHeaderClass = homeOverHero
    ? "bg-[#F7F8F6]/85 border-b border-transparent backdrop-blur-md"
    : "bg-white border-b";

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);


  // Fonction pour obtenir l'URL du module Empreinte Produit
  const getEmpreinteProduitUrl = () => {
    if (user && (isSuperAdmin || hasModule('empreinte-produit'))) {
      return '/app/empreinte-produit';
    }
    return '/empreinte-produit';
  };

  // Lien WattBim visible
  const wattBimVisible = true;

  // Force reload - ACV module now accessible from header

  const handleStartClick = () => {
    // Check if we're on the home page
    if (window.location.pathname === '/') {
      // Try to scroll to the tester section
      const targetIds = ['tester', 'calculator-section'];
      for (const id of targetIds) {
        const el = document.getElementById(id);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth' });
          return;
        }
      }
    }
    // Otherwise, navigate to the calculator
    navigate('/calculateur-carbone');
  };
  if (isMobile) {
    return (
      <header className={`sticky top-0 z-50 w-full transition-colors duration-300 ${isHome ? homeHeaderClass : "border-b bg-white/95 backdrop-blur-lg"}`}>
        <div className="container flex h-24 items-center justify-between px-4">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2 transition-transform hover:scale-105">
            <BrandLogo variant="light" className="h-16" priority />
          </Link>

          {/* Mobile Menu Trigger + Language Switcher */}
          <div className="flex items-center space-x-2">
            <div className={transparent ? "[&_button]:text-white [&_button:hover]:bg-white/10 [&_svg]:text-white" : ""}>
              <LanguageSwitcher />
            </div>
            <Sheet open={isOpen} onOpenChange={setIsOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className={`p-2 ${transparent ? "text-white hover:bg-white/10" : ""}`}>
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80 pt-0 bg-white border-l shadow-xl">
                <div className="flex flex-col h-full">
                  {/* Header with Close */}
                  <div className="flex items-center justify-between px-6 py-4 border-b bg-white">
                    <span className="text-lg font-semibold text-gray-900">{t("navigation.menu")}</span>
                    <SheetClose asChild>
                      <Button variant="ghost" size="sm" className="p-2">
                        <X className="h-5 w-5" />
                      </Button>
                    </SheetClose>
                  </div>

                  {/* Navigation with Accordion */}
                  <div className="flex-1 overflow-y-auto bg-white">
                    <Accordion type="multiple" className="w-full px-4 py-4">
                      {/* Solutions */}
                      <AccordionItem value="solutions" className="border-b border-gray-100 bg-white">
                        <AccordionTrigger className="hover:no-underline py-4 text-left">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                              <BarChart3 className="h-4 w-4 text-emerald-600" />
                            </div>
                            <span className="font-medium text-gray-900">{t("navigation.solutions")}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="space-y-3 ml-11">
                            <SheetClose asChild>
                              <Link to="/bilan-carbone" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900 mb-1">{t("navigation.solutionsMenu.bilanCarbone.title")}</div>
                                <p className="text-xs text-gray-600">{t("navigation.solutionsMenu.bilanCarbone.description")}</p>
                              </Link>
                            </SheetClose>
                            
                            <SheetClose asChild>
                              <Link to={getEmpreinteProduitUrl()} className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900 mb-1">{t("navigation.solutionsMenu.empreinteProduit.title")}</div>
                                <p className="text-xs text-gray-600">{t("navigation.solutionsMenu.empreinteProduit.description")}</p>
                              </Link>
                            </SheetClose>
                            
                            <SheetClose asChild>
                              <Link to="/acv-landing" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900 mb-1">{t("navigation.solutionsMenu.acv.title")}</div>
                                <p className="text-xs text-gray-600">{t("navigation.solutionsMenu.acv.description")}</p>
                              </Link>
                            </SheetClose>
                            
                            <SheetClose asChild>
                              <Link to="/cbam" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900 mb-1">{t("navigation.solutionsMenu.cbam.title")}</div>
                                <p className="text-xs text-gray-600">{t("navigation.solutionsMenu.cbam.description")}</p>
                              </Link>
                            </SheetClose>
                            
                            <SheetClose asChild>
                              <Link to="/collect" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900 mb-1">{t("navigation.solutionsMenu.collect.title")}</div>
                                <p className="text-xs text-gray-600">{t("navigation.solutionsMenu.collect.description")}</p>
                              </Link>
                            </SheetClose>
                            
                            <SheetClose asChild>
                              <Link to="/decarbotech" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900 mb-1">{t("navigation.solutionsMenu.monitoring.title")}</div>
                                <p className="text-xs text-gray-600">{t("navigation.solutionsMenu.monitoring.description")}</p>
                              </Link>
                            </SheetClose>
                            
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Academy */}
                      <div className="py-4 border-b border-gray-100 bg-white">
                        <SheetClose asChild>
                          <Link to="/carboscan-academy" className="flex items-center space-x-3 p-2 rounded-[4px] hover:bg-gray-50 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center">
                              <GraduationCap className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="font-medium text-gray-900">{t("navigation.academy")}</span>
                          </Link>
                        </SheetClose>
                      </div>

                      {/* WattBim — accès rapide (masqué jusqu'au 20/08/2026) */}
                      {wattBimVisible && (
                        <div className="py-4 border-b border-gray-100 bg-white">
                          <SheetClose asChild>
                            <Link
                              to="/wattbim"
                              className="flex items-center space-x-3 p-2 rounded-lg bg-[hsl(45_95%_55%)] hover:bg-[hsl(45_95%_60%)] transition-colors"
                            >
                              <div className="w-8 h-8 rounded-lg bg-white/30 flex items-center justify-center">
                                <Zap className="h-4 w-4 text-[hsl(160_55%_12%)]" />
                              </div>
                              <span className="font-semibold text-[hsl(160_55%_12%)]">WattBim</span>
                            </Link>
                          </SheetClose>
                        </div>
                      )}

                      {/* Ressources */}
                      <AccordionItem value="ressources" className="border-b border-gray-100 bg-white">
                        <AccordionTrigger className="hover:no-underline py-4 text-left">
                          <div className="flex items-center space-x-3">
                            <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-purple-600" />
                            </div>
                            <span className="font-medium text-gray-900">{t("navigation.resources")}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="pb-4">
                          <div className="space-y-3 ml-11">
                            <SheetClose asChild>
                              <Link to="/calculateur-carbone" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900">{t("navigation.carbonCalculator")}</div>
                              </Link>
                            </SheetClose>


                            <SheetClose asChild>
                              <Link to="/cbam-calculator" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900">{t("navigation.cbamCalculator")}</div>
                              </Link>
                            </SheetClose>

                            <SheetClose asChild>
                              <Link to="/calculateur-roi" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900">{t("navigation.roiCalculator")}</div>
                              </Link>
                            </SheetClose>


                            <SheetClose asChild>
                              <Link to="/blog" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900 mb-1">{t("navigation.blog")}</div>
                                <p className="text-xs text-gray-600">{t("navigation.blogDescription")}</p>
                              </Link>
                            </SheetClose>

                            <SheetClose asChild>
                              <Link to="/faq" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900 mb-1">{t("navigation.faq")}</div>
                                <p className="text-xs text-gray-600">{t("navigation.faqDescription")}</p>
                              </Link>
                            </SheetClose>

                            <SheetClose asChild>
                              <Link to="/about" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900 mb-1">{t("navigation.about")}</div>
                                <p className="text-xs text-gray-600">{t("navigation.company")}</p>
                              </Link>
                            </SheetClose>

                            <SheetClose asChild>
                              <Link to="/team" className="block p-3 rounded-[4px] hover:bg-gray-50 transition-colors">
                                <div className="text-sm font-medium text-gray-900 mb-1">{t("navigation.ourTeam.title")}</div>
                                <p className="text-xs text-gray-600">{t("navigation.ourTeam.description")}</p>
                              </Link>
                            </SheetClose>
                          </div>
                        </AccordionContent>
                      </AccordionItem>

                      {/* Contact */}
                      <div className="py-4 border-b border-gray-100 bg-white">
                        <SheetClose asChild>
                          <Link to="/contact" className="flex items-center space-x-3 p-2 rounded-[4px] hover:bg-gray-50 transition-colors">
                            <div className="w-8 h-8 rounded-lg bg-teal-50 flex items-center justify-center">
                              <Phone className="h-4 w-4 text-teal-600" />
                            </div>
                            <span className="font-medium text-gray-900">{t("navigation.contact")}</span>
                          </Link>
                        </SheetClose>
                      </div>

                    </Accordion>
                  </div>

                  {/* Bottom Fixed CTA Section */}
                  <div className="border-t border-gray-100 p-4 bg-white">
                    <div className="space-y-3">
                      <SheetClose asChild>
                        <Button 
                          onClick={() => navigate("/auth")}
                          variant="outline"
                          className="w-full border-[#16585C] text-[#16585C] bg-transparent hover:bg-[#16585C]/10 h-11 font-medium rounded-[4px]"
                        >
                          {t("navigation.cta.login")}
                        </Button>
                      </SheetClose>

                      <SheetClose asChild>
                        <Button 
                          onClick={() => navigate("/bilan-gratuit")}
                          className="w-full bg-[#16585C] hover:bg-[#0F4144] text-white h-11 font-medium rounded-[4px]"
                        >
                          {diagnosticLabel}
                        </Button>
                      </SheetClose>

                      {/* Language Switcher */}
                      <div className="pt-3 border-t border-gray-100">
                        <LanguageSwitcher />
                      </div>

                      {isSuperAdmin && (
                        <SheetClose asChild>
                          <Button 
                            onClick={() => navigate("/superadmin/dashboard")}
                            variant="outline"
                            size="sm"
                            className="w-full border-red-200 text-red-600 hover:bg-red-50"
                          >
                            <Shield className="h-4 w-4 mr-2" />
                            SuperAdmin
                          </Button>
                        </SheetClose>
                      )}
                    </div>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className={`sticky top-0 z-50 w-full transition-colors duration-300 ${isHome ? homeHeaderClass : "bg-white border-b"}`}>
      <div className="container mx-auto px-6">
        <div className="flex h-24 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-3">
            <BrandLogo variant="light" className="h-16" priority />
          </Link>

          {/* Navigation Menu */}
          <NavigationMenu className="hidden lg:flex">
            <NavigationMenuList className="gap-0">
              {/* Solutions */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={`h-10 px-4 py-2 text-base font-semibold ${transparent ? "text-white/90 hover:text-white data-[state=open]:text-white" : "text-gray-700 hover:text-gray-900 data-[state=open]:text-gray-900"} bg-transparent hover:bg-transparent data-[state=open]:bg-transparent`}>
                  {t("navigation.solutions")}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[700px] p-6">
                    <div className="grid grid-cols-2 gap-4">
                      <Link to="/bilan-carbone" className="group block select-none rounded-[4px] p-4 hover:bg-gray-50 transition-colors border-0">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center mt-0.5">
                            <BarChart3 className="h-5 w-5 text-emerald-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-emerald-600 mb-1">
                              {t("navigation.solutionsMenu.bilanCarbone.title")}
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">
                              {t("navigation.solutionsMenu.bilanCarbone.description")}
                            </p>
                          </div>
                        </div>
                      </Link>
                      
                      <Link to={getEmpreinteProduitUrl()} className="group block select-none rounded-[4px] p-4 hover:bg-gray-50 transition-colors border-0">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mt-0.5">
                            <Package className="h-5 w-5 text-blue-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 mb-1">
                              {t("navigation.solutionsMenu.empreinteProduit.title")}
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">
                              {t("navigation.solutionsMenu.empreinteProduit.description")}
                            </p>
                          </div>
                        </div>
                      </Link>
                      
                      <Link to="/acv-landing" className="group block select-none rounded-[4px] p-4 hover:bg-gray-50 transition-colors border-0">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mt-0.5">
                            <Leaf className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-purple-600 mb-1">
                              {t("navigation.solutionsMenu.acv.title")}
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">
                              {t("navigation.solutionsMenu.acv.description")}
                            </p>
                          </div>
                        </div>
                      </Link>
                      
                      <Link to="/cbam" className="group block select-none rounded-[4px] p-4 hover:bg-gray-50 transition-colors border-0">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mt-0.5">
                            <Shield className="h-5 w-5 text-orange-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-orange-600 mb-1">
                              {t("navigation.solutionsMenu.cbam.title")}
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">
                              {t("navigation.solutionsMenu.cbam.description")}
                            </p>
                          </div>
                        </div>
                      </Link>
                      
                      <Link to="/collect" className="group block select-none rounded-[4px] p-4 hover:bg-gray-50 transition-colors border-0">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-teal-50 flex items-center justify-center mt-0.5">
                            <Database className="h-5 w-5 text-teal-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-teal-600 mb-1">
                              {t("navigation.solutionsMenu.collect.title")}
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">
                              {t("navigation.solutionsMenu.collect.description")}
                            </p>
                          </div>
                        </div>
                      </Link>
                      
                      <Link to="/decarbotech" className="group block select-none rounded-[4px] p-4 hover:bg-gray-50 transition-colors border-0">
                        <div className="flex items-start space-x-3">
                          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mt-0.5">
                            <Target className="h-5 w-5 text-green-600" />
                          </div>
                          <div className="flex-1">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-green-600 mb-1">
                              {t("navigation.solutionsMenu.monitoring.title")}
                            </div>
                            <p className="text-sm text-gray-500 leading-relaxed">
                              {t("navigation.solutionsMenu.monitoring.description")}
                            </p>
                          </div>
                        </div>
                      </Link>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Secteurs */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={`h-10 px-4 py-2 text-base font-semibold ${transparent ? "text-white/90 hover:text-white data-[state=open]:text-white" : "text-gray-700 hover:text-gray-900 data-[state=open]:text-gray-900"} bg-transparent hover:bg-transparent data-[state=open]:bg-transparent`}>
                  {t("navigation.sectors")}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[360px] p-4">
                    <div className="space-y-1">
                      {[
                        { id: "industry", to: "/contact?secteur=industrie" },
                        { id: "building", to: "/wattbim" },
                        { id: "agro", to: "/contact?secteur=agro" },
                        { id: "services", to: "/contact?secteur=services" },
                        { id: "finance", to: "/contact?secteur=finance" },
                        { id: "cbamExport", to: "/cbam" },
                      ].map((s) => (
                        <Link key={s.id} to={s.to} className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                          {t(`navigation.sectorsMenu.${s.id}`)}
                        </Link>
                      ))}
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* Ressources */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={`h-10 px-4 py-2 text-base font-semibold ${transparent ? "text-white/90 hover:text-white data-[state=open]:text-white" : "text-gray-700 hover:text-gray-900 data-[state=open]:text-gray-900"} bg-transparent hover:bg-transparent data-[state=open]:bg-transparent`}>
                  {t("navigation.resources")}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[680px] p-6">
                    <div className="grid grid-cols-2 gap-6">
                      {/* Colonne calculateurs */}
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("navigation.freeTools")}</p>
                        <Link to="/calculateur-carbone" className="group flex items-center gap-3 select-none rounded-lg p-3 hover:bg-gray-50 transition-colors border-0">
                          <Calculator className="h-5 w-5 text-emerald-600" />
                          <span className="text-sm font-medium text-gray-900 group-hover:text-emerald-600">{t("navigation.carbonCalculator")}</span>
                        </Link>

                        <Link to="/cbam-calculator" className="group flex items-center gap-3 select-none rounded-lg p-3 hover:bg-gray-50 transition-colors border-0">
                          <Shield className="h-5 w-5 text-emerald-600" />
                          <span className="text-sm font-medium text-gray-900 group-hover:text-emerald-600">{t("navigation.cbamCalculator")}</span>
                        </Link>

                        <Link to="/calculateur-roi" className="group flex items-center gap-3 select-none rounded-lg p-3 hover:bg-gray-50 transition-colors border-0">
                          <Zap className="h-5 w-5 text-emerald-600" />
                          <span className="text-sm font-medium text-gray-900 group-hover:text-emerald-600">{t("navigation.roiCalculator")}</span>
                        </Link>
                      </div>

                      {/* Colonne contenus */}
                      <div className="space-y-3">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">{t("navigation.contents")}</p>
                        <Link to="/blog" className="group block select-none rounded-lg p-3 hover:bg-gray-50 transition-colors border-0">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mt-0.5">
                              <PenTool className="h-5 w-5 text-purple-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 group-hover:text-purple-600 mb-1">
                                {t("navigation.blog")}
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed">
                                {t("navigation.blogDescription")}
                              </p>
                            </div>
                          </div>
                        </Link>

                        <Link to="/faq" className="group block select-none rounded-lg p-3 hover:bg-gray-50 transition-colors border-0">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mt-0.5">
                              <HelpCircle className="h-5 w-5 text-blue-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 group-hover:text-blue-600 mb-1">
                                {t("navigation.faq")}
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed">
                                {t("navigation.faqDescription")}
                              </p>
                            </div>
                          </div>
                        </Link>

                        <Link to="/carboscan-academy" className="group block select-none rounded-lg p-3 hover:bg-gray-50 transition-colors border-0">
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center mt-0.5">
                              <GraduationCap className="h-5 w-5 text-green-600" />
                            </div>
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900 group-hover:text-green-600 mb-1">
                                {t("navigation.academy")}
                              </div>
                              <p className="text-xs text-gray-500 leading-relaxed">
                                {t("navigation.academyDescription")}
                              </p>
                            </div>
                          </div>
                        </Link>
                      </div>
                    </div>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* À propos */}
              <NavigationMenuItem>
                <NavigationMenuTrigger className={`h-10 px-4 py-2 text-base font-semibold ${transparent ? "text-white/90 hover:text-white data-[state=open]:text-white" : "text-gray-700 hover:text-gray-900 data-[state=open]:text-gray-900"} bg-transparent hover:bg-transparent data-[state=open]:bg-transparent`}>
                  {t("navigation.about")}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <div className="w-[320px] p-4 space-y-1">
                    <Link to="/about" className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                      {t("navigation.company")}
                    </Link>
                    <Link to="/team" className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                      {t("navigation.ourTeam.title")}
                    </Link>
                    <Link to="/contact" className="block rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-gray-900">
                      {t("navigation.contact")}
                    </Link>
                  </div>
                </NavigationMenuContent>
              </NavigationMenuItem>

              {/* WattBim — accent énergie (masqué jusqu'au 20/08/2026) */}
              {wattBimVisible && (
                <NavigationMenuItem>
                  <Link
                    to="/wattbim"
                    className={`ml-2 h-10 px-3 py-2 text-base font-semibold transition-colors flex items-center gap-1.5 ${transparent ? "text-[#4ADE80] hover:text-white" : "text-emerald-600 hover:text-emerald-700"}`}
                  >
                    <Zap className="h-4 w-4 fill-amber-300 text-amber-500" />
                    WattBim
                  </Link>
                </NavigationMenuItem>
              )}

            </NavigationMenuList>
          </NavigationMenu>

          {/* Right Side */}
          <div className="flex items-center space-x-4">
            <div className={transparent ? "[&_button]:text-white [&_button:hover]:bg-white/10 [&_svg]:text-white" : ""}>
              <LanguageSwitcher />
            </div>
            
            {/* CTA Buttons */}
            <div className="hidden md:flex items-center space-x-3">
              <Button 
                onClick={() => navigate("/auth")}
                variant="outline"
                className={`bg-transparent font-medium px-4 py-2 h-10 rounded-[4px] ${transparent ? "border-white/40 text-white hover:bg-white/10" : "border-[#16585C] text-[#16585C] hover:bg-[#16585C]/10"}`}
              >
                {t("navigation.cta.login")}
              </Button>
              <Button 
                onClick={() => navigate("/bilan-gratuit")}
                className={`font-medium px-5 py-2 h-10 rounded-[4px] ${transparent ? "bg-[#10B981] hover:bg-[#059669] text-white shadow-lg shadow-[#10B981]/20" : "bg-[#16585C] hover:bg-[#0F4144] text-white"}`}
              >
                {diagnosticLabel}
              </Button>
            </div>

            {isSuperAdmin && (
              <Button 
                onClick={() => navigate("/superadmin/dashboard")}
                variant="outline"
                size="sm"
                className="border-red-200 text-red-600 hover:bg-red-50"
              >
                <Shield className="h-4 w-4 mr-2" />
                SuperAdmin
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};