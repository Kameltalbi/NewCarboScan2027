import { useState, useEffect } from "react";
import { PricingPlan } from "./PricingCard";
import { useTranslation } from "react-i18next";

// Hook to detect user location and return appropriate currency
const useUserCurrency = () => {
  const [currency, setCurrency] = useState<'DT' | 'USD'>('DT'); // Default to DT for Tunisia
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const detectCurrency = async () => {
      // Check localStorage first
      const savedCurrency = localStorage.getItem('userCurrency') as 'DT' | 'USD' | null;
      if (savedCurrency) {
        setCurrency(savedCurrency);
        setIsLoading(false);
        return;
      }

      // Try multiple detection methods
      try {
        // Method 1: Check timezone
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        if (timezone === 'Africa/Tunis') {
          setCurrency('DT');
          localStorage.setItem('userCurrency', 'DT');
          setIsLoading(false);
          return;
        }

        // Method 2: Check language
        const language = navigator.language.toLowerCase();
        if (language.includes('ar-tn') || language.includes('fr-tn')) {
          setCurrency('DT');
          localStorage.setItem('userCurrency', 'DT');
          setIsLoading(false);
          return;
        }

        // Default to DT for Tunisia/MENA region
        setCurrency('DT');
        localStorage.setItem('userCurrency', 'DT');
      } catch (error) {
        // Currency detection failed, using DT as default
        setCurrency('DT');
        localStorage.setItem('userCurrency', 'DT');
      } finally {
        setIsLoading(false);
      }
    };

    detectCurrency();
  }, []);

  const toggleCurrency = () => {
    const newCurrency = currency === 'DT' ? 'USD' : 'DT';
    setCurrency(newCurrency);
    localStorage.setItem('userCurrency', newCurrency);
  };

  return { currency, isLoading, toggleCurrency };
};

export const usePricingPlans = () => {
  const { currency, isLoading, toggleCurrency } = useUserCurrency();
  const { t } = useTranslation();
  
  const getPriceDisplay = (dtPrice: number, usdPrice: number) => {
    if (isLoading) return "...";
    // Always use DT currency regardless of language
    return `${dtPrice} DT`;
  };

  const plans: PricingPlan[] = [
    {
      name: "Essentiel",
      description: "PME et organisations — Mise en conformité de base",
      price: getPriceDisplay(1900, 600),
      period: t("checkout.perYear"),
      headerColor: "#2563eb",
      buttonColor: "#2563eb",
      link: "/payment?plan=essential", // Backend: essential
      popular: false,
      features: [
        {
          title: "Bilan carbone – Scopes 1 & 2",
          description: "",
          included: true
        },
        {
          title: "Rapport en FR ou EN",
          description: "",
          included: true
        },
        {
          title: "Rapport généré par IA et validé par un consultant – basé sur la méthodologie ADEME",
          description: "",
          included: true
        },
        {
          title: "Simulation économique : Deux scénarios d'augmentation du prix du pétrole, Hypothèse de taxe carbone, Estimation des économies liées aux réductions d'émissions",
          description: "",
          included: true
        },
        {
          title: "Recommandations de solutions disponibles (Scopes 1 & 2)",
          description: "",
          included: true
        },
        {
          title: "Ratios carbone (par employé, par m², par M DT de chiffre d'affaires)",
          description: "",
          included: true
        },
        {
          title: "Résumé exécutif (1 page) pour la direction",
          description: "",
          included: true
        },
        {
          title: "Tableaux de bord visuels & graphiques",
          description: "",
          included: true
        },
        {
          title: "2 révisions par an",
          description: "",
          included: true
        },
        {
          title: "Session de restitution en ligne – 1h",
          description: "",
          included: true
        }
      ]
    },
    {
      name: "Pro",
      description: "PME et entreprises exportatrices — Conformité CBAM et optimisation",
      price: getPriceDisplay(2900, 900),
      period: t("checkout.perYear"),
      headerColor: "#15803d",
      buttonColor: "#15803d",
      link: "/payment?plan=carbo_pro", // Backend: carbo_pro
      popular: true,
      features: [
        {
          title: "Bilan carbone – Scopes 1, 2 & 3",
          description: "",
          included: true
        },
        {
          title: "Rapport en FR & EN",
          description: "",
          included: true
        },
        {
          title: "Rapport généré par IA et validé par un consultant – basé sur la méthodologie ADEME",
          description: "",
          included: true
        },
        {
          title: "Simulation économique avancée : Scénarios multi-variables (pétrole, taxe carbone, trajectoires de réduction), Comparaison de plusieurs hypothèses de réduction des émissions",
          description: "",
          included: true
        },
        {
          title: "Plan d'action avec recommandations prioritaires (Scopes 1, 2 & 3)",
          description: "",
          included: true
        },
        {
          title: "Ratios carbone (par employé, par m², par M DT de chiffre d'affaires)",
          description: "",
          included: true
        },
        {
          title: "Benchmark sectoriel (lorsque les données sont disponibles)",
          description: "",
          included: true
        },
        {
          title: "Résumé exécutif bilingue (FR & EN) pour la direction et les partenaires",
          description: "",
          included: true
        },
        {
          title: "Tableaux de bord visuels & graphiques interactifs",
          description: "",
          included: true
        },
        {
          title: "3 révisions par an",
          description: "",
          included: true
        },
        {
          title: "Session de restitution en ligne – 1h30 avec Q&R",
          description: "",
          included: true
        }
      ]
    },
    {
      name: "Expert",
      description: "Grandes entreprises — Solution sur mesure avec accompagnement expert",
      price: t("professionalPlans.expert.price"),
      period: "",
      headerColor: "#7c3aed",
      buttonColor: "#7c3aed",
      link: "/payment?plan=carbo_expert", // Backend: carbo_expert
      popular: false,
      features: [
        {
          title: "Bilan carbone sur mesure – Scopes 1, 2 & 3",
          description: "",
          included: true
        },
        {
          title: "Évaluation des émissions évitées (Scope 4) liées aux produits/services de l'entreprise",
          description: "",
          included: true
        },
        {
          title: "Rapport en FR & EN – détaillé et adapté aux besoins spécifiques",
          description: "",
          included: true
        },
        {
          title: "Rapport généré par IA et validé par un consultant senior – basé sur la méthodologie ADEME",
          description: "",
          included: true
        },
        {
          title: "Simulation économique avancée : Scénarios multi-variables (pétrole, taxe carbone, trajectoires de réduction)",
          description: "",
          included: true
        },
        {
          title: "Comparaison de plusieurs hypothèses de réduction des émissions",
          description: "",
          included: true
        },
        {
          title: "Plan d'action avec recommandations prioritaires (Scopes 1, 2, 3 & 4)",
          description: "",
          included: true
        },
        {
          title: "Ratios carbone (par employé, par m², par M DT de chiffre d'affaires)",
          description: "",
          included: true
        },
        {
          title: "Benchmark sectoriel (lorsque les données sont disponibles)",
          description: "",
          included: true
        },
        {
          title: "Résumé exécutif bilingue (FR & EN) pour la direction et les partenaires",
          description: "",
          included: true
        },
        {
          title: "Tableaux de bord visuels & graphiques interactifs",
          description: "",
          included: true
        },
        {
          title: "3 sites étudiés indépendamment dans le même forfait",
          description: "",
          included: true
        },
        {
          title: "Accompagnement personnalisé par un consultant senior",
          description: "",
          included: true
        },
        {
          title: "Définition de la stratégie climat et plan de réduction à long terme",
          description: "",
          included: true
        },
        {
          title: "Conformité aux standards internationaux (ADEME, GHG Protocol, SBTi)",
          description: "",
          included: true
        },
        {
          title: "Études spécifiques sur demande (supply chain, export, reporting RSE, etc.)",
          description: "",
          included: true
        },
        {
          title: "5 révisions",
          description: "",
          included: true
        },
        {
          title: "Sessions de restitution approfondies (présentiel ou en ligne)",
          description: "",
          included: true
        }
      ]
    }
  ];

  return { plans, toggleCurrency, currency };
};