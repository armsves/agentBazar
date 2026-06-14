import type { Address } from "@lifi/composer-sdk";
import { createComposeSdk } from "@lifi/composer-sdk";
import type { ComposeCompileSuccessData } from "@lifi/compose-spec";

type CompiledDeposit = ComposeCompileSuccessData & { readonly status: "success" };

import { env } from "@/env";
import { signAndBroadcastTransaction } from "@/lib/dynamic/delegation/signTransaction";
import type { DelegationRecord } from "@/lib/dynamic/delegation/types";
import { buildMintUniswapV3 } from "../../../src/mintUniswapV3";
import { buildMintUniswapV4 } from "../../../src/mintUniswapV4";
import { buildWithdrawUniswapV3 } from "../../../src/withdrawUniswapV3";
import {
  buildNftApprovalForWithdraw,
  buildWithdrawUniswapV4,
} from "../../../src/withdrawUniswapV4";
import {
  OPTIMISM_CHAIN_ID,
  POOL_FEE,
  UNISWAP_V3_USDC_USDT_POOL,
} from "../../../src/optimism";
import { assertWalletReady } from "../../../src/preflight";

export interface DepositInput {
  readonly owner: Address;
  readonly version: "v3" | "v4";
  readonly usdcAmount?: string;
  readonly usdtAmount?: string;
  /** Mint LP NFT to LiFi user proxy so Composer can withdraw later. */
  readonly mintNftToProxy?: boolean;
  /** Skip on-chain balance checks (dry-run / simulation). */
  readonly skipPreflight?: boolean;
}

export interface WithdrawInput {
  readonly owner: Address;
  readonly version: "v3" | "v4";
  readonly tokenId: string;
  readonly liquidity?: string;
}

export interface BuildWithdrawResult {
  readonly version: "v3" | "v4";
  readonly tokenId: string;
  readonly liquidity?: string;
  readonly userProxy?: string;
  readonly nftOwner?: string;
  readonly needsNftApproval?: boolean;
  readonly executionMode?: "composer" | "direct";
  readonly compile: CompiledDeposit;
}

export interface BuildDepositResult {
  readonly version: "v3" | "v4";
  readonly usdcAmount: string;
  readonly usdtAmount: string;
  readonly totalUsdcDeposit: string;
  readonly liquidity?: string;
  readonly userProxy?: string;
  readonly compile: CompiledDeposit;
}

export interface ExecuteDepositResult {
  readonly userProxy: string;
  readonly approvalHashes: `0x${string}`[];
  readonly composeHash: `0x${string}`;
  readonly liquidity?: string;
}

const DEFAULT_USDC_AMOUNT = "1000000";
const DEFAULT_USDT_AMOUNT = "1000000";

function configureComposerEnv(): void {
  process.env.LIFI_API_KEY = env.LIFI_API_KEY;
  process.env.RPC_URL = env.RPC_URL ?? "https://mainnet.optimism.io";
  if (env.COMPOSER_BASE_URL) {
    process.env.COMPOSER_BASE_URL = env.COMPOSER_BASE_URL;
  }
}

/**
 * Build a LiFi Composer flow and compile/simulate it against composer.li.quest.
 * Does not sign or broadcast — safe for agents to preview before execution.
 */
export async function buildAndCompileDeposit(
  input: DepositInput,
): Promise<BuildDepositResult> {
  configureComposerEnv();

  const baseUrl = env.COMPOSER_BASE_URL ?? "https://composer.li.quest";
  const usdcAmount = input.usdcAmount ?? DEFAULT_USDC_AMOUNT;
  const usdtAmount = input.usdtAmount ?? DEFAULT_USDT_AMOUNT;

  const sdk = createComposeSdk({ baseUrl, apiKey: env.LIFI_API_KEY });

  if (!input.skipPreflight) {
    await assertWalletReady(
      input.owner,
      BigInt(usdcAmount),
      BigInt(usdtAmount),
      { usdcOnlyDeposit: true },
    );
  }

  let liquidity: bigint | undefined;
  let previewUserProxy: string | undefined;

  const built =
    input.version === "v4"
      ? await (async () => {
          const result = await buildMintUniswapV4({
            owner: input.owner,
            usdcAmount: usdcAmount as `${bigint}`,
            usdtAmount: usdtAmount as `${bigint}`,
          });
          liquidity = result.liquidity;
          previewUserProxy = result.userProxy;
          if (input.mintNftToProxy) {
            const withProxy = await buildMintUniswapV4({
              owner: input.owner,
              usdcAmount: usdcAmount as `${bigint}`,
              usdtAmount: usdtAmount as `${bigint}`,
              userProxy: result.userProxy,
              lpRecipient: result.userProxy,
            });
            return withProxy;
          }
          return result;
        })()
      : await (async () => {
          const result = await buildMintUniswapV3({
            owner: input.owner,
            usdcAmount: usdcAmount as `${bigint}`,
            usdtAmount: usdtAmount as `${bigint}`,
          });
          previewUserProxy = result.userProxy;
          if (input.mintNftToProxy) {
            const withProxy = await buildMintUniswapV3({
              owner: input.owner,
              usdcAmount: usdcAmount as `${bigint}`,
              usdtAmount: usdtAmount as `${bigint}`,
              userProxy: result.userProxy,
              lpRecipient: result.userProxy,
            });
            return withProxy;
          }
          return result;
        })();

  const result = await sdk.client.compile(built.request);

  if (result.status !== "success") {
    const message = result.error.message;
    const revert = result.simulationRevert
      ? ` — ${result.simulationRevert}`
      : "";
    throw new Error(`Compile failed: ${message}${revert}`);
  }

  return {
    version: input.version,
    usdcAmount,
    usdtAmount,
    totalUsdcDeposit: (BigInt(usdcAmount) + BigInt(usdtAmount)).toString(),
    liquidity: liquidity?.toString(),
    userProxy: result.userProxy ?? previewUserProxy,
    compile: result,
  };
}

export async function buildAndCompileWithdraw(
  input: WithdrawInput,
): Promise<BuildWithdrawResult> {
  configureComposerEnv();

  const baseUrl = env.COMPOSER_BASE_URL ?? "https://composer.li.quest";
  const sdk = createComposeSdk({ baseUrl, apiKey: env.LIFI_API_KEY });

  if (input.version === "v4") {
    const built = await buildWithdrawUniswapV4({
      owner: input.owner,
      tokenId: input.tokenId as `${bigint}`,
    });

    if (built.mode === "direct") {
      const compile = {
        status: "success",
        transactionRequest: built.transactionRequest,
        userProxy: built.userProxy,
        approvals: [],
        producedResources: {},
      } as unknown as CompiledDeposit;

      return {
        version: input.version,
        tokenId: input.tokenId,
        userProxy: built.userProxy,
        nftOwner: built.nftOwner,
        needsNftApproval: false,
        executionMode: "direct",
        compile,
      };
    }

    const result = await sdk.client.compile(built.request);

    if (result.status !== "success") {
      const message = result.error.message;
      const revert = result.simulationRevert
        ? ` — ${result.simulationRevert}`
        : "";
      throw new Error(`Compile failed: ${message}${revert}`);
    }

    return {
      version: input.version,
      tokenId: input.tokenId,
      userProxy: result.userProxy ?? built.userProxy,
      nftOwner: built.nftOwner,
      needsNftApproval: false,
      executionMode: "composer",
      compile: result,
    };
  }

  const built = await buildWithdrawUniswapV3({
    owner: input.owner,
    tokenId: input.tokenId as `${bigint}`,
    liquidity: input.liquidity as `${bigint}` | undefined,
  });

  const result = await sdk.client.compile(built.request);

  if (result.status !== "success") {
    const message = result.error.message;
    const revert = result.simulationRevert
      ? ` — ${result.simulationRevert}`
      : "";
    throw new Error(`Compile failed: ${message}${revert}`);
  }

  const compile = {
    ...result,
    approvals: built.needsNftApproval
      ? [
          ...(result.approvals ?? []),
          {
            token: "v3-position-nft",
            spender: built.userProxy,
            amount: "0",
            transactionRequest: buildNftApprovalForWithdraw(
              "v3",
              built.userProxy as Address,
            ).transactionRequest,
          },
        ]
      : result.approvals,
  } as CompiledDeposit;

  return {
    version: input.version,
    tokenId: input.tokenId,
    liquidity: built.liquidity?.toString(),
    userProxy: result.userProxy ?? built.userProxy,
    nftOwner: built.nftOwner,
    needsNftApproval: built.needsNftApproval,
    executionMode: "composer",
    compile,
  };
}

/**
 * Sign and broadcast a previously compiled deposit using a Dynamic delegated share.
 */
export async function executeCompiledDeposit(
  owner: Address,
  delegation: DelegationRecord,
  compiled: CompiledDeposit,
): Promise<ExecuteDepositResult> {
  const rpcUrl = env.RPC_URL ?? "https://mainnet.optimism.io";
  const { transactionRequest, userProxy, approvals } = compiled;
  const approvalHashes: `0x${string}`[] = [];

  if (approvals && approvals.length > 0) {
    for (const approval of approvals) {
      const hash = await signAndBroadcastTransaction(
        approval.transactionRequest,
        owner,
        delegation,
        rpcUrl,
      );
      approvalHashes.push(hash);
    }
  }

  const composeHash = await signAndBroadcastTransaction(
    transactionRequest,
    owner,
    delegation,
    rpcUrl,
  );

  return {
    userProxy,
    approvalHashes,
    composeHash,
    liquidity: undefined,
  };
}

/** Build, compile, and execute a full Uniswap v3/v4 LP deposit via delegated signing. */
export async function runDelegatedDeposit(
  input: DepositInput & { delegation: DelegationRecord },
): Promise<ExecuteDepositResult & { liquidity?: string }> {
  const built = await buildAndCompileDeposit(input);
  const executed = await executeCompiledDeposit(
    input.owner,
    input.delegation,
    built.compile,
  );

  return {
    ...executed,
    liquidity: built.liquidity,
  };
}

/** @deprecated Use runDelegatedDeposit */
export const runDelegatedMint = (
  input: DepositInput & { delegation: DelegationRecord },
) => runDelegatedDeposit(input);

export const depositMetadata = {
  chainId: OPTIMISM_CHAIN_ID,
  poolFee: POOL_FEE,
  v3Pool: UNISWAP_V3_USDC_USDT_POOL,
  defaultUsdcAmount: DEFAULT_USDC_AMOUNT,
  defaultUsdtAmount: DEFAULT_USDT_AMOUNT,
  description:
    "USDC-only deposit: swaps half to USDT on-chain, then mints concentrated LP position.",
};

/** @deprecated Use depositMetadata */
export const mintMetadata = depositMetadata;
