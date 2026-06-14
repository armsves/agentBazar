export type AgentCapability = "uniswap-v3-lp" | "uniswap-v4-lp";

export type UniswapVersion = "v3" | "v4";

export interface Agent {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  capabilities: AgentCapability[];
  version: UniswapVersion;
  chainId: number;
  tags: string[];
}

export interface UserAgentGrant {
  userId: string;
  agentId: string;
  walletAddress: string;
  chain: string;
  allowedVersions: UniswapVersion[];
  maxUsdcPerTx: string;
  maxUsdcDaily: string;
  dailySpentUsdc: string;
  dailySpentDate: string;
  installedAt: string;
  revokedAt?: string;
}

export interface AgentExecutionLog {
  id: string;
  userId: string;
  agentId: string;
  walletAddress: string;
  version: UniswapVersion;
  usdcAmount: string;
  usdtAmount: string;
  dryRun: boolean;
  status: "success" | "failed";
  composeHash?: string;
  error?: string;
  timestamp: string;
}

export interface AgentExecuteInput {
  address: string;
  chain: string;
  usdcAmount?: string;
  usdtAmount?: string;
  dryRun?: boolean;
}
