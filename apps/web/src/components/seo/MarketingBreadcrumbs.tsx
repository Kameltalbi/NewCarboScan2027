import React from "react";
import { Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

type Crumb = { name: string; path?: string };

export const MarketingBreadcrumbs: React.FC<{ items: Crumb[]; className?: string }> = ({
  items,
  className,
}) => {
  if (!items.length) return null;

  return (
    <Breadcrumb className={className ?? "mb-8"}>
      <BreadcrumbList className={className?.includes("text-white") ? "text-white/75" : undefined}>
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <React.Fragment key={`${item.name}-${index}`}>
              {index > 0 && <BreadcrumbSeparator />}
              <BreadcrumbItem>
                {isLast || !item.path ? (
                  <BreadcrumbPage className={className?.includes("text-white") ? "text-white" : undefined}>
                    {item.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link
                      to={item.path}
                      className={className?.includes("text-white") ? "text-white/80 hover:text-white" : undefined}
                    >
                      {item.name}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
