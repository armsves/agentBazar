import type { ServerKeyShare } from "@dynamic-labs-wallet/node";
import { delegatedSignTransaction } from "@dynamic-labs-wallet/node-evm";
import type { ComposeTransactionRequest } from "@lifi/compose-spec";
import {
  createPublicClient,
  http,
  type Hex,
  type TransactionSerializableEIP1559,
} from "viem";
import { optimism } from "viem/chains";

import { delegatedEvmClient } from "@/lib/dynamic/client";
import type { DelegationRecord } from "@/lib/dynamic/delegation/types";

const FALLBACK_GAS = 3_000_000n;

/**
 * Signs and broadcasts a transaction using a delegated wallet share.
 */
export async function signAndBroadcastTransaction(
  tx: ComposeTransactionRequest,
  from: `0x${string}`,
  delegation: DelegationRecord,
  rpcUrl: string,
): Promise<`0x${string}`> {
  const publicClient = createPublicClient({
    chain: optimism,
    transport: http(rpcUrl),
  });

  const baseTx = {
    to: tx.to as `0x${string}`,
    data: tx.data as `0x${string}`,
    value: BigInt(tx.value),
  };

  let gas = tx.gasLimit ? BigInt(tx.gasLimit) : undefined;

  if (gas === undefined) {
    try {
      gas = await publicClient.estimateGas({ account: from, ...baseTx });
    } catch {
      console.warn(
        `Gas estimation failed — using fallback ${FALLBACK_GAS.toString()}`,
      );
      gas = FALLBACK_GAS;
    }
  }

  gas = (gas * 120n) / 100n;

  const [nonce, feeData] = await Promise.all([
    publicClient.getTransactionCount({ address: from }),
    publicClient.estimateFeesPerGas(),
  ]);

  const transaction: TransactionSerializableEIP1559 = {
    type: "eip1559",
    chainId: optimism.id,
    nonce,
    ...baseTx,
    gas,
    maxFeePerGas: feeData.maxFeePerGas ?? 1_000_000_000n,
    maxPriorityFeePerGas: feeData.maxPriorityFeePerGas ?? 1_000_000n,
  };

  const signedTx = await delegatedSignTransaction(delegatedEvmClient(), {
    walletId: delegation.walletId,
    walletApiKey: delegation.walletApiKey,
    keyShare: delegation.delegatedShare as unknown as ServerKeyShare,
    transaction,
  });

  const hash = await publicClient.sendRawTransaction({
    serializedTransaction: signedTx as Hex,
  });

  console.info(`Broadcast: ${hash}`);
  console.info(`Explorer:  https://optimistic.etherscan.io/tx/${hash}`);

  const receipt = await publicClient.waitForTransactionReceipt({ hash });

  if (receipt.status === "reverted") {
    throw new Error(`Transaction reverted on-chain: ${hash}`);
  }

  console.info(`Confirmed in block ${receipt.blockNumber}`);
  return hash;
}
