import React from "react";
import { useTranslation } from "react-i18next";
import { Zap, Droplet, Thermometer, Gauge, AlertCircle, CheckCircle2 } from "lucide-react";

export const DecarbotechLandingSensorsSection: React.FC = () => {
  const { t } = useTranslation();
  const sensors = t("decarbotechLanding.sensors.items", { returnObjects: true });
  const sensorsArray = Array.isArray(sensors) ? sensors : [];
  const benefits = t("decarbotechLanding.sensors.benefits", { returnObjects: true });
  const benefitsArray = Array.isArray(benefits) ? benefits : [];

  const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
    Zap,
    Zap2: Zap, // Alias for second Zap usage (gas consumption)
    Thermometer,
    Droplet,
    Droplet2: Droplet, // Alias for second Droplet usage (water)
    Gauge,
    AlertCircle,
  };

  return (
    <section className="py-20 bg-gradient-to-b from-white to-gray-50">
      <div className="container mx-auto px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
              {t("decarbotechLanding.sensors.title")}
            </h2>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              {t("decarbotechLanding.sensors.subtitle")}
            </p>
          </div>
          
          <div className="mb-12">
            <h3 className="text-xl font-semibold text-foreground mb-6">
              {t("decarbotechLanding.sensors.itemsTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {sensorsArray.map((sensor: { icon: string; text: string }, index: number) => {
                const IconComponent = iconMap[sensor.icon] || Zap;
                return (
                  <div
                    key={index}
                    className="bg-white p-6 rounded-xl border border-gray-200"
                  >
                    <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                      <IconComponent className="w-6 h-6 text-primary" />
                    </div>
                    <p className="text-foreground font-medium text-sm">{sensor.text}</p>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="text-xl font-semibold text-foreground mb-6">
              {t("decarbotechLanding.sensors.benefitsTitle")}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {benefitsArray.map((benefit: string, index: number) => (
                <div
                  key={index}
                  className="bg-white p-6 rounded-xl border border-gray-200 flex items-start gap-4"
                >
                  <div className="flex-shrink-0 w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-primary" />
                  </div>
                  <p className="text-foreground font-medium">{benefit}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

