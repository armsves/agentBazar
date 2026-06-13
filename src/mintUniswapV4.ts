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
  PERMIT2,
  UNISWAP_V3_SWAP_ROUTER,
  UNISWAP_V4_POSITION_MANAGER,
  USDC,
  USDT,
} from './optimism.js';
import { encodeV3ExactInputSingleCalldata } from './uniswapV3Encoding.js';
import {
  encodePermit2ApproveCalldata,
  encodeV4ModifyLiquiditiesCalldata,
  estimateV4Liquidity,
} from './uniswapV4Encoding.js';

export interface MintUniswapV4Input {
  readonly owner: Address;
  readonly usdcAmount: `${bigint}`;
  readonly usdtAmount: `${bigint}`;
  readonly slippageBps?: number;
  readonly userProxy?: Address;
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

const permit2Expiration = (): number =>
  Math.floor(Date.now() / 1000) + 3600;

const maxPermit2Amount = (): bigint => (1n << 160n) - 1n;

const resolveUserProxy = async (
  sdk: ComposeSdk,
  owner: Address,
  usdcAmount: `${bigint}`,
  usdtAmount: `${bigint}`,
  slippageBps: number,
  liquidity: bigint,
): Promise<Address> => {
  const { request } = buildMintFlow({
    owner,
    usdcAmount,
    usdtAmount,
    slippageBps,
    liquidity,
    swapRecipient: owner,
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
  liquidity,
  swapRecipient,
  simulationPolicy,
}: MintUniswapV4Input & {
  readonly liquidity: bigint;
  readonly swapRecipient: Address;
  readonly simulationPolicy?: 'allow-revert';
}): {
  flow: Flow;
  request: ComposeCompileRequest;
} => {
  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });

  const builder = sdk.flow(OPTIMISM_CHAIN_ID, {
    name: 'uniswap-v4-mint-usdc-usdt',
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

  builder.core.approve('approve-usdc-permit2', {
    bind: { amount: usdcLeg },
    config: { spender: PERMIT2 },
  });

  builder.core.approve('approve-usdt-permit2', {
    bind: { amount: usdtBalance.balance },
    config: { spender: PERMIT2 },
  });

  const permitExpiry = permit2Expiration();

  builder.core.rawCall('permit2-approve-usdc', {
    bind: {},
    config: {
      target: PERMIT2,
      calldata: encodePermit2ApproveCalldata({
        token: USDC,
        spender: UNISWAP_V4_POSITION_MANAGER,
        amount: maxPermit2Amount(),
        expiration: permitExpiry,
      }),
      callType: 'Call',
    },
  });

  builder.core.rawCall('permit2-approve-usdt', {
    bind: {},
    config: {
      target: PERMIT2,
      calldata: encodePermit2ApproveCalldata({
        token: USDT,
        spender: UNISWAP_V4_POSITION_MANAGER,
        amount: maxPermit2Amount(),
        expiration: permitExpiry,
      }),
      callType: 'Call',
    },
  });

  const amount0Max = bpsMin(usdcAmount, slippageBps);
  const amount1Max = bpsMin(usdtAmount, slippageBps);

  const mintCalldata = encodeV4ModifyLiquiditiesCalldata({
    liquidity,
    amount0Max,
    amount1Max,
    owner,
    deadline: BigInt(permitExpiry),
  });

  builder.core.rawCall('mint-position', {
    bind: {},
    config: {
      target: UNISWAP_V4_POSITION_MANAGER,
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
    checkOnChainAllowances: true,
    ...(simulationPolicy && { simulationPolicy }),
  });

  return { flow, request };
};

/**
 * Mint a full-range USDC/USDT Uniswap v4 LP position on Optimism via LiFi Composer.
 *
 * Uses core.rawCall for modifyLiquidities (MINT_POSITION + SETTLE_PAIR) because
 * core.invoke cannot encode nested action tuples. Same USDC-only deposit pattern as v3.
 *
 * @see https://developers.uniswap.org/docs/protocols/v4/guides/position-manager
 */
export const buildMintUniswapV4 = async ({
  owner,
  usdcAmount,
  usdtAmount,
  slippageBps = 100,
  userProxy: userProxyInput,
}: MintUniswapV4Input): Promise<{
  flow: Flow;
  request: ComposeCompileRequest;
  liquidity: bigint;
  userProxy: Address;
}> => {
  const amount0Max = bpsMin(usdcAmount, slippageBps);
  const amount1Max = bpsMin(usdtAmount, slippageBps);
  const liquidity = await estimateV4Liquidity(amount0Max, amount1Max);

  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });
  const userProxy =
    userProxyInput ??
    (await resolveUserProxy(
      sdk,
      owner,
      usdcAmount,
      usdtAmount,
      slippageBps,
      liquidity,
    ));

  const built = buildMintFlow({
    owner,
    usdcAmount,
    usdtAmount,
    slippageBps,
    liquidity,
    swapRecipient: userProxy,
  });

  return { ...built, liquidity, userProxy };
};
