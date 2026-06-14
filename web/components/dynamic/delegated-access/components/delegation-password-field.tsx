"use client";

interface DelegationPasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
}

export default function DelegationPasswordField({
  value,
  onChange,
  required = false,
}: DelegationPasswordFieldProps) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      Wallet password {required ? "(required)" : "(if your wallet uses one)"}
      <input
        type="password"
        className="border-input bg-background rounded-md border px-3 py-2"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Password you set when creating the wallet"
        autoComplete="current-password"
      />
      <span className="text-muted-foreground text-xs">
        Password-protected WaaS wallets must be unlocked before delegation.
        Dynamic&apos;s modal does not collect this for you.
      </span>
    </label>
  );
}
