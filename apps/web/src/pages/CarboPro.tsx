
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { CarboProContent } from "@/components/carbo-pro/CarboProContent";

const CarboPro = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <main className="flex-grow">
        <CarboProContent />
      </main>
      <NewFooter />
    </div>
  );
};

export default CarboPro;
