import { encodeFunctionData, parseAbi } from 'viem';

import {
  POOL_FEE,
  TICK_LOWER,
  TICK_UPPER,
  UNISWAP_V3_POSITION_MANAGER,
  UNISWAP_V3_SWAP_ROUTER,
  USDC,
  USDT,
} from './optimism.js';

const positionManagerAbi = parseAbi([
  'function mint((address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint256 amount0Desired, uint256 amount1Desired, uint256 amount0Min, uint256 amount1Min, address recipient, uint256 deadline) params) external payable returns (uint256 tokenId, uint128 liquidity, uint256 amount0, uint256 amount1)',
]);

const swapRouterAbi = parseAbi([
  'function exactInputSingle((address tokenIn, address tokenOut, uint24 fee, address recipient, uint256 amountIn, uint256 amountOutMinimum, uint160 sqrtPriceLimitX96) params) returns (uint256 amountOut)',
]);

export interface EncodeV3MintInput {
  readonly usdcAmount: bigint;
  readonly usdtAmount: bigint;
  readonly amount0Min: bigint;
  readonly amount1Min: bigint;
  readonly recipient: `0x${string}`;
}

export const encodeV3MintCalldata = ({
  usdcAmount,
  usdtAmount,
  amount0Min,
  amount1Min,
  recipient,
}: EncodeV3MintInput): `0x${string}` =>
  encodeFunctionData({
    abi: positionManagerAbi,
    functionName: 'mint',
    args: [
      {
        token0: USDC,
        token1: USDT,
        fee: POOL_FEE,
        tickLower: TICK_LOWER,
        tickUpper: TICK_UPPER,
        amount0Desired: usdcAmount,
        amount1Desired: usdtAmount,
        amount0Min,
        amount1Min,
        recipient,
        deadline: 9_999_999_999n,
      },
    ],
  });

export interface EncodeV3SwapInput {
  readonly amountIn: bigint;
  readonly amountOutMinimum: bigint;
  readonly recipient: `0x${string}`;
}

export const encodeV3ExactInputSingleCalldata = ({
  amountIn,
  amountOutMinimum,
  recipient,
}: EncodeV3SwapInput): `0x${string}` =>
  encodeFunctionData({
    abi: swapRouterAbi,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: USDC,
        tokenOut: USDT,
        fee: POOL_FEE,
        recipient,
        amountIn,
        amountOutMinimum,
        sqrtPriceLimitX96: 0n,
      },
    ],
  });

export const UNISWAP_V3_PM = UNISWAP_V3_POSITION_MANAGER;
export const UNISWAP_V3_ROUTER = UNISWAP_V3_SWAP_ROUTER;
