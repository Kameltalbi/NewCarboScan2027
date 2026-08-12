import React, { useState } from "react";

import { MainHeader } from "@/components/MainHeader";
import { EmpreinteProduitCalculatorSurvey } from "@/components/empreinte-produit-calculator/EmpreinteProduitCalculatorSurvey";
import { CalculatorTypeSelector } from "@/components/empreinte-produit-calculator/CalculatorTypeSelector";

type CalculatorType = "select" | "entreprise";

const EmpreinteProduitCalculator = () => {
  const [type, setType] = useState<CalculatorType>("select");

  return (
    <div className="h-screen flex flex-col">
      <MainHeader />
      <main className="flex-1 flex min-h-0">
        {type === "select" && (
          <CalculatorTypeSelector onSelect={(t) => setType(t)} />
        )}
        {type === "entreprise" && <EmpreinteProduitCalculatorSurvey />}
      </main>
    </div>
  );
};

export default EmpreinteProduitCalculator;
