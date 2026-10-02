import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModuleLayout } from "../shared/ModuleLayout";
import { HorizontalNav, NavItem } from "@/components/layout/HorizontalNav";
import {
  Users,
  BarChart3,
  Landmark,
  BookOpen,
  LayoutDashboard,
  FileBarChart,
  ShoppingCart,
  Upload,
  ShieldCheck,
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
import { PurchasesOverview } from "./PurchasesOverview";
import { PurchasesPage } from "./PurchasesPage";
import { PurchasesImportPage } from "./PurchasesImportPage";
import { PurchasesQualityPage } from "./PurchasesQualityPage";
import { useSupplierLabels } from "@/hooks/useSupplierLabels";
import { useAppData } from "@/contexts/AppDataContext";

const FournisseursApp: React.FC = () => {
  const L = useSupplierLabels();
  const { hasModule } = useAppData();

  if (!L.financedEmissionsEnabled && !hasModule("fournisseurs")) {
    return <Navigate to="/app/dashboard" replace />;
  }

  const navItems: NavItem[] = L.isBank
    ? [
        { label: "Méthode de calcul", path: "", icon: BookOpen },
        { label: "Vue d'ensemble", path: "/vue", icon: LayoutDashboard },
        { label: "Portefeuille", path: "/portefeuille", icon: Landmark },
        { label: "Contreparties", path: "/contreparties", icon: Users },
        { label: "Qualité des données", path: "/scoring", icon: BarChart3 },
        { label: "Rapport", path: "/rapport", icon: FileBarChart },
      ]
    : [
        { label: "Vue d'ensemble", path: "", icon: LayoutDashboard },
        { label: "Fournisseurs", path: "/liste", icon: Users },
        { label: "Achats", path: "/achats", icon: ShoppingCart },
        { label: "Import", path: "/import", icon: Upload },
        { label: "Qualité des données", path: "/qualite", icon: ShieldCheck },
      ];

  return (
    <ModuleLayout moduleSlug="fournisseurs">
      <HorizontalNav items={navItems} basePath="/app/fournisseurs" />
      <Routes>
        <Route
          index
          element={L.isBank ? <MethodeCalculPage /> : <PurchasesOverview />}
        />
        <Route
          path="vue"
          element={
            L.isBank ? <PortfolioEmissionsView /> : <Navigate to="" replace />
          }
        />
        <Route path="portefeuille" element={<FournisseursHome />} />
        <Route path="contreparties" element={<FournisseursHome />} />
        <Route path="liste" element={<FournisseursHome />} />
        <Route path="achats" element={<PurchasesPage />} />
        <Route path="import" element={<PurchasesImportPage />} />
        <Route path="qualite" element={<PurchasesQualityPage />} />
        <Route path="nouveau" element={<SupplierAddForm />} />
        <Route path="fiche/:id" element={<CounterpartyFiche />} />
        <Route path="cdp-sbti" element={<ClimateEngagementView />} />
        <Route
          path="emissions"
          element={
            L.isBank ? (
              <Navigate to="/app/fournisseurs/vue" replace />
            ) : (
              <PortfolioEmissionsView />
            )
          }
        />
        <Route
          path="scoring"
          element={L.isBank ? <ScoringQualityView /> : <PurchasesQualityPage />}
        />
        <Route
          path="rapport"
          element={
            L.isBank ? <PortfolioReportPage /> : <Navigate to="" replace />
          }
        />
        {/* legacy aliases */}
        <Route path="engagement" element={<Navigate to="/app/fournisseurs/liste" replace />} />
        <Route
          path="*"
          element={<Navigate to="/app/fournisseurs" replace />}
        />
      </Routes>
    </ModuleLayout>
  );
};

export default FournisseursApp;
