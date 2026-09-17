import React, { useEffect } from "react";
import { Navigate } from "react-router-dom";

// Ancien parcours /payment remplacé par le configurateur /pricing → /checkout.
// On redirige toute arrivée sur /payment vers le configurateur pour éviter
// le double formulaire (inscription + paiement).
const Payment: React.FC = () => {
  useEffect(() => {
    // no-op, redirection déclarative ci-dessous
  }, []);
  return <Navigate to="/contact" replace />;
};

export default Payment;
