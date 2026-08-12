
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import PrivacyPolicyContent from "@/components/legal/PrivacyPolicyContent";

const PrivacyPolicy = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      
      <main className="flex-grow">
        <PrivacyPolicyContent />
      </main>

      <NewFooter />
    </div>
  );
};

export default PrivacyPolicy;
