import { createPublicClient, http, parseAbi } from 'viem';
import { optimism } from 'viem/chains';

import {
  UNISWAP_V3_POSITION_MANAGER,
  UNISWAP_V4_POSITION_MANAGER,
} from './optimism.js';

const v3PositionManagerAbi = parseAbi([
  'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
]);

const erc721Abi = parseAbi([
  'function ownerOf(uint256 tokenId) view returns (address)',
  'function isApprovedForAll(address owner, address operator) view returns (bool)',
]);

const optimismClient = createPublicClient({
  chain: optimism,
  transport: http(process.env.RPC_URL ?? 'https://mainnet.optimism.io'),
});

export async function readV3PositionLiquidity(
  tokenId: bigint,
): Promise<bigint> {
  const position = await optimismClient.readContract({
    address: UNISWAP_V3_POSITION_MANAGER,
    abi: v3PositionManagerAbi,
    functionName: 'positions',
    args: [tokenId],
  });

  return BigInt(position[7]);
}

export async function readPositionNftOwner(
  tokenId: bigint,
  version: 'v3' | 'v4',
): Promise<`0x${string}`> {
  const manager =
    version === 'v4'
      ? UNISWAP_V4_POSITION_MANAGER
      : UNISWAP_V3_POSITION_MANAGER;

  return optimismClient.readContract({
    address: manager,
    abi: erc721Abi,
    functionName: 'ownerOf',
    args: [tokenId],
  });
}

export async function isPositionNftApprovedForOperator(
  owner: `0x${string}`,
  operator: `0x${string}`,
  version: 'v3' | 'v4',
): Promise<boolean> {
  const manager =
    version === 'v4'
      ? UNISWAP_V4_POSITION_MANAGER
      : UNISWAP_V3_POSITION_MANAGER;

  return optimismClient.readContract({
    address: manager,
    abi: erc721Abi,
    functionName: 'isApprovedForAll',
    args: [owner, operator],
  });
}
