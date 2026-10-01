import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModuleLayout } from "../shared/ModuleLayout";
import { HorizontalNav, NavItem } from "@/components/layout/HorizontalNav";
import {
  Users,
  BarChart3,
  FileText,
  Landmark,
  BookOpen,
  LayoutDashboard,
  FileBarChart,
} from "lucide-react";
import { FournisseursHome } from "./FournisseursHome";
import { SupplierAddForm } from "./SupplierAddForm";
import { CounterpartyFiche } from "./CounterpartyFiche";
import { MethodeCalculPage, PortfolioReportPage } from "./MethodeCalculPage";
import {
  ClimateEngagementView,
  PortfolioEmissionsView,
  ScoringQualityView,
} from "./PortfolioViews";
import { useSupplierLabels } from "@/hooks/useSupplierLabels";

const FournisseursApp: React.FC = () => {
  const L = useSupplierLabels();

  const navItems: NavItem[] = L.isBank
    ? [
        { label: "Méthode de calcul", path: "/methode", icon: BookOpen },
        { label: "Vue d'ensemble", path: "", icon: LayoutDashboard },
        { label: "Portefeuille", path: "/portefeuille", icon: Landmark },
        { label: "Contreparties", path: "/contreparties", icon: Users },
        { label: "Qualité des données", path: "/scoring", icon: BarChart3 },
        { label: "Rapport", path: "/rapport", icon: FileBarChart },
      ]
    : [
        { label: "Avancée de l'engagement", path: "", icon: Users },
        { label: "CDP & SBTi", path: "/cdp-sbti", icon: FileText },
        { label: "Émissions de GES", path: "/emissions", icon: BarChart3 },
        { label: "Score CarboScan", path: "/scoring", icon: BarChart3 },
      ];

  return (
    <ModuleLayout moduleSlug="fournisseurs">
      <HorizontalNav items={navItems} basePath="/app/fournisseurs" />
      <Routes>
        <Route
          index
          element={L.isBank ? <PortfolioEmissionsView /> : <FournisseursHome />}
        />
        <Route path="portefeuille" element={<FournisseursHome />} />
        <Route path="contreparties" element={<FournisseursHome />} />
        <Route path="nouveau" element={<SupplierAddForm />} />
        <Route path="fiche/:id" element={<CounterpartyFiche />} />
        <Route path="cdp-sbti" element={<ClimateEngagementView />} />
        <Route
          path="emissions"
          element={
            L.isBank ? <Navigate to="" replace /> : <PortfolioEmissionsView />
          }
        />
        <Route path="scoring" element={<ScoringQualityView />} />
        <Route
          path="methode"
          element={L.isBank ? <MethodeCalculPage /> : <Navigate to="" replace />}
        />
        <Route
          path="rapport"
          element={L.isBank ? <PortfolioReportPage /> : <Navigate to="" replace />}
        />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </ModuleLayout>
  );
};

export default FournisseursApp;
