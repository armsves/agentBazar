import { createPublicClient, formatUnits, http } from 'viem';
import { optimism } from 'viem/chains';

import { RPC_URL } from './config.js';
import { USDC, USDT } from './optimism.js';

const erc20Abi = [
  {
    type: 'function',
    name: 'balanceOf',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ type: 'uint256' }],
  },
] as const;

const client = createPublicClient({
  chain: optimism,
  transport: http(RPC_URL),
});

export const assertWalletReady = async (
  owner: `0x${string}`,
  usdcRequired: bigint,
  usdtRequired: bigint,
  options?: { readonly usdcOnlyDeposit?: boolean },
): Promise<void> => {
  const [ethBalance, usdcBalance, usdtBalance] = await Promise.all([
    client.getBalance({ address: owner }),
    client.readContract({
      address: USDC,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [owner],
    }),
    client.readContract({
      address: USDT,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [owner],
    }),
  ]);

  console.log('Wallet balances on Optimism:');
  console.log(`  ETH:  ${formatUnits(ethBalance, 18)}`);
  console.log(`  USDC: ${formatUnits(usdcBalance, 6)}`);
  console.log(`  USDT: ${formatUnits(usdtBalance, 6)}`);

  const issues: string[] = [];

  if (ethBalance === 0n) {
    issues.push('need ETH on Optimism for gas');
  }
  const totalUsdcRequired = options?.usdcOnlyDeposit
    ? usdcRequired + usdtRequired
    : usdcRequired;

  if (usdcBalance < totalUsdcRequired) {
    issues.push(
      options?.usdcOnlyDeposit
        ? `need at least ${formatUnits(totalUsdcRequired, 6)} USDC total (USDC_AMOUNT + USDT_AMOUNT; have ${formatUnits(usdcBalance, 6)})`
        : `need at least ${formatUnits(usdcRequired, 6)} USDC (have ${formatUnits(usdcBalance, 6)})`,
    );
  }
  if (!options?.usdcOnlyDeposit && usdtBalance < usdtRequired) {
    issues.push(
      `need at least ${formatUnits(usdtRequired, 6)} USDT (have ${formatUnits(usdtBalance, 6)})`,
    );
  }

  if (issues.length > 0) {
    throw new Error(
      `Wallet ${owner} is not funded for this mint:\n- ${issues.join('\n- ')}`,
    );
  }
};
