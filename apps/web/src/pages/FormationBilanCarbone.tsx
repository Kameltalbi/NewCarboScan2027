
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { FormationBilanCarboneContent } from "@/components/formation/FormationBilanCarboneContent";

const FormationBilanCarbone = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <FormationBilanCarboneContent />
      <NewFooter />
    </div>
  );
};

export default FormationBilanCarbone;
