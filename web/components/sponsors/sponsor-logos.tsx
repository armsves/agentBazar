import Image from "next/image";
import Link from "next/link";

import DynamicLogo from "@/components/dynamic/logo";

const sponsors = [
  {
    name: "Dynamic",
    href: "https://www.dynamic.xyz",
    render: () => (
      <DynamicLogo
        width={80}
        height={16}
        className="text-[#141839] dark:text-white"
      />
    ),
  },
  {
    name: "ENS",
    href: "https://ens.domains",
    render: () => (
      <>
        <Image
          src="/sponsors/ens-dark.svg"
          alt="ENS"
          width={72}
          height={22}
          className="h-[18px] w-auto dark:hidden"
        />
        <Image
          src="/sponsors/ens-white.svg"
          alt="ENS"
          width={58}
          height={18}
          className="hidden h-[18px] w-auto dark:block"
        />
      </>
    ),
  },
  {
    name: "LI.FI",
    href: "https://li.fi",
    render: () => (
      <Image
        src="/sponsors/lifi.png"
        alt="LI.FI"
        width={72}
        height={22}
        className="h-[18px] w-auto invert dark:invert-0"
      />
    ),
  },
] as const;

export default function SponsorLogos() {
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <span className="font-medium text-muted-foreground">Sponsors</span>
      <ul className="flex flex-wrap items-center gap-5">
        {sponsors.map((sponsor) => (
          <li key={sponsor.name}>
            <Link
              href={sponsor.href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center opacity-80 transition-opacity hover:opacity-100"
              aria-label={sponsor.name}
            >
              {sponsor.render()}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
