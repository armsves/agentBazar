import type { ComposeCompileRequest, Flow } from '@lifi/compose-spec';

import { createComposeSdk, type Address } from '@lifi/composer-sdk';

import { API_KEY, BASE_URL } from './config.js';
import {
  OPTIMISM_CHAIN_ID,
  UNISWAP_V3_POSITION_MANAGER,
  UNISWAP_V4_POSITION_MANAGER,
} from './optimism.js';
import { readPositionNftOwner } from './positions.js';
import { encodeErc721SetApprovalForAllCalldata } from './uniswapV3Encoding.js';
import { encodeV4BurnPositionCalldata } from './uniswapV4Encoding.js';

export interface WithdrawUniswapV4Input {
  readonly owner: Address;
  readonly tokenId: `${bigint}`;
  readonly slippageBps?: number;
  readonly userProxy?: Address;
}

export type WithdrawUniswapV4Build =
  | {
      readonly mode: 'direct';
      readonly transactionRequest: {
        readonly to: Address;
        readonly data: `0x${string}`;
        readonly value: '0';
      };
      readonly userProxy: Address;
      readonly nftOwner: Address;
      readonly needsNftApproval: false;
    }
  | {
      readonly mode: 'composer';
      readonly flow: Flow;
      readonly request: ComposeCompileRequest;
      readonly userProxy: Address;
      readonly nftOwner: Address;
      readonly needsNftApproval: false;
    };

const permit2Expiration = (): number =>
  Math.floor(Date.now() / 1000) + 3600;

const resolveUserProxy = async (
  sdk: ReturnType<typeof createComposeSdk>,
  owner: Address,
  tokenId: `${bigint}`,
): Promise<Address> => {
  const built = buildComposerWithdrawFlow({
    owner,
    tokenId,
    recipient: owner,
  });

  const result = await sdk.client.compile(built.request);
  return result.userProxy as Address;
};

const buildBurnCalldata = (
  tokenId: `${bigint}`,
  recipient: Address,
): `0x${string}` =>
  encodeV4BurnPositionCalldata({
    tokenId: BigInt(tokenId),
    amount0Min: 0n,
    amount1Min: 0n,
    recipient,
    deadline: BigInt(permit2Expiration()),
  });

const buildComposerWithdrawFlow = ({
  owner,
  tokenId,
  recipient,
}: {
  readonly owner: Address;
  readonly tokenId: `${bigint}`;
  readonly recipient: Address;
}): {
  flow: Flow;
  request: ComposeCompileRequest;
} => {
  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });

  const builder = sdk.flow(OPTIMISM_CHAIN_ID, {
    name: 'uniswap-v4-withdraw-usdc-usdt',
    inputs: {},
  });

  builder.core.rawCall('burn-position', {
    bind: {},
    config: {
      target: UNISWAP_V4_POSITION_MANAGER,
      calldata: buildBurnCalldata(tokenId, recipient),
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

/**
 * Wallet-held v4 NFTs cannot be transferred into the LiFi user proxy — burn
 * directly on the PositionManager. Proxy-held NFTs (composer-v4-lp deposits)
 * burn via Composer.
 */
export const buildWithdrawUniswapV4 = async ({
  owner,
  tokenId,
  userProxy: userProxyInput,
}: WithdrawUniswapV4Input): Promise<WithdrawUniswapV4Build> => {
  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });
  const nftOwner = await readPositionNftOwner(BigInt(tokenId), 'v4');

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

  if (nftOwnerLower === ownerLower) {
    return {
      mode: 'direct',
      transactionRequest: {
        to: UNISWAP_V4_POSITION_MANAGER,
        data: buildBurnCalldata(tokenId, owner),
        value: '0',
      },
      userProxy,
      nftOwner,
      needsNftApproval: false,
    };
  }

  const built = buildComposerWithdrawFlow({
    owner,
    tokenId,
    recipient: owner,
  });

  return {
    mode: 'composer',
    ...built,
    userProxy,
    nftOwner,
    needsNftApproval: false,
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
