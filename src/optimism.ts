export const OPTIMISM_CHAIN_ID = 10;

/** Native USDC issued by Circle on Optimism (not USDC.e). */
export const USDC =
  '0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85' as const;

/** Legacy bridged USDC.e — old pools only; do not use for new deposits. */
export const USDC_E =
  '0x7f5c764cbc14f9669b88837ca1490cca17c31607' as const;

export const USDT =
  '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58' as const;

/** Uniswap v3 NonfungiblePositionManager on Optimism. */
export const UNISWAP_V3_POSITION_MANAGER =
  '0xC36442b4a4522E871399CD717aBDD847Ab11FE88' as const;

/** Uniswap v3 SwapRouter02 on Optimism. */
export const UNISWAP_V3_SWAP_ROUTER =
  '0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45' as const;

/** Native USDC/USDT v3 pool on Optimism (0.01% fee, tick spacing 1). */
export const UNISWAP_V3_USDC_USDT_POOL =
  '0xa73c628eaf6e283e26a7b1f8001cf186aa4c0e8e' as const;

/** Permit2 on Optimism (canonical Uniswap deployment). */
export const PERMIT2 =
  '0x000000000022D473030f116dDEE9f6B43aC78BA3' as const;

/** LiFi Composer ProxyFactory on Optimism — main compose tx target. */
export const LIFI_COMPOSER_PROXY_FACTORY =
  '0xe174D02351656a883f6626497C86684e849efB35' as const;

/** Uniswap v4 PositionManager on Optimism. */
export const UNISWAP_V4_POSITION_MANAGER =
  '0x3c3ea4b57a46241e54610e5f022e5c45859a1017' as const;

/** Uniswap v4 PoolManager on Optimism. */
export const UNISWAP_V4_POOL_MANAGER =
  '0x9a13f98cb987694c9f086b1f5eb990eea8264ec3' as const;

/** Uniswap v4 StateView on Optimism. */
export const UNISWAP_V4_STATE_VIEW =
  '0xc18a3169788f4f75a170290584eca6395c75ecdb' as const;

/** 0.01% fee tier — matches the main v3 USDC/USDT pool on Optimism. */
export const POOL_FEE = 100;

/** Full-range ticks for tick spacing 1 stablecoin pools. */
export const TICK_LOWER = -887_272;
export const TICK_UPPER = 887_272;

/** Zero address — no hooks on the canonical USDC/USDT pools. */
export const NO_HOOKS =
  '0x0000000000000000000000000000000000000000' as const;
