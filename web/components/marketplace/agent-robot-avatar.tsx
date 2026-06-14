import type { ComponentType } from "react";

import type { Agent } from "@/lib/agents/types";
import { ForHireStamp } from "@/components/marketplace/for-hire-stamp";

export type RobotAvatarMeta = {
  label: string;
  bg: string;
  accent: string;
};

const AVATAR_META: Record<string, RobotAvatarMeta> = {
  "agent-bazar-concierge": {
    label: "Overqualified bellhop bot",
    bg: "from-amber-200 via-orange-100 to-yellow-100 dark:from-amber-950 dark:via-orange-950 dark:to-yellow-950",
    accent: "#f59e0b",
  },
  "composer-v3-lp": {
    label: "Pool plumber robot",
    bg: "from-sky-200 via-blue-100 to-cyan-100 dark:from-sky-950 dark:via-blue-950 dark:to-cyan-950",
    accent: "#0ea5e9",
  },
  "composer-v4-lp": {
    label: "Dramatic v4 cape bot",
    bg: "from-violet-200 via-purple-100 to-fuchsia-100 dark:from-violet-950 dark:via-purple-950 dark:to-fuchsia-950",
    accent: "#8b5cf6",
  },
  "uniswap-v3-lp": {
    label: "One-way deposit gremlin",
    bg: "from-emerald-200 via-green-100 to-lime-100 dark:from-emerald-950 dark:via-green-950 dark:to-lime-950",
    accent: "#10b981",
  },
  "uniswap-v4-lp": {
    label: "Permit2 hype robot",
    bg: "from-teal-200 via-cyan-100 to-sky-100 dark:from-teal-950 dark:via-cyan-950 dark:to-sky-950",
    accent: "#14b8a6",
  },
  "lifi-earn-balancer": {
    label: "Spreadsheet therapist bot",
    bg: "from-orange-200 via-amber-100 to-yellow-100 dark:from-orange-950 dark:via-amber-950 dark:to-yellow-950",
    accent: "#f97316",
  },
  "lifidynamicens-lp": {
    label: "ENS main-character robot",
    bg: "from-rose-200 via-pink-100 to-fuchsia-100 dark:from-rose-950 dark:via-pink-950 dark:to-fuchsia-950",
    accent: "#ec4899",
  },
};

const DEFAULT_META: RobotAvatarMeta = {
  label: "Freelance chaos bot",
  bg: "from-slate-200 via-gray-100 to-zinc-100 dark:from-slate-900 dark:via-gray-900 dark:to-zinc-900",
  accent: "#64748b",
};

export function getRobotAvatarMeta(agentId: string): RobotAvatarMeta {
  return AVATAR_META[agentId] ?? DEFAULT_META;
}

export function getRobotAvatarMetaForAgent(agent: Agent): RobotAvatarMeta {
  return getRobotAvatarMeta(agent.id);
}

type Size = "sm" | "md" | "lg" | "hero";

const SIZE_CLASS: Record<Size, string> = {
  sm: "h-10 w-10",
  md: "h-16 w-16",
  lg: "h-28 w-28",
  hero: "h-full w-full",
};

function ConciergeRobot({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <rect x="28" y="52" width="64" height="48" rx="10" fill={accent} />
      <rect x="36" y="60" width="20" height="14" rx="3" fill="#fff" opacity="0.9" />
      <rect x="64" y="60" width="20" height="14" rx="3" fill="#fff" opacity="0.9" />
      <circle cx="46" cy="67" r="4" fill="#111" />
      <circle cx="74" cy="67" r="4" fill="#111" />
      <path d="M44 82 Q60 90 76 82" stroke="#111" strokeWidth="3" fill="none" strokeLinecap="round" />
      <rect x="22" y="28" width="76" height="22" rx="6" fill="#fcd34d" />
      <rect x="48" y="18" width="24" height="14" rx="3" fill="#fbbf24" />
      <rect x="78" y="64" width="18" height="24" rx="2" fill="#fff" stroke="#111" strokeWidth="2" />
      <line x1="82" y1="70" x2="92" y2="70" stroke="#111" strokeWidth="2" />
      <line x1="82" y1="76" x2="90" y2="76" stroke="#111" strokeWidth="2" />
      <text x="60" y="112" textAnchor="middle" fontSize="8" fill="#666" fontFamily="sans-serif">
        CONCIERGE
      </text>
    </svg>
  );
}

function PlumberRobot({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <ellipse cx="60" cy="30" rx="34" ry="12" fill="#fbbf24" />
      <rect x="26" y="50" width="68" height="50" rx="12" fill={accent} />
      <circle cx="44" cy="72" r="9" fill="#fff" />
      <circle cx="76" cy="72" r="9" fill="#fff" />
      <circle cx="44" cy="74" r="4" fill="#111" />
      <circle cx="76" cy="74" r="4" fill="#111" />
      <rect x="40" y="86" width="40" height="6" rx="3" fill="#111" opacity="0.5" />
      <rect x="88" y="58" width="8" height="36" rx="2" fill="#94a3b8" />
      <rect x="84" y="52" width="16" height="8" rx="2" fill="#64748b" />
      <path d="M18 64 L18 88 L28 88" stroke="#64748b" strokeWidth="4" fill="none" strokeLinecap="round" />
    </svg>
  );
}

function CapeRobot({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <path d="M20 70 Q10 40 30 35 L90 35 Q110 40 100 70 L100 100 L20 100 Z" fill="#7c3aed" opacity="0.35" />
      <rect x="30" y="42" width="60" height="52" rx="14" fill={accent} />
      <circle cx="48" cy="64" r="8" fill="#fff" />
      <circle cx="72" cy="64" r="8" fill="#fff" />
      <circle cx="48" cy="66" r="3" fill="#111" />
      <circle cx="72" cy="66" r="3" fill="#111" />
      <rect x="46" y="78" width="28" height="8" rx="4" fill="#111" opacity="0.4" />
      <rect x="44" y="22" width="32" height="18" rx="4" fill="#a78bfa" />
      <text x="60" y="35" textAnchor="middle" fontSize="9" fill="#fff" fontWeight="bold" fontFamily="sans-serif">
        P2
      </text>
    </svg>
  );
}

function DepositRobot({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <rect x="24" y="48" width="72" height="56" rx="14" fill={accent} />
      <text x="60" y="44" textAnchor="middle" fontSize="22" fill={accent} fontFamily="sans-serif">
        →
      </text>
      <circle cx="46" cy="72" r="10" fill="#fff" />
      <circle cx="74" cy="72" r="10" fill="#fff" />
      <circle cx="46" cy="74" r="4" fill="#111" />
      <circle cx="74" cy="74" r="4" fill="#111" />
      <path d="M42 90 L78 90" stroke="#fff" strokeWidth="4" strokeLinecap="round" />
      <text x="60" y="112" textAnchor="middle" fontSize="8" fill="#666" fontFamily="sans-serif">
        NO EXIT
      </text>
    </svg>
  );
}

function GremlinRobot({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <rect x="26" y="40" width="68" height="60" rx="16" fill={accent} />
      <circle cx="44" cy="68" r="11" fill="#fff" />
      <circle cx="76" cy="68" r="11" fill="#fff" />
      <circle cx="44" cy="68" r="5" fill="#111" />
      <circle cx="76" cy="68" r="5" fill="#111" />
      <circle cx="46" cy="66" r="2" fill="#fff" />
      <circle cx="78" cy="66" r="2" fill="#fff" />
      <path d="M40 88 Q60 98 80 88" stroke="#111" strokeWidth="3" fill="none" />
      <rect x="34" y="24" width="52" height="14" rx="4" fill="#5eead4" />
      <text x="60" y="34" textAnchor="middle" fontSize="8" fill="#134e4a" fontFamily="sans-serif">
        v4 HYPE
      </text>
      <path d="M60 18 L64 28 L56 28 Z" fill="#fbbf24" />
    </svg>
  );
}

function BalancerRobot({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <rect x="28" y="50" width="64" height="50" rx="12" fill={accent} />
      <circle cx="48" cy="72" r="8" fill="#fff" />
      <circle cx="72" cy="72" r="8" fill="#fff" />
      <circle cx="48" cy="74" r="3" fill="#111" />
      <circle cx="72" cy="74" r="3" fill="#111" />
      <path d="M46 86 Q60 80 74 86" stroke="#111" strokeWidth="2" fill="none" />
      <circle cx="60" cy="28" r="22" fill="#fff" stroke={accent} strokeWidth="4" />
      <path d="M60 28 L60 14 A14 14 0 0 1 74 28 Z" fill="#22c55e" />
      <path d="M60 28 L74 28 A14 14 0 0 1 60 42 Z" fill="#3b82f6" />
      <path d="M60 28 L60 42 A14 14 0 0 1 46 28 Z" fill="#eab308" />
      <rect x="82" y="58" width="22" height="28" rx="3" fill="#fff" stroke="#111" strokeWidth="2" />
      <text x="93" y="72" textAnchor="middle" fontSize="7" fill="#111" fontFamily="monospace">
        143%
      </text>
      <text x="93" y="80" textAnchor="middle" fontSize="6" fill="#dc2626" fontFamily="sans-serif">
        flagged
      </text>
    </svg>
  );
}

function EnsRobot({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <polygon points="60,12 72,36 96,36 76,52 84,76 60,60 36,76 44,52 24,36 48,36" fill="#fbbf24" />
      <rect x="28" y="52" width="64" height="48" rx="12" fill={accent} />
      <circle cx="48" cy="74" r="8" fill="#fff" />
      <circle cx="72" cy="74" r="8" fill="#fff" />
      <circle cx="48" cy="76" r="3" fill="#111" />
      <circle cx="72" cy="76" r="3" fill="#111" />
      <rect x="32" y="88" width="56" height="14" rx="3" fill="#fff" />
      <text x="60" y="98" textAnchor="middle" fontSize="7" fill={accent} fontFamily="monospace">
        .eth
      </text>
    </svg>
  );
}

function DefaultRobot({ accent }: { accent: string }) {
  return (
    <svg viewBox="0 0 120 120" className="h-full w-full" aria-hidden>
      <rect x="30" y="44" width="60" height="54" rx="14" fill={accent} />
      <circle cx="48" cy="68" r="9" fill="#fff" />
      <circle cx="72" cy="68" r="9" fill="#fff" />
      <circle cx="48" cy="70" r="4" fill="#111" />
      <circle cx="72" cy="70" r="4" fill="#111" />
      <rect x="44" y="84" width="32" height="6" rx="3" fill="#111" opacity="0.35" />
      <rect x="42" y="22" width="36" height="20" rx="6" fill={accent} opacity="0.7" />
      <line x1="60" y1="14" x2="60" y2="6" stroke={accent} strokeWidth="3" />
      <circle cx="60" cy="5" r="4" fill="#ef4444" />
    </svg>
  );
}

const ROBOT_BY_ID: Record<string, ComponentType<{ accent: string }>> = {
  "agent-bazar-concierge": ConciergeRobot,
  "composer-v3-lp": PlumberRobot,
  "composer-v4-lp": CapeRobot,
  "uniswap-v3-lp": DepositRobot,
  "uniswap-v4-lp": GremlinRobot,
  "lifi-earn-balancer": BalancerRobot,
  "lifidynamicens-lp": EnsRobot,
};

export type AgentRobotAvatarProps = {
  agentId: string;
  size?: Size;
  showFrame?: boolean;
  className?: string;
};

export function AgentRobotAvatar({
  agentId,
  size = "md",
  showFrame = true,
  className = "",
}: AgentRobotAvatarProps) {
  const meta = getRobotAvatarMeta(agentId);
  const Robot = ROBOT_BY_ID[agentId] ?? DefaultRobot;

  const inner = (
    <div
      className={`relative flex items-center justify-center overflow-hidden ${
        size === "hero" ? "aspect-[4/3] w-full p-6" : `${SIZE_CLASS[size]} p-1.5`
      }`}
    >
      <Robot accent={meta.accent} />
    </div>
  );

  if (!showFrame) {
    return (
      <div
        className={`${SIZE_CLASS[size]} ${className}`}
        title={meta.label}
        role="img"
        aria-label={meta.label}
      >
        <Robot accent={meta.accent} />
      </div>
    );
  }

  return (
    <div
      className={`bg-gradient-to-br ${meta.bg} overflow-hidden rounded-xl border border-black/5 shadow-inner dark:border-white/10 ${
        size === "hero" ? "w-full" : SIZE_CLASS[size]
      } ${className}`}
      title={meta.label}
      role="img"
      aria-label={meta.label}
    >
      {inner}
    </div>
  );
}

export function AgentRobotHero({ agentId, className = "" }: { agentId: string; className?: string }) {
  const meta = getRobotAvatarMeta(agentId);

  return (
    <div
      className={`bg-gradient-to-br ${meta.bg} relative overflow-hidden rounded-2xl border border-dashed border-black/10 dark:border-white/10 ${className}`}
    >
      <ForHireStamp
        size="md"
        className="absolute right-2 top-2 z-10 -rotate-12"
      />
      <AgentRobotAvatar agentId={agentId} size="hero" showFrame={false} />
      <p className="text-muted-foreground pb-3 text-center text-[11px] font-medium italic">
        {meta.label}
      </p>
    </div>
  );
}
