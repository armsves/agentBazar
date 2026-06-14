import { z } from "zod";

const AgentCapabilitySchema = z.enum([
  "uniswap-v3-lp",
  "uniswap-v4-lp",
  "earn-portfolio",
]);
const AgentKindSchema = z.enum(["orchestrator", "specialist", "advisor"]);
const UniswapVersionSchema = z.enum(["v3", "v4"]);

export const AgentManifestSchema = z.object({
  id: z
    .string()
    .min(2)
    .max(64)
    .regex(/^[a-z0-9][a-z0-9-]*$/),
  name: z.string().min(1).max(120),
  description: z.string().min(1).max(500),
  longDescription: z.string().min(1).max(4000),
  kind: AgentKindSchema,
  capabilities: z.array(AgentCapabilitySchema).min(1),
  version: UniswapVersionSchema,
  chainId: z.number().int().positive(),
  tags: z.array(z.string().min(1).max(32)).max(12),
  ensName: z.string().min(3).max(255).optional(),
  endpoints: z
    .object({
      web: z.string().url().optional(),
      mcp: z.string().url().optional(),
    })
    .optional(),
});

export const RegisterAgentSchema = z.object({
  manifest: AgentManifestSchema,
  timestamp: z.number().int().positive(),
  signature: z
    .string()
    .regex(/^0x[a-fA-F0-9]+$/)
    .optional(),
  signer: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/)
    .optional(),
  ensName: z.string().min(3).max(255).optional(),
});

export const JoinAgentSchema = RegisterAgentSchema.extend({
  introduction: z.string().min(10).max(2000).optional(),
});

export const InstallGrantSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chain: z.string().min(1).default("EVM"),
  maxUsdcPerTx: z.string().regex(/^\d+$/).optional(),
  maxUsdcDaily: z.string().regex(/^\d+$/).optional(),
});

export const SubmitRatingSchema = z.object({
  stars: z.number().int().min(1).max(5),
  comment: z.string().trim().max(500).optional(),
});

export const ExecuteAgentSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chain: z.string().min(1).default("EVM"),
  action: z.enum(["deposit", "withdraw"]).default("deposit"),
  usdcAmount: z.string().regex(/^\d+$/).optional(),
  usdtAmount: z.string().regex(/^\d+$/).optional(),
  tokenId: z.string().regex(/^\d+$/).optional(),
  liquidity: z.string().regex(/^\d+$/).optional(),
  dryRun: z.boolean().optional(),
});
