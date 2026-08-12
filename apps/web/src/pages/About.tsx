
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { AboutContent } from "@/components/about/AboutContent";

const About = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <AboutContent />
      <NewFooter />
    </div>
  );
};

export default About;
