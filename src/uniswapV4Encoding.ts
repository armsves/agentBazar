import {
  createPublicClient,
  encodeAbiParameters,
  encodeFunctionData,
  encodePacked,
  http,
  keccak256,
  parseAbi,
  parseAbiParameters,
} from 'viem';
import { optimism } from 'viem/chains';

import {
  NO_HOOKS,
  POOL_FEE,
  TICK_LOWER,
  TICK_UPPER,
  UNISWAP_V4_POSITION_MANAGER,
  UNISWAP_V4_STATE_VIEW,
  USDC,
  USDT,
} from './optimism.js';

const Q96 = 2n ** 96n;

const SQRT_RATIO_MIN = 4295128739n;
const SQRT_RATIO_MAX =
  1461446703485210103287273052203988822378723970342n;

const ACTIONS_MINT_POSITION = 0x02;
const ACTIONS_SETTLE_PAIR = 0x0d;

const mulDiv = (a: bigint, b: bigint, denominator: bigint): bigint =>
  (a * b) / denominator;

const getLiquidityForAmount0 = (
  sqrtAX96: bigint,
  sqrtBX96: bigint,
  amount0: bigint,
): bigint => {
  if (sqrtAX96 > sqrtBX96) [sqrtAX96, sqrtBX96] = [sqrtBX96, sqrtAX96];
  const intermediate = mulDiv(sqrtAX96, sqrtBX96, Q96);
  return mulDiv(amount0, intermediate, sqrtBX96 - sqrtAX96);
};

const getLiquidityForAmount1 = (
  sqrtAX96: bigint,
  sqrtBX96: bigint,
  amount1: bigint,
): bigint => {
  if (sqrtAX96 > sqrtBX96) [sqrtAX96, sqrtBX96] = [sqrtBX96, sqrtAX96];
  return mulDiv(amount1, Q96, sqrtBX96 - sqrtAX96);
};

const getLiquidityForAmounts = (
  sqrtRatioX96: bigint,
  sqrtRatioAX96: bigint,
  sqrtRatioBX96: bigint,
  amount0: bigint,
  amount1: bigint,
): bigint => {
  let sqrtA = sqrtRatioAX96;
  let sqrtB = sqrtRatioBX96;
  if (sqrtA > sqrtB) [sqrtA, sqrtB] = [sqrtB, sqrtA];

  if (sqrtRatioX96 <= sqrtA) {
    return getLiquidityForAmount0(sqrtA, sqrtB, amount0);
  }
  if (sqrtRatioX96 >= sqrtB) {
    return getLiquidityForAmount1(sqrtA, sqrtB, amount1);
  }

  const liquidity0 = getLiquidityForAmount0(sqrtRatioX96, sqrtB, amount0);
  const liquidity1 = getLiquidityForAmount1(sqrtA, sqrtRatioX96, amount1);
  return liquidity0 < liquidity1 ? liquidity0 : liquidity1;
};

const poolKeyAbi = parseAbiParameters(
  'address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks',
);

export const getV4PoolId = (): `0x${string}` =>
  keccak256(
    encodeAbiParameters(poolKeyAbi, [USDC, USDT, POOL_FEE, 1, NO_HOOKS]),
  );

const stateViewAbi = parseAbi([
  'function getSlot0(bytes32 poolId) view returns (uint160 sqrtPriceX96, int24 tick, uint24 protocolFee, uint24 lpFee)',
]);

const positionManagerAbi = parseAbi([
  'function modifyLiquidities(bytes calldata unlockData, uint256 deadline) external payable',
]);

const optimismClient = createPublicClient({
  chain: optimism,
  transport: http('https://mainnet.optimism.io'),
});

export const fetchV4SqrtPriceX96 = async (): Promise<bigint> => {
  const poolId = getV4PoolId();
  const slot0 = await optimismClient.readContract({
    address: UNISWAP_V4_STATE_VIEW,
    abi: stateViewAbi,
    functionName: 'getSlot0',
    args: [poolId],
  });

  if (slot0[0] === 0n) {
    throw new Error(
      `USDC/USDT v4 pool (id ${poolId}) is not initialized on Optimism. ` +
        'Create the pool first or use UNISWAP_VERSION=v3.',
    );
  }

  return slot0[0];
};

export const estimateV4Liquidity = async (
  usdcAmount: bigint,
  usdtAmount: bigint,
): Promise<bigint> => {
  const sqrtPriceX96 = await fetchV4SqrtPriceX96();

  return getLiquidityForAmounts(
    sqrtPriceX96,
    SQRT_RATIO_MIN,
    SQRT_RATIO_MAX,
    usdcAmount,
    usdtAmount,
  );
};

export interface EncodeV4MintInput {
  readonly liquidity: bigint;
  readonly amount0Max: bigint;
  readonly amount1Max: bigint;
  readonly owner: `0x${string}`;
  readonly deadline: bigint;
}

export const encodePermit2ApproveCalldata = ({
  token,
  spender,
  amount,
  expiration,
}: {
  readonly token: `0x${string}`;
  readonly spender: `0x${string}`;
  readonly amount: bigint;
  readonly expiration: number;
}): `0x${string}` => {
  const permit2Abi = parseAbi([
    'function approve(address token, address spender, uint160 amount, uint48 expiration) external',
  ]);

  return encodeFunctionData({
    abi: permit2Abi,
    functionName: 'approve',
    args: [token, spender, amount, expiration],
  });
};

export const encodeV4ModifyLiquiditiesCalldata = ({
  liquidity,
  amount0Max,
  amount1Max,
  owner,
  deadline,
}: EncodeV4MintInput): `0x${string}` => {
  const actions = encodePacked(
    ['uint8', 'uint8'],
    [ACTIONS_MINT_POSITION, ACTIONS_SETTLE_PAIR],
  );

  const mintParams = encodeAbiParameters(
    parseAbiParameters(
      '(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks) poolKey, int24 tickLower, int24 tickUpper, uint256 liquidity, uint128 amount0Max, uint128 amount1Max, address owner, bytes hookData',
    ),
    [
      {
        currency0: USDC,
        currency1: USDT,
        fee: POOL_FEE,
        tickSpacing: 1,
        hooks: NO_HOOKS,
      },
      TICK_LOWER,
      TICK_UPPER,
      liquidity,
      amount0Max,
      amount1Max,
      owner,
      '0x',
    ],
  );

  const settleParams = encodeAbiParameters(
    parseAbiParameters('address currency0, address currency1'),
    [USDC, USDT],
  );

  const unlockData = encodeAbiParameters(
    parseAbiParameters('bytes actions, bytes[] params'),
    [actions, [mintParams, settleParams]],
  );

  return encodeFunctionData({
    abi: positionManagerAbi,
    functionName: 'modifyLiquidities',
    args: [unlockData, deadline],
  });
};

export const UNISWAP_V4_PM = UNISWAP_V4_POSITION_MANAGER;
