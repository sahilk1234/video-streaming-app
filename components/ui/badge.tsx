import * as React from "react";
import { cn } from "@/lib/utils";

export const Badge = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
  ({ className, ...props }, ref) => (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center rounded-full bg-surface/80 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-muted",
        className
      )}
      {...props}
    />
  )
);

Badge.displayName = "Badge";
