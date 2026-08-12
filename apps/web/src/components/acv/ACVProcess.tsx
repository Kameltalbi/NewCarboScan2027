import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Globe, Lightbulb, Zap, RefreshCw, FileText, Target } from "lucide-react";

const processSteps = [
  {
    id: 1,
    icon: Globe,
    title: "Collecte de données",
    description: "Rassemblement exhaustif des informations sur l'ensemble du cycle de vie",
    color: "from-emerald-500 to-emerald-600",
    bgColor: "bg-emerald-50",
    borderColor: "border-emerald-200",
    delay: 0
  },
  {
    id: 2,
    icon: Lightbulb,
    title: "Analyse et structuration",
    description: "Organisation et validation des données collectées",
    color: "from-amber-500 to-amber-600",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    delay: 200
  },
  {
    id: 3,
    icon: Zap,
    title: "Modélisation",
    description: "Transformation des données en modèles environnementaux",
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    delay: 400
  },
  {
    id: 4,
    icon: RefreshCw,
    title: "Calculs d'impacts",
    description: "Quantification des impacts environnementaux",
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    delay: 600
  },
  {
    id: 5,
    icon: FileText,
    title: "Synthèse",
    description: "Formalisation des résultats et recommandations",
    color: "from-indigo-500 to-indigo-600",
    bgColor: "bg-indigo-50",
    borderColor: "border-indigo-200",
    delay: 800
  },
  {
    id: 6,
    icon: Target,
    title: "Optimisation",
    description: "Mise en œuvre des améliorations identifiées",
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    delay: 1000
  }
];

export const ACVProcess = () => {
  const [visibleSteps, setVisibleSteps] = useState<number[]>([]);
  const [hoveredStep, setHoveredStep] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      processSteps.forEach((step, index) => {
        setTimeout(() => {
          setVisibleSteps(prev => [...prev, step.id]);
        }, step.delay);
      });
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-16 md:py-20 bg-gradient-to-br from-background via-secondary/5 to-background">
      <div className="container mx-auto px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Left side - Title and description */}
            <div className="lg:sticky lg:top-8">
              <div className="space-y-6">
                <h2 className="text-3xl md:text-5xl font-bold leading-tight">
                  L'ACV : un processus 
                  <span className="block bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                    structuré et rigoureux
                  </span>
                </h2>
                <p className="text-lg text-muted-foreground leading-relaxed">
                  L'Analyse de Cycle de Vie suit une méthodologie normée qui garantit 
                  la fiabilité et la comparabilité des résultats. Chaque étape nécessite 
                  une expertise spécialisée et des outils adaptés.
                </p>
                <div className="w-20 h-1 bg-gradient-to-r from-primary to-secondary rounded-full"></div>
              </div>
            </div>

            {/* Right side - Animated process steps */}
            <div className="space-y-4">
              {processSteps.map((step, index) => {
                const Icon = step.icon;
                const isVisible = visibleSteps.includes(step.id);
                const isHovered = hoveredStep === step.id;
                
                return (
                  <Card
                    key={step.id}
                    className={`
                      transition-all duration-500 cursor-pointer group
                      ${isVisible 
                        ? 'opacity-100 translate-x-0' 
                        : 'opacity-0 translate-x-8'
                      }
                      ${isHovered ? 'scale-105 shadow-lg' : 'hover:scale-102 hover:shadow-md'}
                      ${step.borderColor}
                      border-l-4 ${step.bgColor}
                    `}
                    onMouseEnter={() => setHoveredStep(step.id)}
                    onMouseLeave={() => setHoveredStep(null)}
                    style={{ 
                      animationDelay: `${step.delay}ms`,
                      transform: isVisible ? 'translateX(0)' : 'translateX(2rem)'
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className={`
                          w-12 h-12 rounded-xl flex items-center justify-center
                          bg-gradient-to-br ${step.color} text-white
                          transition-transform duration-300
                          ${isHovered ? 'scale-110 rotate-6' : 'group-hover:scale-105'}
                        `}>
                          <Icon className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className={`
                              w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                              bg-gradient-to-br ${step.color} text-white
                              transition-transform duration-300
                              ${isHovered ? 'scale-110' : ''}
                            `}>
                              {step.id}
                            </span>
                            <h3 className="text-xl font-semibold text-foreground">
                              {step.title}
                            </h3>
                          </div>
                          
                          <p className="text-muted-foreground leading-relaxed">
                            {step.description}
                          </p>
                        </div>
                      </div>
                      
                      {/* Connection line to next step */}
                      {index < processSteps.length - 1 && (
                        <div className="mt-4 ml-6">
                          <div className={`
                            w-0.5 h-8 bg-gradient-to-b ${step.color} opacity-30
                            transition-opacity duration-300
                            ${isVisible ? 'opacity-50' : 'opacity-0'}
                          `}></div>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {/* Bottom summary */}
          <div className="mt-16 text-center">
            <Card className="bg-gradient-to-br from-primary/5 to-secondary/5 border-primary/20">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">
                  Un processus itératif et collaboratif
                </h3>
                <p className="text-muted-foreground max-w-3xl mx-auto">
                  Chaque étape de l'ACV peut nécessiter des ajustements et des retours en arrière 
                  pour affiner les résultats. La collaboration entre différents experts 
                  (ingénieurs, environnementalistes, analystes) est essentielle à la réussite du projet.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};