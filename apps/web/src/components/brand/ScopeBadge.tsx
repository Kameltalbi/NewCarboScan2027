import * as React from "react";
import { SCOPE_COLORS, SCOPE_LABEL_ON_FILL, type ScopeNumber } from "@/brand/colors";
import { cn } from "@/lib/utils";

type ScopeBadgeProps = {
  scope: ScopeNumber | 1 | 2 | 3;
  className?: string;
  /** Show “Scope N” label (default true) */
  label?: boolean;
  children?: React.ReactNode;
};

/**
 * Scope identity badge. Text uses brand deep green on vivid fills for contrast.
 */
export const ScopeBadge: React.FC<ScopeBadgeProps> = ({
  scope,
  className,
  label = true,
  children,
}) => {
  const n = Number(scope) as ScopeNumber;
  const bg = SCOPE_COLORS[n] ?? SCOPE_COLORS[1];
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-[4px] px-2 py-0.5 text-xs font-semibold",
        className,
      )}
      style={{ backgroundColor: bg, color: SCOPE_LABEL_ON_FILL }}
    >
      {children ?? (label ? `Scope ${n}` : null)}
    </span>
  );
};
