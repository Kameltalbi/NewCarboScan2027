import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { CarboOmnibusContent } from "@/components/carbo-omnibus/CarboOmnibusContent";

const CarboOmnibus = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <CarboOmnibusContent />
      <NewFooter />
    </div>
  );
};

export default CarboOmnibus;