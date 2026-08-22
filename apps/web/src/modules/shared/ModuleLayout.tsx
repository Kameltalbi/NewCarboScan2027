import React from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/contexts/AppDataContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { SimplifiedSidebar } from "@/components/layout/SimplifiedSidebar";
import { ModuleHeader } from "./ModuleHeader";

interface ModuleLayoutProps {
  children: React.ReactNode;
  moduleSlug: string;
}

export const ModuleLayout: React.FC<ModuleLayoutProps> = ({ children, moduleSlug }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { modules, currentOrganization } = useAppData();

  React.useEffect(() => {
    if (!user) {
      navigate("/auth", { state: { from: location } });
    }
  }, [user, navigate, location]);

  if (!user) {
    return null;
  }

  const currentModule = modules.find((m) => m.slug === moduleSlug);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <SimplifiedSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <ModuleHeader
            user={{
              name: user.fullName?.trim() || user.email,
              email: user.email,
              company: currentOrganization?.name || "",
            }}
            currentModule={currentModule}
          />
          <main id="main-content" className="flex-1 min-w-0 overflow-auto p-4 sm:p-6 md:p-8 lg:p-10" role="main" aria-label="Contenu principal">
            <div className="max-w-7xl mx-auto w-full min-w-0">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};
