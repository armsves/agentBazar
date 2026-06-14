import { Star } from "lucide-react";

import type { AgentReputation } from "@/lib/agents/reputation/types";

type AgentReputationStarsProps = {
  reputation?: AgentReputation | null;
  size?: "sm" | "md";
};

export function AgentReputationStars({
  reputation,
  size = "sm",
}: AgentReputationStarsProps) {
  const count = reputation?.ratingCount ?? 0;
  const average = reputation?.averageStars ?? 0;
  const iconClass = size === "sm" ? "size-3.5" : "size-4";

  if (!count) {
    return (
      <p className="text-muted-foreground text-xs">No ratings yet</p>
    );
  }

  const fullStars = Math.round(average);

  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-0.5" aria-label={`${average} out of 5 stars`}>
        {Array.from({ length: 5 }, (_, index) => {
          const filled = index < fullStars;
          return (
            <Star
              key={index}
              className={`${iconClass} ${
                filled
                  ? "fill-amber-400 text-amber-400"
                  : "text-muted-foreground/40"
              }`}
            />
          );
        })}
      </div>
      <span className="text-muted-foreground text-xs">
        {average.toFixed(1)} ({count})
      </span>
    </div>
  );
}
