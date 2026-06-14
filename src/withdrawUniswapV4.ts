import type { ComposeCompileRequest, Flow } from '@lifi/compose-spec';

import { createComposeSdk, type Address } from '@lifi/composer-sdk';

import { API_KEY, BASE_URL } from './config.js';
import { OPTIMISM_CHAIN_ID, UNISWAP_V4_POSITION_MANAGER } from './optimism.js';
import { encodeV4BurnPositionCalldata } from './uniswapV4Encoding.js';

export interface WithdrawUniswapV4Input {
  readonly owner: Address;
  readonly tokenId: `${bigint}`;
  readonly slippageBps?: number;
}

const permit2Expiration = (): number =>
  Math.floor(Date.now() / 1000) + 3600;

export const buildWithdrawUniswapV4 = async ({
  owner,
  tokenId,
}: WithdrawUniswapV4Input): Promise<{
  flow: Flow;
  request: ComposeCompileRequest;
}> => {
  const tokenIdBig = BigInt(tokenId);
  const deadline = BigInt(permit2Expiration());

  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });

  const builder = sdk.flow(OPTIMISM_CHAIN_ID, {
    name: 'uniswap-v4-withdraw-usdc-usdt',
    inputs: {},
  });

  builder.core.rawCall('burn-position', {
    bind: {},
    config: {
      target: UNISWAP_V4_POSITION_MANAGER,
      calldata: encodeV4BurnPositionCalldata({
        tokenId: tokenIdBig,
        amount0Min: 0n,
        amount1Min: 0n,
        deadline,
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

  return { flow, request };
};
