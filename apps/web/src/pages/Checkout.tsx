import React from "react";
import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { CheckoutContent } from "@/components/checkout/CheckoutContent";

const Checkout = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <MainHeader />
      <main className="flex-1">
        <CheckoutContent />
      </main>
      <NewFooter />
    </div>
  );
};

export default Checkout;
