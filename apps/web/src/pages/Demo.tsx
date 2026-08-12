
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { DemoContent } from "@/components/demo/DemoContent";

const Demo = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <DemoContent />
      <NewFooter />
    </div>
  );
};

export default Demo;
