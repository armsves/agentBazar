import { z } from "zod";

export const InstallGrantSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chain: z.string().min(1).default("EVM"),
  maxUsdcPerTx: z.string().regex(/^\d+$/).optional(),
  maxUsdcDaily: z.string().regex(/^\d+$/).optional(),
});

export const ExecuteAgentSchema = z.object({
  address: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  chain: z.string().min(1).default("EVM"),
  usdcAmount: z.string().regex(/^\d+$/).optional(),
  usdtAmount: z.string().regex(/^\d+$/).optional(),
  dryRun: z.boolean().optional(),
});
