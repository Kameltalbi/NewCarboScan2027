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
  ShoppingCart,
} from "lucide-react";
import { FournisseursHome } from "./FournisseursHome";
import { SupplierAddForm } from "./SupplierAddForm";
import { CounterpartyFiche } from "./CounterpartyFiche";
import { MethodeCalculPage } from "./MethodeCalculPage";
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

  // Entreprise : 3 onglets seulement. Import / qualité = contextuels.
  const navItems: NavItem[] = L.isBank
    ? [
        { label: "Méthode de calcul", path: "", icon: BookOpen },
        { label: "Vue d'ensemble", path: "/vue", icon: LayoutDashboard },
        { label: "Portefeuille", path: "/portefeuille", icon: Landmark },
        { label: "Qualité des données", path: "/scoring", icon: BarChart3 },
      ]
    : [
        { label: "Vue d'ensemble", path: "", icon: LayoutDashboard },
        { label: "Achats", path: "/achats", icon: ShoppingCart },
        { label: "Fournisseurs", path: "/liste", icon: Users },
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
        <Route path="contreparties" element={<Navigate to="/app/fournisseurs/portefeuille" replace />} />
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
            L.isBank ? (
              <Navigate to="/app/fournisseurs/portefeuille" replace />
            ) : (
              <Navigate to="" replace />
            )
          }
        />
        <Route path="engagement" element={<Navigate to="/app/fournisseurs/liste" replace />} />
        <Route path="*" element={<Navigate to="/app/fournisseurs" replace />} />
      </Routes>
    </ModuleLayout>
  );
};

export default FournisseursApp;
