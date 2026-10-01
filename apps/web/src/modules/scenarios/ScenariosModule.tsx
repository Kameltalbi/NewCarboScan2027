import React from "react";
import { WhatIfSimulator } from "./components/WhatIfSimulator";

/**
 * Module Scénarios Transition — simulateur What-If (même moteur / tables climate_scenarios*).
 * Remplace l'ancien multi-onglets ; pas de second moteur de calcul.
 */
export const ScenariosModule: React.FC = () => {
  return <WhatIfSimulator />;
};

export default ScenariosModule;
