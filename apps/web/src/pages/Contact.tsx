
import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { ContactContent } from "@/components/contact/ContactContent";

const Contact = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <ContactContent />
      <NewFooter />
    </div>
  );
};

export default Contact;
