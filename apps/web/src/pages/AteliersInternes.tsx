import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { AteliersInternesContent } from "@/components/ateliers-internes/AteliersInternesContent";

const AteliersInternes = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <AteliersInternesContent />
      <NewFooter />
    </div>
  );
};

export default AteliersInternes;