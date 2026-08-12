import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { DemoStepsWizard } from "@/components/demo/DemoStepsWizard";

const DemoSteps = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <MainHeader />
      <main className="flex-1">
        <DemoStepsWizard />
      </main>
      <NewFooter />
    </div>
  );
};

export default DemoSteps;
