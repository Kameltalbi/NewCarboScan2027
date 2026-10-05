import React from "react";
import { GenerateGesReport } from "@/components/reporting/GenerateGesReport";

export const ProReportsHome: React.FC = () => {
  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">Rapports</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bilan GES conforme GHG Protocol. PDF, présentation et classeur d'audit.
        </p>
      </div>
      <GenerateGesReport />
    </div>
  );
};

export default ProReportsHome;
