export type AgentCapability =
  | "uniswap-v3-lp"
  | "uniswap-v4-lp"
  | "earn-portfolio";

export type UniswapVersion = "v3" | "v4";

export type AgentKind = "orchestrator" | "specialist" | "advisor";

export interface Agent {
  id: string;
  name: string;
  description: string;
  longDescription: string;
  kind: AgentKind;
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

export type AgentLpAction = "deposit" | "withdraw";

export interface AgentExecuteInput {
  address: string;
  chain: string;
  action?: AgentLpAction;
  usdcAmount?: string;
  usdtAmount?: string;
  tokenId?: string;
  liquidity?: string;
  dryRun?: boolean;
}
