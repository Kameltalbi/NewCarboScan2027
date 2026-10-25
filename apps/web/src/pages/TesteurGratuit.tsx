import { MainHeader } from "@/components/MainHeader";
import { NewFooter } from "@/components/NewFooter";
import { SEOHead } from "@/components/seo/SEOHead";
import { CarboScanQuestionnaire } from "@/components/carbo-start/CarboScanQuestionnaire";

const TITLE = "Testeur gratuit de bilan carbone | CarboScan";
const DESCRIPTION =
  "Estimez l'empreinte carbone de votre organisation avec le questionnaire CarboScan. Le rapport s'affiche à l'écran et peut être téléchargé.";

const TesteurGratuit = () => {
  return (
    <div className="flex min-h-screen flex-col bg-[#F7F8F6]">
      <SEOHead title={TITLE} description={DESCRIPTION} path="/testeur-gratuit" />
      <MainHeader />
      <main id="main-content" className="flex-1">
        <CarboScanQuestionnaire publicAccess />
      </main>
      <NewFooter />
    </div>
  );
};

export default TesteurGratuit;
