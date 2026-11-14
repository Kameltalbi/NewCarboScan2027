import React from "react";
import { Navigate, useParams } from "react-router-dom";
import { NouvelleSaisie } from "./NouvelleSaisie";

interface ActivityDataCollectorProps {
  defaultTab?: "scope1" | "scope2" | "scope3";
}

export const ActivityDataCollector: React.FC<ActivityDataCollectorProps> = ({ defaultTab }) => {
  const { scope } = useParams();
  const fromRoute = Number(scope);
  const fromTab = defaultTab === "scope1" ? 1 : defaultTab === "scope2" ? 2 : defaultTab === "scope3" ? 3 : null;
  const value = fromRoute === 1 || fromRoute === 2 || fromRoute === 3 ? fromRoute : fromTab;
  if (value !== 1 && value !== 2 && value !== 3) {
    return <Navigate to="/app/collecte/nouvelle" replace />;
  }
  return <NouvelleSaisie scope={value} />;
};
