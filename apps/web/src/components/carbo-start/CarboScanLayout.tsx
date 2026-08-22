import React from "react";
import { logger } from "@/utils/logger";
import { ModernCarboScanSidebar } from "./ModernCarboScanSidebar";
import { CarboScanHeader } from "./CarboScanHeader";
import { SubscriptionStatusGuard } from "./SubscriptionStatusGuard";
import { useAuth } from "@/hooks/useAuth";
import { useAppData } from "@/contexts/AppDataContext";
import { SidebarProvider } from "@/components/ui/sidebar";
import { useAssessmentUsage } from "@/hooks/useAssessmentUsage";
import { useSubscriptionStatus } from "@/hooks/useSubscriptionStatus";

interface CarboScanLayoutProps {
  children: React.ReactNode;
}

export const CarboScanLayout: React.FC<CarboScanLayoutProps> = ({ children }) => {
  const { user } = useAuth();
  const { currentOrganization } = useAppData();
  const { usage } = useAssessmentUsage();
  const { hasActiveSubscription } = useSubscriptionStatus();

  logger.debug("CarboScanLayout - user:", user?.id);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <ModernCarboScanSidebar />
        <div className="flex-1 flex flex-col">
          <CarboScanHeader
            user={
              user
                ? {
                    name: currentOrganization?.name || user.fullName?.trim() || user.email,
                    email: user.email || "",
                    company: user.email || "",
                  }
                : undefined
            }
            usage={usage}
            hasActiveSubscription={hasActiveSubscription}
          />
          <SubscriptionStatusGuard>{children}</SubscriptionStatusGuard>
        </div>
      </div>
    </SidebarProvider>
  );
};
