
import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardContent, CardFooter } from "@/components/ui/card";
import { PricingFeature } from "./PricingFeature";
import { useTranslation } from "react-i18next";


export interface PricingPlanFeature {
  title: string;
  description: string;
  included: boolean;
}

export interface PricingPlan {
  name: string;
  description: string;
  price: string;
  period: string;
  headerColor: string;
  buttonColor: string;
  link: string;
  popular: boolean;
  features: PricingPlanFeature[];
}

interface PricingCardProps {
  plan: PricingPlan;
  index: number;
}

export const PricingCard: React.FC<PricingCardProps> = ({ plan, index }) => {
  const { t } = useTranslation();
  
  return (
    <div 
      className={cn(
        "h-full flex flex-col",
        plan.popular && "lg:scale-105 z-10"
      )}
    >
      <Card className={cn(
        "h-full flex flex-col shadow-sm hover:shadow-md transition-shadow overflow-hidden", 
        plan.popular && "border-2 border-primary"
      )}>
        <div 
          style={{ backgroundColor: plan.headerColor }} 
          className="relative p-6 text-white"
        >
          {plan.popular && (
             <Badge className="absolute top-2 right-2 bg-amber-400 hover:bg-amber-500">
               {t("pricing.popular")}
             </Badge>
          )}
          <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
          <div className="mb-1">
            <span className="text-2xl font-bold">{plan.price}</span>
            {plan.period && <span className="text-white/80"> {plan.period}</span>}
          </div>
          <p className="text-white/90">{plan.description}</p>
        </div>
        
        <CardContent className="flex-grow p-6">
          <ul className="space-y-4">
            {plan.features.map((feature, featureIndex) => (
              <PricingFeature 
                key={featureIndex}
                title={feature.title}
                description={feature.description}
                included={feature.included}
              />
            ))}
          </ul>
        </CardContent>
        
        <CardFooter className="p-6 pt-2">
          <Link to={plan.link} className="w-full">
            <Button 
              style={{ 
                backgroundColor: plan.buttonColor, 
                borderColor: plan.buttonColor 
              }}
              className={cn(
                "w-full hover:opacity-90",
                index === 2 ? "bg-opacity-0 border-2 text-white hover:bg-opacity-10" : "text-white"
              )}
              variant={index === 2 ? "outline" : "default"}
            >
              {index === 2 ? t("pricing.contactUs") : t("pricing.discover")}
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
};
