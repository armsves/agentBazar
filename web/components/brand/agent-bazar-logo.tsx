import Image from "next/image";

interface AgentBazarLogoProps {
  className?: string;
  height?: number;
}

export default function AgentBazarLogo({
  className = "",
  height = 36,
}: AgentBazarLogoProps) {
  const width = Math.round(height * (512 / 172));

  return (
    <>
      <Image
        src="/brand/logo-light.png"
        alt="Agent Bazar"
        width={width}
        height={height}
        className={`h-9 w-auto dark:hidden ${className}`}
        priority
      />
      <Image
        src="/brand/logo-dark.png"
        alt="Agent Bazar"
        width={width}
        height={height}
        className={`hidden h-9 w-auto dark:block ${className}`}
        priority
      />
    </>
  );
}
