import React, { Suspense, lazy } from "react";
import { NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { TransitionOverviewPage } from "./pages/TransitionOverviewPage";
import { TransitionObjectivesPage } from "./pages/TransitionObjectivesPage";
import { TransitionTrajectoriesPage } from "./pages/TransitionTrajectoriesPage";

const ClimateRoadmapModule = lazy(() =>
  import("@/modules/climate-roadmap/ClimateRoadmapModule").then((m) => ({
    default: m.ClimateRoadmapModule,
  })),
);
const ScenariosModule = lazy(() =>
  import("@/modules/scenarios/ScenariosModule").then((m) => ({
    default: m.ScenariosModule,
  })),
);

const Loading = () => (
  <div className="flex min-h-[320px] items-center justify-center">
    <Loader2 className="h-7 w-7 animate-spin text-primary" />
  </div>
);

const TABS = [
  { to: "/app/transition", end: true, label: "Vue d'ensemble" },
  { to: "/app/transition/trajectoires", end: false, label: "Trajectoires" },
  { to: "/app/transition/objectifs", end: false, label: "Objectifs" },
  { to: "/app/transition/scenarios", end: false, label: "Scénarios" },
  { to: "/app/transition/actions", end: false, label: "Plan d'actions" },
] as const;

function ScenariosInTransition() {
  return (
    <>
      <div className="mx-auto max-w-7xl px-6">
        <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-sm text-amber-950">
          <span className="font-medium">Simulation non enregistrée.</span>{" "}
          Les trajectoires de scénarios sont calculées à la volée. La persistance des résultats
          annuels sera ajoutée dans une phase dédiée.
        </div>
      </div>
      <ScenariosModule />
    </>
  );
}

export const TransitionApp: React.FC = () => {
  const location = useLocation();
  const isEmbeddedModule =
    location.pathname.startsWith("/app/transition/scenarios") ||
    location.pathname.startsWith("/app/transition/actions");

  return (
    <div className={cn(isEmbeddedModule ? "" : "mx-auto max-w-7xl p-6")}>
      <nav
        className={cn(
          "mb-6 flex flex-wrap gap-1 rounded-xl border border-border bg-muted/40 p-1",
          isEmbeddedModule && "mx-auto max-w-7xl px-6 pt-6",
        )}
      >
        {TABS.map((tab) => {
          const active = tab.end
            ? location.pathname === tab.to
            : location.pathname.startsWith(tab.to);
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              end={tab.end}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {tab.label}
            </NavLink>
          );
        })}
      </nav>

      <Suspense fallback={<Loading />}>
        <Routes>
          <Route index element={<TransitionOverviewPage />} />
          <Route path="trajectoires" element={<TransitionTrajectoriesPage />} />
          <Route path="objectifs" element={<TransitionObjectivesPage />} />
          <Route path="scenarios/*" element={<ScenariosInTransition />} />
          <Route path="actions/*" element={<ClimateRoadmapModule />} />
          <Route path="*" element={<Navigate to="/app/transition" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
};

export default TransitionApp;
