import React from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, LabelList } from 'recharts';
import { Calculator, Factory, Zap, Truck } from "lucide-react";
import { useTranslation } from "react-i18next";

export const CarboScanCalculator: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const scopeData = [
    { name: t("calculator.scope1"), value: 25, color: '#FF6B6B', icon: Factory },
    { name: t("calculator.scope2"), value: 35, color: '#4ECDC4', icon: Zap },
    { name: t("calculator.scope3"), value: 40, color: '#45B7D1', icon: Truck },
  ];

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-white p-3 rounded-lg shadow-lg border">
        <p className="font-semibold text-gray-800">{data.name}</p>
        <p className="text-lg font-bold" style={{ color: data.color }}>
          {data.value}%
        </p>
      </div>
    );
  }
  return null;
};

const CustomLegend = ({ payload }: any) => {
  return (
    <div className="flex flex-col gap-3 mt-6">
      {payload.map((entry: any, index: number) => {
        const IconComponent = scopeData[index].icon;
        return (
          <div key={index} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div 
                className="w-4 h-4 rounded-full" 
                style={{ backgroundColor: entry.color }}
              />
              <IconComponent size={18} className="text-gray-600" />
            </div>
            <span className="text-sm text-gray-700 font-medium">
              {entry.payload.name}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// Fonction pour calculer la position des labels autour du graphique
const renderCustomizedLabel = (props: any) => {
  const { cx, cy, midAngle, innerRadius, outerRadius, value } = props;
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 30; // Distance du centre
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text 
      x={x} 
      y={y} 
      fill="#374151" 
      textAnchor={x > cx ? 'start' : 'end'} 
      dominantBaseline="central"
      className="text-sm font-bold"
      fontSize={14}
    >
      {`${value}%`}
    </text>
  );
};

  const handleCalculatorClick = () => {
    navigate('/empreinte-produit-calculator');
  };

  return (
    <section id="calculator-section" className="py-16 md:py-20 bg-gradient-to-br from-blue-50 to-green-50">
      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Section gauche - Contenu original */}
          <div className="text-center lg:text-left">
            <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
              {t("calculator.title")}
            </h2>
            
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              {t("calculator.subtitle")}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Button 
                onClick={handleCalculatorClick}
                size="lg" 
                className="bg-green-accent hover:bg-green-accent/90 text-white px-8 py-6 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-300"
              >
                <Calculator className="mr-2" size={20} />
                {t("calculator.button")}
              </Button>
            </div>

            <div className="mt-8 p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-white/20">
              <h3 className="text-xl font-semibold text-primary mb-4">
                {t("calculator.whyTitle")}
              </h3>
              <ul className="text-left space-y-2 text-gray-600">
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-accent rounded-full mt-2 flex-shrink-0" />
                  <span>{t("calculator.reason1")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-accent rounded-full mt-2 flex-shrink-0" />
                  <span>{t("calculator.reason2")}</span>
                </li>
                <li className="flex items-start gap-2">
                  <div className="w-2 h-2 bg-green-accent rounded-full mt-2 flex-shrink-0" />
                  <span>{t("calculator.reason3")}</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Section droite - Graphique camembert */}
          <div className="bg-white rounded-2xl p-8 shadow-xl border border-gray-100">
            <h3 className="text-2xl font-bold text-primary mb-2 text-center">
              {t("calculator.chartTitle")}
            </h3>
            <p className="text-gray-600 text-center mb-6">
              {t("calculator.chartSubtitle")}
            </p>
            
            <div className="relative">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={scopeData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={renderCustomizedLabel}
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {scopeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              
              {/* Centre du graphique */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">100%</div>
                  <div className="text-sm text-gray-600">{t("calculator.emissionsLabel")}</div>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <CustomLegend payload={scopeData.map((item, index) => ({ 
                ...item, 
                color: item.color,
                payload: item 
              }))} />
            </div>

            <div className="mt-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800 font-medium text-center">
                💡 {t("calculator.scope3Note")}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};