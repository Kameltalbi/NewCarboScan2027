import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { GreenlyPricingPage } from "@/components/pricing/GreenlyPricingPage";

const Pricing = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <main className="flex-1">
        <GreenlyPricingPage />
      </main>
      <NewFooter />
    </div>
  );
};

export default Pricing;
