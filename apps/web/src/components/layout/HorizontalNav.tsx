import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { LucideIcon, ChevronDown } from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon?: LucideIcon;
}

interface HorizontalNavProps {
  items: NavItem[];
  basePath?: string;
}

export const HorizontalNav: React.FC<HorizontalNavProps> = React.memo(({ items, basePath = '' }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string): boolean => {
    const fullPath = basePath + path;
    // For empty path (home), only match exact basePath
    if (path === '' || path === '/') {
      return location.pathname === basePath || location.pathname === basePath + '/';
    }
    return location.pathname === fullPath || location.pathname.startsWith(fullPath + '/');
  };

  const activeItem = items.find(item => isActive(item.path)) || items[0];
  const ActiveIcon = activeItem?.icon;

  return (
    <div className="border-b border-border bg-background">
      <div className="container mx-auto px-4">
        {/* Mobile: menu déroulant */}
        <div className="sm:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="flex items-center justify-between w-full px-3 py-3 text-sm font-medium text-foreground"
          >
            <span className="flex items-center gap-2">
              {ActiveIcon && <ActiveIcon className="h-4 w-4" />}
              {activeItem?.label}
            </span>
            <ChevronDown className={cn("h-4 w-4 transition-transform", mobileOpen && "rotate-180")} />
          </button>
          {mobileOpen && (
            <div className="pb-2 space-y-1">
              {items.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(basePath + item.path);
                      setMobileOpen(false);
                    }}
                    className={cn(
                      "flex items-center gap-2 w-full px-4 py-2.5 text-sm font-medium rounded-md transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                  >
                    {Icon && <Icon className="h-4 w-4" />}
                    {item.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop: tabs horizontaux */}
        <nav className="hidden sm:flex items-center gap-1 overflow-x-auto">
          {items.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);

            return (
              <button
                key={item.path}
                onClick={() => navigate(basePath + item.path)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap",
                  "border-b-2 transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                )}
              >
                {Icon && <Icon className="h-4 w-4" />}
                {item.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
});

HorizontalNav.displayName = 'HorizontalNav';
