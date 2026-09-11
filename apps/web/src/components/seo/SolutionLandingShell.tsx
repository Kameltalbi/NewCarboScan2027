import React from "react";
import { HomeHeader } from "@/components/HomeHeader";
import { NewFooter } from "@/components/NewFooter";
import { MarketingBreadcrumbs } from "@/components/seo/MarketingBreadcrumbs";
import { SolutionRelatedLinks } from "@/components/seo/SolutionRelatedLinks";
import { getPageSEO } from "@/config/seo";

type Props = {
  path: string;
  children: React.ReactNode;
  showRelated?: boolean;
};

export const SolutionLandingShell: React.FC<Props> = ({
  path,
  children,
  showRelated = true,
}) => {
  const seo = getPageSEO(path);
  const crumbs = seo.breadcrumbs ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <HomeHeader />
      <main id="main-content" className="flex-1">
        {crumbs.length > 0 && (
          <div className="container mx-auto px-4 pt-6 max-w-6xl">
            <MarketingBreadcrumbs items={crumbs} />
          </div>
        )}
        {children}
        {showRelated && <SolutionRelatedLinks currentPath={path} />}
      </main>
      <NewFooter />
    </div>
  );
};
