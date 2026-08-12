import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ModuleLayout } from "../shared/ModuleLayout";
import { HorizontalNav, NavItem } from "@/components/layout/HorizontalNav";
import { Users, BarChart3, Send, FileText } from "lucide-react";
import { FournisseursHome } from "./FournisseursHome";
import { SupplierAddForm } from "./SupplierAddForm";
const navItems: NavItem[] = [
  { label: 'Avancée de l\'engagement', path: '', icon: Users },
  { label: 'CDP & SBTi', path: '/cdp-sbti', icon: FileText },
  { label: 'Émissions de GES', path: '/emissions', icon: BarChart3 },
  { label: 'Score CarboScan', path: '/scoring', icon: BarChart3 },
];

const PlaceholderPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
    <h2 className="text-xl font-semibold mb-2">{title}</h2>
    <p className="text-muted-foreground max-w-md">{description}</p>
  </div>
);

const FournisseursApp: React.FC = () => {
  return (
    <ModuleLayout moduleSlug="fournisseurs">
      <HorizontalNav items={navItems} basePath="/app/fournisseurs" />
      <Routes>
        <Route index element={<FournisseursHome />} />
        <Route path="nouveau" element={
          <SupplierAddForm />
        } />
        <Route path="fiche/:id" element={
          <PlaceholderPage title="Fiche fournisseur" description="Détails du fournisseur, scoring carbone, historique d'engagement et données d'émissions." />
        } />
        <Route path="cdp-sbti" element={
          <PlaceholderPage title="CDP & SBTi" description="Suivi des engagements CDP et Science-Based Targets de vos fournisseurs." />
        } />
        <Route path="emissions" element={
          <PlaceholderPage title="Émissions de GES" description="Vue consolidée des émissions de gaz à effet de serre de votre chaîne d'approvisionnement." />
        } />
        <Route path="scoring" element={
          <PlaceholderPage title="Score CarboScan" description="Méthodologie et détails du scoring carbone propriétaire CarboScan." />
        } />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </ModuleLayout>
  );
};

export default FournisseursApp;
