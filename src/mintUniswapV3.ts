import type { ComposeCompileRequest, Flow } from '@lifi/compose-spec';

import {
  createComposeSdk,
  materialisers,
  resources,
  type Address,
  type ComposeSdk,
} from '@lifi/composer-sdk';

import { API_KEY, BASE_URL } from './config.js';
import {
  OPTIMISM_CHAIN_ID,
  UNISWAP_V3_POSITION_MANAGER,
  UNISWAP_V3_SWAP_ROUTER,
  USDC,
  USDT,
} from './optimism.js';
import {
  encodeV3ExactInputSingleCalldata,
  encodeV3MintCalldata,
} from './uniswapV3Encoding.js';

export interface MintUniswapV3Input {
  readonly owner: Address;
  readonly usdcAmount: `${bigint}`;
  readonly usdtAmount: `${bigint}`;
  readonly slippageBps?: number;
  readonly userProxy?: Address;
  /** Where the LP NFT is minted — use userProxy for composer withdraw compatibility. */
  readonly lpRecipient?: Address;
}

const bpsMin = (amount: `${bigint}`, bps: number): bigint => {
  const value = BigInt(amount);
  return (value * BigInt(10_000 - bps)) / 10_000n;
};

const usdcShareBps = (usdcAmount: `${bigint}`, usdtAmount: `${bigint}`): number => {
  const total = BigInt(usdcAmount) + BigInt(usdtAmount);
  if (total === 0n) return 5000;
  return Number((BigInt(usdcAmount) * 10_000n) / total);
};

const totalDepositAmount = (
  usdcAmount: `${bigint}`,
  usdtAmount: `${bigint}`,
): `${bigint}` => (BigInt(usdcAmount) + BigInt(usdtAmount)).toString() as `${bigint}`;

const resolveUserProxy = async (
  sdk: ComposeSdk,
  owner: Address,
  usdcAmount: `${bigint}`,
  usdtAmount: `${bigint}`,
  slippageBps: number,
): Promise<Address> => {
  const { request } = buildMintFlow({
    owner,
    usdcAmount,
    usdtAmount,
    slippageBps,
    swapRecipient: owner,
    lpRecipient: owner,
    simulationPolicy: 'allow-revert',
  });

  const result = await sdk.client.compile(request);

  return result.userProxy as Address;
};

const buildMintFlow = ({
  owner,
  usdcAmount,
  usdtAmount,
  slippageBps = 100,
  swapRecipient,
  lpRecipient,
  simulationPolicy,
}: MintUniswapV3Input & {
  readonly swapRecipient: Address;
  readonly lpRecipient: Address;
  readonly simulationPolicy?: 'allow-revert';
}): {
  flow: Flow;
  request: ComposeCompileRequest;
} => {
  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });

  const builder = sdk.flow(OPTIMISM_CHAIN_ID, {
    name: 'uniswap-v3-mint-usdc-usdt',
    inputs: {
      usdcIn: resources.erc20(USDC, OPTIMISM_CHAIN_ID),
    },
  });

  const { a: usdcLeg, b: usdcForUsdt } = builder.core.split('split-pair', {
    bind: { source: builder.inputs.usdcIn },
    config: { bps: usdcShareBps(usdcAmount, usdtAmount) },
  });

  builder.core.approve('approve-swap', {
    bind: { amount: usdcForUsdt },
    config: { spender: UNISWAP_V3_SWAP_ROUTER },
  });

  const swapCalldata = encodeV3ExactInputSingleCalldata({
    amountIn: BigInt(usdtAmount),
    amountOutMinimum: bpsMin(usdtAmount, slippageBps),
    recipient: swapRecipient,
  });

  builder.core.rawCall('swap-to-usdt', {
    bind: {},
    config: {
      target: UNISWAP_V3_SWAP_ROUTER,
      calldata: swapCalldata,
      callType: 'Call',
    },
  });

  const usdtBalance = builder.core.balanceOf('usdt-balance', {
    bind: {},
    config: { token: USDT },
  });

  builder.core.approve('approve-usdc', {
    bind: { amount: usdcLeg },
    config: { spender: UNISWAP_V3_POSITION_MANAGER },
  });

  builder.core.approve('approve-usdt', {
    bind: { amount: usdtBalance.balance },
    config: { spender: UNISWAP_V3_POSITION_MANAGER },
  });

  const mintAmount = bpsMin(usdcAmount, slippageBps);
  const mintAmount1 = bpsMin(usdtAmount, slippageBps);

  const mintCalldata = encodeV3MintCalldata({
    usdcAmount: mintAmount,
    usdtAmount: mintAmount1,
    amount0Min: bpsMin(usdcAmount, slippageBps + 50),
    amount1Min: bpsMin(usdtAmount, slippageBps + 50),
    recipient: lpRecipient,
  });

  builder.core.rawCall('mint-position', {
    bind: {},
    config: {
      target: UNISWAP_V3_POSITION_MANAGER,
      calldata: mintCalldata,
      callType: 'Call',
    },
  });

  const flow = builder.build();

  const request = sdk.request(flow, {
    signer: owner,
    inputs: {
      usdcIn: materialisers.directDeposit({
        amount: totalDepositAmount(usdcAmount, usdtAmount),
      }),
    },
    sweepTo: builder.context.sender,
    // Omit wallet→proxy approval txs when allowance is already sufficient.
    checkOnChainAllowances: true,
    ...(simulationPolicy && { simulationPolicy }),
  });

  return { flow, request };
};

/**
 * Mint a full-range USDC/USDT Uniswap v3 LP position on Optimism via LiFi Composer.
 *
 * Op selection (https://docs.li.fi/composer/composer-api/ops/core-call):
 * - lifi.swap is preferred for swaps, but cannot consume core.split outputs.
 * - core.call supports only void or single uint256 returns and named binds — not
 *   Uniswap exactInputSingle tuples or multi-return mint().
 * - core.rawCall is used for pre-encoded SwapRouter02 + PositionManager calldata.
 *
 * Composer linearity requires every input to be consumed; we deposit USDC only
 * (USDC_AMOUNT + USDT_AMOUNT) and swap the USDT leg on-chain.
 */
export const buildMintUniswapV3 = async ({
  owner,
  usdcAmount,
  usdtAmount,
  slippageBps = 100,
  userProxy: userProxyInput,
  lpRecipient: lpRecipientInput,
}: MintUniswapV3Input): Promise<{
  flow: Flow;
  request: ComposeCompileRequest;
  userProxy: Address;
}> => {
  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });
  const userProxy =
    userProxyInput ??
    (await resolveUserProxy(sdk, owner, usdcAmount, usdtAmount, slippageBps));
  const lpRecipient = lpRecipientInput ?? owner;

  const built = buildMintFlow({
    owner,
    usdcAmount,
    usdtAmount,
    slippageBps,
    swapRecipient: userProxy,
    lpRecipient,
  });

  return { ...built, userProxy };
};
