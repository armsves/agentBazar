import { z } from "zod";

export const MintRequestSchema = z.object({
  address: z.string().min(1, "address is required"),
  chain: z.string().min(1).default("EVM"),
  version: z.enum(["v3", "v4"]),
  usdcAmount: z
    .string()
    .regex(/^\d+$/, "usdcAmount must be a positive integer string")
    .optional(),
  usdtAmount: z
    .string()
    .regex(/^\d+$/, "usdtAmount must be a positive integer string")
    .optional(),
  /** Build + compile/simulate only — no signing or broadcast. */
  dryRun: z.boolean().optional().default(false),
});

export type MintRequest = z.infer<typeof MintRequestSchema>;
