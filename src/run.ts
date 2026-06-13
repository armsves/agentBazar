import { createComposeSdk } from '@lifi/composer-sdk';
import type { Address } from '@lifi/composer-sdk';

import {
  addressFromPrivateKey,
  broadcastTransaction,
  normalizePrivateKey,
} from './broadcast.js';
import {
  API_KEY,
  BASE_URL,
  OWNER,
  PRIVATE_KEY,
  UNISWAP_VERSION,
  USDC_AMOUNT,
  USDT_AMOUNT,
} from './config.js';
import { buildMintUniswapV3 } from './mintUniswapV3.js';
import { buildMintUniswapV4 } from './mintUniswapV4.js';
import {
  OPTIMISM_CHAIN_ID,
  POOL_FEE,
  UNISWAP_V3_USDC_USDT_POOL,
} from './optimism.js';
import { assertWalletReady } from './preflight.js';

const versionArg = process.argv.find((arg) => arg === 'v3' || arg === 'v4');
const version = versionArg ?? UNISWAP_VERSION;

const run = async (): Promise<void> => {
  if (!API_KEY) {
    console.error(
      'Error: LIFI_API_KEY is required.\n' +
        'Get a key from LiFi and set it in .env (see .env.example).',
    );
    process.exit(1);
  }

  if (!PRIVATE_KEY) {
    console.error(
      'Error: PRIVATE_KEY is required to sign and broadcast.\n' +
        'Set it in .env (see .env.example). Never commit this file.',
    );
    process.exit(1);
  }

  const privateKey = normalizePrivateKey(PRIVATE_KEY);
  const signer = addressFromPrivateKey(privateKey);

  if (
    OWNER &&
    OWNER.toLowerCase() !== signer.toLowerCase()
  ) {
    console.error(
      `Error: OWNER (${OWNER}) does not match PRIVATE_KEY address (${signer}).\n` +
        'Remove OWNER from .env or set it to the same address.',
    );
    process.exit(1);
  }

  const owner = signer as Address;
  const sdk = createComposeSdk({ baseUrl: BASE_URL, apiKey: API_KEY });

  console.log(`Building Uniswap ${version} USDC/USDT mint on Optimism (chain ${OPTIMISM_CHAIN_ID})`);
  console.log(`  Signer:      ${owner}`);
  console.log(`  USDC amount: ${USDC_AMOUNT} (6 decimals)`);
  console.log(`  USDT amount: ${USDT_AMOUNT} (6 decimals)`);
  console.log(`  Pool fee:    ${POOL_FEE} (0.01%)`);
  if (version === 'v3') {
    console.log(`  v3 pool:     ${UNISWAP_V3_USDC_USDT_POOL}`);
  }

  const usdcOnlyDeposit = version === 'v3' || version === 'v4';

  await assertWalletReady(
    owner,
    BigInt(USDC_AMOUNT),
    BigInt(USDT_AMOUNT),
    { usdcOnlyDeposit },
  );
  console.log('');

  let liquidity: bigint | undefined;
  const built =
    version === 'v4'
      ? await (async () => {
          const result = await buildMintUniswapV4({
            owner,
            usdcAmount: USDC_AMOUNT as `${bigint}`,
            usdtAmount: USDT_AMOUNT as `${bigint}`,
          });
          liquidity = result.liquidity;
          return result;
        })()
      : await buildMintUniswapV3({
          owner,
          usdcAmount: USDC_AMOUNT as `${bigint}`,
          usdtAmount: USDT_AMOUNT as `${bigint}`,
        });

  if (liquidity !== undefined) {
    console.log(`  Estimated v4 liquidity: ${liquidity.toString()}`);
  }
  if (version === 'v3' && 'userProxy' in built) {
    console.log(`  User proxy:  ${built.userProxy}`);
    console.log(
      `  USDC deposit: ${BigInt(USDC_AMOUNT) + BigInt(USDT_AMOUNT)} (USDC_AMOUNT + USDT_AMOUNT)`,
    );
  }
  if (version === 'v4' && 'userProxy' in built) {
    console.log(`  User proxy:  ${built.userProxy}`);
    console.log(
      `  USDC deposit: ${BigInt(USDC_AMOUNT) + BigInt(USDT_AMOUNT)} (USDC_AMOUNT + USDT_AMOUNT)`,
    );
  }

  console.log(`\n--- Compiling against ${BASE_URL} ---`);
  const result = await sdk.client.compile(built.request);

  if (result.status !== 'success') {
    console.error('\nCompile/simulation failed:', result.error.message);
    if (result.simulationRevert) {
      console.error('Revert:', result.simulationRevert);
    }
    process.exit(1);
  }

  console.log('\nCompile succeeded.');

  const { transactionRequest, userProxy, approvals } = result;
  console.log(`\nUser proxy: ${userProxy}`);
  console.log(`  to:    ${transactionRequest.to}`);
  console.log(`  value: ${transactionRequest.value}`);
  console.log(
    `  gas:   ${transactionRequest.gasLimit ?? '(will estimate)'}`,
  );

  console.log('\n--- Signing and broadcasting ---');

  // Compile may return wallet→userProxy ERC-20 approvals that must confirm
  // before the compose tx can pull directDeposit inputs (see Composer approvals).
  if (approvals && approvals.length > 0) {
    console.log(`\nPreflight approvals (${approvals.length}):`);
    for (const [index, approval] of approvals.entries()) {
      console.log(
        `  [${index + 1}] ${approval.token} -> ${approval.spender} (${approval.amount})`,
      );
      await broadcastTransaction(approval.transactionRequest, privateKey);
    }
  } else {
    console.log('\nNo wallet preflight approvals required.');
  }

  await broadcastTransaction(transactionRequest, privateKey);
};

run().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
