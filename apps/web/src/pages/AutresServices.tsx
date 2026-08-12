import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { AutresServicesContent } from "@/components/autres-services/AutresServicesContent";

const AutresServices: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <MainHeader />
      <main className="flex-grow">
        <AutresServicesContent />
      </main>
      <NewFooter />
    </div>
  );
};

export default AutresServices;
