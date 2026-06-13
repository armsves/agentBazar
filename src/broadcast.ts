import type { ComposeTransactionRequest } from '@lifi/compose-spec';
import {
  createPublicClient,
  createWalletClient,
  http,
  type Hex,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { optimism } from 'viem/chains';

import { RPC_URL } from './config.js';

const FALLBACK_GAS = 3_000_000n;

export const normalizePrivateKey = (key: string): Hex => {
  const trimmed = key.trim();
  const hex = trimmed.startsWith('0x') ? trimmed : `0x${trimmed}`;
  return hex as Hex;
};

export const addressFromPrivateKey = (privateKey: Hex): `0x${string}` =>
  privateKeyToAccount(privateKey).address;

export const broadcastTransaction = async (
  tx: ComposeTransactionRequest,
  privateKey: Hex,
): Promise<`0x${string}`> => {
  const account = privateKeyToAccount(privateKey);
  const transport = http(RPC_URL);

  const publicClient = createPublicClient({
    chain: optimism,
    transport,
  });

  const walletClient = createWalletClient({
    account,
    chain: optimism,
    transport,
  });

  const baseTx = {
    to: tx.to as `0x${string}`,
    data: tx.data as `0x${string}`,
    value: BigInt(tx.value),
  };

  let gas = tx.gasLimit ? BigInt(tx.gasLimit) : undefined;

  if (gas === undefined) {
    try {
      gas = await publicClient.estimateGas({
        account: account.address,
        ...baseTx,
      });
    } catch {
      console.warn(
        `Gas estimation failed — using fallback ${FALLBACK_GAS.toString()}`,
      );
      gas = FALLBACK_GAS;
    }
  }

  // Composer flows can underestimate gas; add headroom to avoid OOG reverts.
  gas = (gas * 120n) / 100n;

  const hash = await walletClient.sendTransaction({ ...baseTx, gas });

  console.log(`\nBroadcast: ${hash}`);
  console.log(`Explorer:  https://optimistic.etherscan.io/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === 'reverted') {
    throw new Error(`Transaction reverted on-chain: ${hash}`);
  }

  console.log(`Confirmed in block ${receipt.blockNumber}`);
  return hash;
};
