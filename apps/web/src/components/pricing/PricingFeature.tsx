
import React from "react";
import { Check, X } from "lucide-react";

interface PricingFeatureProps {
  title: string;
  description?: string;
  included: boolean;
}

export const PricingFeature: React.FC<PricingFeatureProps> = ({ title, description, included }) => {
  return (
    <li className="flex items-start">
      {included ? (
        <Check className="h-5 w-5 text-primary mt-0.5 mr-2 flex-shrink-0" />
      ) : (
        <X className="h-5 w-5 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
      )}
      <div>
        <span className="font-medium">{title}</span>
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
      </div>
    </li>
  );
};
