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
import {
  isPositionNftApprovedForOperator,
  readPositionNftOwner,
  readV3PositionLiquidity,
} from './positions.js';
import {
  encodeErc721SafeTransferFromCalldata,
  encodeV3CollectCalldata,
  encodeV3DecreaseLiquidityCalldata,
} from './uniswapV3Encoding.js';

export interface WithdrawUniswapV3Input {
  readonly owner: Address;
  readonly tokenId: `${bigint}`;
  readonly liquidity?: `${bigint}`;
  readonly slippageBps?: number;
  readonly userProxy?: Address;
}

const resolveUserProxy = async (
  sdk: ReturnType<typeof createComposeSdk>,
  owner: Address,
  tokenId: `${bigint}`,
): Promise<Address> => {
  const built = buildWithdrawFlow({
    owner,
    tokenId,
    liquidity: 1n,
    userProxy: owner,
    nftOwner: owner,
    transferFromWallet: false,
  });

  const result = await sdk.client.compile(built.request);
  return result.userProxy as Address;
};

const buildWithdrawFlow = ({
  owner,
  tokenId,
  liquidity,
  userProxy,
  nftOwner,
  transferFromWallet,
}: {
  readonly owner: Address;
  readonly tokenId: `${bigint}`;
  readonly liquidity: bigint;
  readonly userProxy: Address;
  readonly nftOwner: Address;
  readonly transferFromWallet: boolean;
}): {
  flow: Flow;
  request: ComposeCompileRequest;
} => {
  const tokenIdBig = BigInt(tokenId);

  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });

  const builder = sdk.flow(OPTIMISM_CHAIN_ID, {
    name: 'uniswap-v3-withdraw-usdc-usdt',
    inputs: {},
  });

  if (transferFromWallet) {
    builder.core.rawCall('transfer-nft-to-proxy', {
      bind: {},
      config: {
        target: UNISWAP_V3_POSITION_MANAGER,
        calldata: encodeErc721SafeTransferFromCalldata({
          from: nftOwner,
          to: userProxy,
          tokenId: tokenIdBig,
        }),
        callType: 'Call',
      },
    });
  }

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
    checkOnChainAllowances: true,
    simulationPolicy: 'allow-revert',
  });

  return { flow, request };
};

export const buildWithdrawUniswapV3 = async ({
  owner,
  tokenId,
  liquidity: liquidityInput,
  userProxy: userProxyInput,
}: WithdrawUniswapV3Input): Promise<{
  flow: Flow;
  request: ComposeCompileRequest;
  liquidity: bigint;
  userProxy: Address;
  nftOwner: Address;
  needsNftApproval: boolean;
}> => {
  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });
  const tokenIdBig = BigInt(tokenId);
  const nftOwner = await readPositionNftOwner(tokenIdBig, 'v3');
  const liquidity =
    liquidityInput !== undefined
      ? BigInt(liquidityInput)
      : await readV3PositionLiquidity(tokenIdBig);

  if (liquidity === 0n) {
    throw new Error(`Position ${tokenId} has zero liquidity`);
  }

  const userProxy =
    userProxyInput ?? (await resolveUserProxy(sdk, owner, tokenId));

  const ownerLower = owner.toLowerCase();
  const proxyLower = userProxy.toLowerCase();
  const nftOwnerLower = nftOwner.toLowerCase();

  if (nftOwnerLower !== ownerLower && nftOwnerLower !== proxyLower) {
    throw new Error(
      `Position NFT ${tokenId} is owned by ${nftOwner}, not your wallet (${owner}) or LiFi user proxy (${userProxy}).`,
    );
  }

  const transferFromWallet = nftOwnerLower === ownerLower;
  const needsNftApproval =
    transferFromWallet &&
    !(await isPositionNftApprovedForOperator(owner, userProxy, 'v3'));

  const built = buildWithdrawFlow({
    owner,
    tokenId,
    liquidity,
    userProxy,
    nftOwner,
    transferFromWallet,
  });

  return {
    ...built,
    liquidity,
    userProxy,
    nftOwner,
    needsNftApproval,
  };
};
