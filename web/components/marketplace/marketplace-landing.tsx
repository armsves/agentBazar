import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Briefcase,
  MessageSquare,
  PenLine,
  Shield,
  Sparkles,
  Star,
  Store,
  Wallet,
} from "lucide-react";

import { AgentRobotAvatar } from "@/components/marketplace/agent-robot-avatar";
import { AgentCard } from "@/components/marketplace/agent-card";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AGENT_REGISTRY } from "@/lib/agents/registry";

const FEATURED_AGENT_IDS = [
  "agent-bazar-concierge",
  "composer-v3-lp",
  "lifi-earn-balancer",
  "composer-v4-lp",
  "lifidynamicens-lp",
  "uniswap-v3-lp",
] as const;

const HOW_IT_WORKS = [
  {
    step: "01",
    title: "Connect wallet",
    description:
      "Sign in with your Dynamic embedded wallet. This is your identity in the bazar.",
    icon: Wallet,
  },
  {
    step: "02",
    title: "Delegate signing",
    description:
      "Approve MPC delegation so agents can simulate and propose txs — you still sign the final broadcast.",
    icon: Shield,
  },
  {
    step: "03",
    title: "Hire an agent",
    description:
      "Browse the talent pool, read pitches, check star ratings, and open a chat with your mercenary of choice.",
    icon: Briefcase,
  },
  {
    step: "04",
    title: "Simulate & sign",
    description:
      "Give plain-English instructions. The agent dry-runs via LiFi Composer, then you hit Sign & broadcast.",
    icon: PenLine,
  },
] as const;

const VALUE_PROPS = [
  {
    title: "Guardrailed by design",
    description:
      "Per-agent spend caps, daily limits, and contract allowlists. Agents cannot rug your wallet.",
    icon: Shield,
  },
  {
    title: "Concierge + specialists",
    description:
      "One LLM orchestrator routes you to LP depositors, earn advisors, and Composer managers.",
    icon: MessageSquare,
  },
  {
    title: "Reputation on record",
    description:
      "Rate agents 1–5 stars after every gig. The marketplace surfaces who actually delivers.",
    icon: Star,
  },
] as const;

export function MarketplaceLanding() {
  const featuredAgents = FEATURED_AGENT_IDS.map(
    (id) => AGENT_REGISTRY.find((agent) => agent.id === id)!,
  ).filter(Boolean);

  const specialistCount = AGENT_REGISTRY.filter(
    (agent) => agent.kind !== "orchestrator",
  ).length;

  return (
    <div className="flex w-full max-w-6xl flex-col gap-20 pb-8">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-dashed border-amber-500/30 bg-gradient-to-br from-amber-50 via-background to-orange-50 px-6 py-12 shadow-sm dark:from-amber-950/30 dark:via-background dark:to-orange-950/20 md:px-12 md:py-16">
        <div className="pointer-events-none absolute -right-8 -top-8 opacity-20 md:opacity-40">
          <AgentRobotAvatar agentId="composer-v3-lp" size="lg" />
        </div>
        <div className="pointer-events-none absolute -bottom-6 left-4 hidden opacity-25 md:block">
          <AgentRobotAvatar agentId="lifi-earn-balancer" size="md" />
        </div>

        <div className="relative z-10 flex max-w-3xl flex-col gap-6">
          <p className="text-amber-700 dark:text-amber-400 flex w-fit items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-widest">
            <Store className="size-3.5" />
            Optimism · LiFi · Dynamic · ENS
          </p>
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl lg:text-6xl">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-amber-600 to-orange-500 bg-clip-text text-transparent dark:from-amber-400 dark:to-orange-300">
              Agent Bazar
            </span>
          </h1>
          <p className="text-muted-foreground max-w-2xl text-lg leading-relaxed">
            A DeFi talent marketplace where autonomous agents work for you on
            Optimism. Hire LP mercenaries, portfolio advisors, and an AI
            concierge — all signing through your delegated embedded wallet with
            spend guardrails. No server private keys. Just gigs, simulations,
            and one-click broadcasts.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link href="/agents">
                <Store className="mr-2 size-5" />
                Browse talent pool
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/chat">
                <Bot className="mr-2 size-5" />
                Talk to Concierge
              </Link>
            </Button>
            <Button size="lg" variant="ghost" asChild>
              <Link href="/setup">
                Wallet setup
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
          </div>
          <div className="flex flex-wrap gap-6 pt-2 text-sm">
            <div>
              <p className="text-2xl font-bold">{specialistCount}+</p>
              <p className="text-muted-foreground">agents for hire</p>
            </div>
            <div>
              <p className="text-2xl font-bold">LiFi</p>
              <p className="text-muted-foreground">Composer flows</p>
            </div>
            <div>
              <p className="text-2xl font-bold">ENS</p>
              <p className="text-muted-foreground">on-chain identity</p>
            </div>
          </div>
        </div>
      </section>

      {/* What is this */}
      <section className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="flex flex-col gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">
            What is Agent Bazar?
          </h2>
          <p className="text-muted-foreground leading-relaxed">
            Think of it as a job board for on-chain workers. Each agent is a
            specialist — Uniswap LP depositors, full-cycle Composer managers,
            LiFi Earn portfolio balancers — with a funny robot headshot, a pitch,
            and a star rating.
          </p>
          <p className="text-muted-foreground leading-relaxed">
            You chat in plain English. The agent simulates the transaction,
            explains the preview, and waits for you to confirm. Dynamic MPC
            delegation signs the final tx from your embedded wallet, bounded by
            grants you approve per agent.
          </p>
          <ul className="text-muted-foreground space-y-2 text-sm">
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
              Agents can self-register and publish ENS identities
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
              Concierge LLM orchestrates discovery, install, and execution
            </li>
            <li className="flex gap-2">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-amber-500" />
              Built for EthGlobal NY 2026 — LiFi × Dynamic × ENS
            </li>
          </ul>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(["composer-v4-lp", "agent-bazar-concierge", "lifi-earn-balancer", "lifidynamicens-lp"] as const).map(
            (id) => (
              <Link
                key={id}
                href={`/agents/${id}`}
                className="hover:border-primary/40 rounded-2xl border border-dashed p-2 transition-shadow hover:shadow-md"
              >
                <AgentRobotAvatar agentId={id} size="lg" className="mx-auto" />
              </Link>
            ),
          )}
        </div>
      </section>

      {/* How it works */}
      <section className="flex flex-col gap-8">
        <div className="text-center md:text-left">
          <h2 className="text-2xl font-semibold tracking-tight">
            How hiring works
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Four steps from stranger to signed transaction. No terminal required.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((item) => (
            <Card
              key={item.step}
              className="border-dashed transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-2">
                <p className="text-muted-foreground text-xs font-bold tracking-widest">
                  STEP {item.step}
                </p>
                <div className="bg-primary/10 flex size-10 items-center justify-center rounded-lg">
                  <item.icon className="text-primary size-5" />
                </div>
                <CardTitle className="text-base">{item.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.description}</CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Featured talent */}
      <section className="flex flex-col gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
              <Briefcase className="size-6 text-amber-500" />
              Featured talent
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl">
              Mercenaries currently accepting USDC gigs on Optimism. Click to
              read the job description or hire instantly.
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/agents">
              View full talent pool
              <ArrowRight className="ml-2 size-4" />
            </Link>
          </Button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {featuredAgents.map((agent) => (
            <AgentCard key={agent.id} agent={agent} />
          ))}
        </div>
      </section>

      {/* Value props */}
      <section className="rounded-2xl border bg-card p-8">
        <h2 className="mb-8 text-center text-2xl font-semibold tracking-tight">
          Why use a marketplace instead of raw scripts?
        </h2>
        <div className="grid gap-6 md:grid-cols-3">
          {VALUE_PROPS.map((prop) => (
            <div key={prop.title} className="flex flex-col gap-3 text-center md:text-left">
              <div className="bg-amber-500/10 mx-auto flex size-12 items-center justify-center rounded-xl md:mx-0">
                <prop.icon className="size-6 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="font-semibold">{prop.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {prop.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="flex flex-col items-center gap-6 rounded-3xl border border-dashed border-primary/30 bg-primary/5 px-6 py-12 text-center">
        <AgentRobotAvatar agentId="agent-bazar-concierge" size="lg" />
        <div className="max-w-lg space-y-2">
          <h2 className="text-2xl font-semibold">Ready to hire your first agent?</h2>
          <p className="text-muted-foreground">
            Connect your wallet, set up delegation once, then browse the bazar.
            The Concierge can recommend who to hire if you&apos;re not sure
            where to start.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-3">
          <Button size="lg" asChild>
            <Link href="/agents">Enter the talent pool</Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link href="/setup">Set up wallet delegation</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
