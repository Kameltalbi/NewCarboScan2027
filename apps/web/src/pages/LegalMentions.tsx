
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import LegalMentionsContent from "@/components/legal/LegalMentionsContent";

const LegalMentions = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      
      <main className="flex-grow">
        <LegalMentionsContent />
      </main>

      <NewFooter />
    </div>
  );
};

export default LegalMentions;
