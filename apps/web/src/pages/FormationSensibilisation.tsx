import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { FormationSensibilisationContent } from "@/components/formation-sensibilisation/FormationSensibilisationContent";

const FormationSensibilisation = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <FormationSensibilisationContent />
      <NewFooter />
    </div>
  );
};

export default FormationSensibilisation;