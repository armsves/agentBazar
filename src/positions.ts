import { createPublicClient, http, parseAbi } from 'viem';
import { optimism } from 'viem/chains';

import { UNISWAP_V3_POSITION_MANAGER } from './optimism.js';

const positionManagerAbi = parseAbi([
  'function positions(uint256 tokenId) view returns (uint96 nonce, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, uint256 feeGrowthInside0LastX128, uint256 feeGrowthInside1LastX128, uint128 tokensOwed0, uint128 tokensOwed1)',
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
    abi: positionManagerAbi,
    functionName: 'positions',
    args: [tokenId],
  });

  return BigInt(position[7]);
}
