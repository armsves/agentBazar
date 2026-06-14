import DelegatedAccess from "@/components/dynamic/delegated-access";
import LpMint from "@/components/mint/lp-mint";
import DelegationHero from "@/components/info/delegation-hero";
import DelegationSteps from "@/components/info/delegation-steps";
import DelegationUseCases from "@/components/info/delegation-use-cases";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SetupPage() {
  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <Button variant="ghost" size="sm" className="w-fit" asChild>
        <Link href="/">
          <ArrowLeft className="mr-2 size-4" />
          Back to Agent Bazar
        </Link>
      </Button>
      <DelegationHero />
      <DelegationSteps />
      <DelegatedAccess />
      <LpMint />
      <DelegationUseCases />
    </div>
  );
}
