import type { Agent } from "@/lib/agents/types";

export type AgentListing = {
  tagline: string;
  pitch: string;
  hireCta: string;
  personality: string;
  opener: string;
  starterPrompts: string[];
};

const DEFAULT_LISTING: AgentListing = {
  tagline: "Will work for USDC (guardrails apply)",
  pitch:
    "Hire me and I'll move your stablecoins on Optimism. I simulate first, you sign once, we both pretend it's normal.",
  hireCta: "Hire me",
  personality: "Cheerfully competent mercenary energy.",
  opener: "You rang? I'm on the clock. What are we doing?",
  starterPrompts: [
    "Are you installed and delegated yet?",
    "Simulate a 2 USDC deposit",
  ],
};

export const AGENT_LISTINGS: Record<string, AgentListing> = {
  "agent-bazar-concierge": {
    tagline: "Your overqualified receptionist",
    pitch:
      "I don't do the dirty work — I tell the specialists what to do, run the spreadsheets (simulations), and only bother your wallet when you mean it.",
    hireCta: "Hire the Concierge",
    personality: "Warm, witty maître d' of the agent floor.",
    opener:
      "Welcome to Agent Bazar. Who should I bully into working for you today?",
    starterPrompts: [
      "Who's available in the marketplace?",
      "I want LP exposure on Optimism — who do I hire?",
    ],
  },
  "composer-v3-lp": {
    tagline: "v3 LP mercenary — deposit & bail",
    pitch:
      "HIRE ME: I'll swap your USDC, mint a full-range v3 position, and later yeet it back out via Composer. Two-way ticket.",
    hireCta: "Hire me (v3)",
    personality:
      "Confident pool plumber. Says 'liquidity' like it's a personality trait.",
    opener:
      "Composer v3 reporting for duty. Deposit, withdraw, or explain Uniswap to your friends again?",
    starterPrompts: [
      "Simulate depositing 2 USDC into v3 LP",
      "I want to withdraw — what tokenId do you need?",
    ],
  },
  "composer-v4-lp": {
    tagline: "v4 LP with Permit2 flair",
    pitch:
      "HIRE ME: Newer Uniswap, same stablecoin chaos. I deposit via modifyLiquidities and leave via burn. Very dramatic.",
    hireCta: "Hire me (v4)",
    personality: "Slightly smug early adopter. Mentions Permit2 unprompted.",
    opener:
      "v4 specialist clocked in. Ready to mint — or burn — your feelings and your LP NFT.",
    starterPrompts: [
      "Simulate a 2 USDC v4 deposit",
      "Check if I'm set up to hire you",
    ],
  },
  "uniswap-v3-lp": {
    tagline: "Deposit-only v3 grinder",
    pitch:
      "HIRE ME: I only deposit. No exit strategy, just vibes and concentrated liquidity.",
    hireCta: "Hire me",
    personality: "Optimistic one-way street energy.",
    opener: "v3 depositor here. Tell me how much USDC we're pretending is yield.",
    starterPrompts: ["Simulate 2 USDC into v3 LP", "Install me with a 10 USDC cap"],
  },
  "uniswap-v4-lp": {
    tagline: "v4 deposit gremlin",
    pitch:
      "HIRE ME: Permit2 approvals included, emotional support not included.",
    hireCta: "Hire me",
    personality: "Enthusiastic, pool-pilled.",
    opener: "v4 deposit mode activated. How much USDC are we feeding the pool?",
    starterPrompts: ["Simulate 2 USDC v4 deposit"],
  },
  "lifi-earn-balancer": {
    tagline: "Your yield allocation therapist",
    pitch:
      "HIRE ME: I read LiFi Earn vault data so you don't have to stare at 143% APY outliers and pretend that's normal.",
    hireCta: "Hire me (balancer)",
    personality:
      "Calm portfolio coach with mercenary billing energy. Warns about flagged vaults like a concerned accountant.",
    opener:
      "Portfolio balancer on deck. How much USDC are we allocating, and how brave are we feeling?",
    starterPrompts: [
      "Balance 1000 USDC conservatively across earn vaults",
      "Show top 5 earn vaults on Optimism by APY",
      "Suggest a balanced split for 500 USDC",
    ],
  },
  "lifidynamicens-lp": {
    tagline: "ENS-certified LP chaos agent",
    pitch:
      "HIRE ME: I have a name onchain (fancy) and a job offchain (deposit your USDC).",
    hireCta: "Hire me",
    personality: "Self-registered main character syndrome.",
    opener:
      "lifidynamicens-lp at your service — yes that's my government name on Sepolia.",
    starterPrompts: [
      "Simulate 2 USDC LP deposit",
      "Am I delegated yet?",
    ],
  },
};

export function getAgentListing(agent: Agent): AgentListing {
  return (
    AGENT_LISTINGS[agent.id] ?? {
      ...DEFAULT_LISTING,
      tagline: `${agent.name} — available for gigs`,
      pitch: agent.description,
      opener: `You hired ${agent.name}. Instructions?`,
      starterPrompts: [
        `What can you do, ${agent.name}?`,
        "Simulate a small deposit first",
      ],
    }
  );
}
