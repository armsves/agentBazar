import type { ComposeCompileRequest, Flow } from '@lifi/compose-spec';

import { createComposeSdk, type Address } from '@lifi/composer-sdk';

import { API_KEY, BASE_URL } from './config.js';
import {
  OPTIMISM_CHAIN_ID,
  UNISWAP_V3_POSITION_MANAGER,
  UNISWAP_V4_POSITION_MANAGER,
} from './optimism.js';
import {
  isPositionNftApprovedForOperator,
  readPositionNftOwner,
} from './positions.js';
import {
  encodeErc721SafeTransferFromCalldata,
  encodeErc721SetApprovalForAllCalldata,
} from './uniswapV3Encoding.js';
import { encodeV4BurnPositionCalldata } from './uniswapV4Encoding.js';

export interface WithdrawUniswapV4Input {
  readonly owner: Address;
  readonly tokenId: `${bigint}`;
  readonly slippageBps?: number;
  readonly userProxy?: Address;
}

const permit2Expiration = (): number =>
  Math.floor(Date.now() / 1000) + 3600;

const resolveUserProxy = async (
  sdk: ReturnType<typeof createComposeSdk>,
  owner: Address,
  tokenId: `${bigint}`,
): Promise<Address> => {
  const built = buildWithdrawFlow({
    owner,
    tokenId,
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
  userProxy,
  nftOwner,
  transferFromWallet,
}: WithdrawUniswapV4Input & {
  readonly userProxy: Address;
  readonly nftOwner: Address;
  readonly transferFromWallet: boolean;
}): {
  flow: Flow;
  request: ComposeCompileRequest;
} => {
  const tokenIdBig = BigInt(tokenId);
  const deadline = BigInt(permit2Expiration());

  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });

  const builder = sdk.flow(OPTIMISM_CHAIN_ID, {
    name: 'uniswap-v4-withdraw-usdc-usdt',
    inputs: {},
  });

  if (transferFromWallet) {
    builder.core.rawCall('transfer-nft-to-proxy', {
      bind: {},
      config: {
        target: UNISWAP_V4_POSITION_MANAGER,
        calldata: encodeErc721SafeTransferFromCalldata({
          from: nftOwner,
          to: userProxy,
          tokenId: tokenIdBig,
        }),
        callType: 'Call',
      },
    });
  }

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
    checkOnChainAllowances: true,
    simulationPolicy: 'allow-revert',
  });

  return { flow, request };
};

export const buildWithdrawUniswapV4 = async ({
  owner,
  tokenId,
  userProxy: userProxyInput,
}: WithdrawUniswapV4Input): Promise<{
  flow: Flow;
  request: ComposeCompileRequest;
  userProxy: Address;
  nftOwner: Address;
  needsNftApproval: boolean;
}> => {
  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });
  const tokenIdBig = BigInt(tokenId);
  const nftOwner = await readPositionNftOwner(tokenIdBig, 'v4');

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
    !(await isPositionNftApprovedForOperator(owner, userProxy, 'v4'));

  const built = buildWithdrawFlow({
    owner,
    tokenId,
    userProxy,
    nftOwner,
    transferFromWallet,
  });

  return {
    ...built,
    userProxy,
    nftOwner,
    needsNftApproval,
  };
};

export const buildNftApprovalForWithdraw = (
  version: 'v3' | 'v4',
  operator: Address,
): {
  transactionRequest: {
    to: Address;
    data: `0x${string}`;
    value: '0';
  };
} => ({
  transactionRequest: {
    to:
      version === 'v4'
        ? UNISWAP_V4_POSITION_MANAGER
        : UNISWAP_V3_POSITION_MANAGER,
    data: encodeErc721SetApprovalForAllCalldata(operator, true),
    value: '0',
  },
});
