import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { SEOHead } from "@/components/seo/SEOHead";
import { SITE_URL } from "@/config/seo";
import { DiagnosticExperience } from "@/features/diagnostic360/DiagnosticExperience";
import { useTranslation } from "react-i18next";

const TITLE = "Diagnostic Carbone 360° gratuit | CarboScan";
const DESCRIPTION =
  "Évaluez gratuitement la maturité carbone de votre entreprise, la qualité de vos données et identifiez vos 3 priorités d’action avec CarboScan.";

const BilanGratuit = () => {
  const { i18n } = useTranslation();
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8F6]">
      <SEOHead
        title={TITLE}
        description={DESCRIPTION}
        path="/bilan-gratuit"
        breadcrumbs={[
          { name: "Accueil", path: "/" },
          { name: "Diagnostic carbone", path: "/bilan-gratuit" },
        ]}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Diagnostic Carbone 360°",
          description: DESCRIPTION,
          url: `${SITE_URL}/bilan-gratuit`,
          about: "Évaluation de la maturité carbone d'une organisation",
        }}
      />
      <MainHeader />
      <main id="main-content" className="flex-1">
        <DiagnosticExperience language={i18n.language} />
      </main>
      <NewFooter />
    </div>
  );
};

export default BilanGratuit;
