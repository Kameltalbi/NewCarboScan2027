
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import CGVContent from "@/components/legal/CGVContent";

const CGV = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      
      <main className="flex-grow">
        <CGVContent />
      </main>

      <NewFooter />
    </div>
  );
};

export default CGV;
