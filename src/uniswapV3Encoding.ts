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

const withdrawAbi = parseAbi([
  'function decreaseLiquidity((uint256 tokenId, uint128 liquidity, uint256 amount0Min, uint256 amount1Min, uint256 deadline) params) external payable returns (uint256 amount0, uint256 amount1)',
  'function collect((uint256 tokenId, address recipient, uint128 amount0Max, uint128 amount1Max) params) external payable returns (uint256 amount0, uint256 amount1)',
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

export interface EncodeV3WithdrawInput {
  readonly tokenId: bigint;
  readonly liquidity: bigint;
  readonly amount0Min: bigint;
  readonly amount1Min: bigint;
}

export const encodeV3DecreaseLiquidityCalldata = ({
  tokenId,
  liquidity,
  amount0Min,
  amount1Min,
}: EncodeV3WithdrawInput): `0x${string}` =>
  encodeFunctionData({
    abi: withdrawAbi,
    functionName: 'decreaseLiquidity',
    args: [
      {
        tokenId,
        liquidity,
        amount0Min,
        amount1Min,
        deadline: 9_999_999_999n,
      },
    ],
  });

export const encodeV3CollectCalldata = ({
  tokenId,
  recipient,
}: {
  readonly tokenId: bigint;
  readonly recipient: `0x${string}`;
}): `0x${string}` =>
  encodeFunctionData({
    abi: withdrawAbi,
    functionName: 'collect',
    args: [
      {
        tokenId,
        recipient,
        amount0Max: (1n << 128n) - 1n,
        amount1Max: (1n << 128n) - 1n,
      },
    ],
  });

export interface EncodeV3SwapUsdtToUsdcInput {
  readonly amountIn: bigint;
  readonly amountOutMinimum: bigint;
  readonly recipient: `0x${string}`;
}

export const encodeV3SwapUsdtToUsdcCalldata = ({
  amountIn,
  amountOutMinimum,
  recipient,
}: EncodeV3SwapUsdtToUsdcInput): `0x${string}` =>
  encodeFunctionData({
    abi: swapRouterAbi,
    functionName: 'exactInputSingle',
    args: [
      {
        tokenIn: USDT,
        tokenOut: USDC,
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

const erc721Abi = parseAbi([
  'function setApprovalForAll(address operator, bool approved)',
  'function safeTransferFrom(address from, address to, uint256 tokenId)',
]);

export const encodeErc721SetApprovalForAllCalldata = (
  operator: `0x${string}`,
  approved = true,
): `0x${string}` =>
  encodeFunctionData({
    abi: erc721Abi,
    functionName: 'setApprovalForAll',
    args: [operator, approved],
  });

export const encodeErc721SafeTransferFromCalldata = ({
  from,
  to,
  tokenId,
}: {
  readonly from: `0x${string}`;
  readonly to: `0x${string}`;
  readonly tokenId: bigint;
}): `0x${string}` =>
  encodeFunctionData({
    abi: erc721Abi,
    functionName: 'safeTransferFrom',
    args: [from, to, tokenId],
  });
