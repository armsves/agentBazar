// Load `.env` before reading process.env.
try {
  process.loadEnvFile();
} catch {
  // No `.env` file — rely on ambient environment variables.
}

export const BASE_URL =
  process.env['COMPOSER_BASE_URL'] ?? 'https://composer.li.quest';

export const API_KEY = process.env['LIFI_API_KEY'];

export const PRIVATE_KEY = process.env['PRIVATE_KEY'];

/** Optional — if set, must match the address derived from PRIVATE_KEY. */
export const OWNER = process.env['OWNER'];

export const USDC_AMOUNT =
  process.env['USDC_AMOUNT'] ?? '1000000';

export const USDT_AMOUNT =
  process.env['USDT_AMOUNT'] ?? '1000000';

export const UNISWAP_VERSION =
  process.env['UNISWAP_VERSION'] ?? 'v3';

export const RPC_URL =
  process.env['RPC_URL'] ?? 'https://mainnet.optimism.io';
