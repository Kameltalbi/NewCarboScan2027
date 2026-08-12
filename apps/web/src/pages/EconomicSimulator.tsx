import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import SimulationEconomiqueContent from "@/components/economic-simulator/SimulationEconomiqueContent";

export default function EconomicSimulator() {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      
      <main className="flex-grow">
        <SimulationEconomiqueContent />
      </main>

      <NewFooter />
    </div>
  );
}