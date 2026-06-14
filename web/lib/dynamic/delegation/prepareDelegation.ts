import { ChainEnum } from "@dynamic-labs/sdk-api-core";

type DelegationWallet = {
  address: string;
  chain: ChainEnum | string;
};

type WalletPasswordApi = {
  checkWalletLockState: (params: {
    accountAddress: string;
    chainName: ChainEnum;
  }) => Promise<{
    isPasswordEncrypted?: boolean;
    isLocked?: boolean;
  } | null>;
  unlockWallet: (params: {
    accountAddress: string;
    chainName: ChainEnum;
    password: string;
  }) => Promise<boolean>;
};

export async function walletNeedsPassword(
  wallet: DelegationWallet,
  walletPasswordApi: WalletPasswordApi,
): Promise<boolean> {
  const recoveryState = await walletPasswordApi.checkWalletLockState({
    accountAddress: wallet.address,
    chainName: wallet.chain as ChainEnum,
  });

  return recoveryState?.isPasswordEncrypted === true;
}

export async function ensureWalletUnlocked(
  wallet: DelegationWallet,
  walletPasswordApi: WalletPasswordApi,
  password?: string,
): Promise<void> {
  const recoveryState = await walletPasswordApi.checkWalletLockState({
    accountAddress: wallet.address,
    chainName: wallet.chain as ChainEnum,
  });

  if (!recoveryState?.isPasswordEncrypted) {
    return;
  }

  if (!recoveryState.isLocked) {
    return;
  }

  if (!password) {
    throw new Error(
      "This wallet is password-protected. Enter your wallet password before delegating.",
    );
  }

  const unlocked = await walletPasswordApi.unlockWallet({
    accountAddress: wallet.address,
    chainName: wallet.chain as ChainEnum,
    password,
  });

  if (!unlocked) {
    throw new Error("Failed to unlock wallet. Check your password and try again.");
  }
}
