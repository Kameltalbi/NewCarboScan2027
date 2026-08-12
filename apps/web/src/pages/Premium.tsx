
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { PremiumContent } from "@/components/premium/PremiumContent";

const Premium = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <main className="flex-grow">
        <PremiumContent />
      </main>
      <NewFooter />
    </div>
  );
};

export default Premium;
