import type { ComposeCompileRequest, Flow } from '@lifi/compose-spec';

import {
  createComposeSdk,
  type Address,
} from '@lifi/composer-sdk';

import { API_KEY, BASE_URL } from './config.js';
import {
  OPTIMISM_CHAIN_ID,
  UNISWAP_V3_POSITION_MANAGER,
} from './optimism.js';
import { readV3PositionLiquidity } from './positions.js';
import {
  encodeV3CollectCalldata,
  encodeV3DecreaseLiquidityCalldata,
} from './uniswapV3Encoding.js';

export interface WithdrawUniswapV3Input {
  readonly owner: Address;
  readonly tokenId: `${bigint}`;
  readonly liquidity?: `${bigint}`;
  readonly slippageBps?: number;
}

export const buildWithdrawUniswapV3 = async ({
  owner,
  tokenId,
  liquidity: liquidityInput,
}: WithdrawUniswapV3Input): Promise<{
  flow: Flow;
  request: ComposeCompileRequest;
  liquidity: bigint;
}> => {
  const tokenIdBig = BigInt(tokenId);
  const liquidity =
    liquidityInput !== undefined
      ? BigInt(liquidityInput)
      : await readV3PositionLiquidity(tokenIdBig);

  if (liquidity === 0n) {
    throw new Error(`Position ${tokenId} has zero liquidity`);
  }

  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });

  const builder = sdk.flow(OPTIMISM_CHAIN_ID, {
    name: 'uniswap-v3-withdraw-usdc-usdt',
    inputs: {},
  });

  builder.core.rawCall('decrease-liquidity', {
    bind: {},
    config: {
      target: UNISWAP_V3_POSITION_MANAGER,
      calldata: encodeV3DecreaseLiquidityCalldata({
        tokenId: tokenIdBig,
        liquidity,
        amount0Min: 0n,
        amount1Min: 0n,
      }),
      callType: 'Call',
    },
  });

  builder.core.rawCall('collect-fees', {
    bind: {},
    config: {
      target: UNISWAP_V3_POSITION_MANAGER,
      calldata: encodeV3CollectCalldata({
        tokenId: tokenIdBig,
        recipient: owner,
      }),
      callType: 'Call',
    },
  });

  const flow = builder.build();

  const request = sdk.request(flow, {
    signer: owner,
    inputs: {},
    sweepTo: owner,
    checkOnChainAllowances: true,
    simulationPolicy: 'allow-revert',
  });

  return { flow, request, liquidity };
};
