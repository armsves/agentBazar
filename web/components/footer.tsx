import SponsorLogos from "./sponsors/sponsor-logos";

interface FooterProps {
  bottomLinks?: {
    text: string;
    url: string;
  }[];
}

export default function Footer({
  bottomLinks = [
    {
      text: "GitHub",
      url: "https://github.com/dynamic-labs/examples/tree/main/examples/nextjs-delegated-access",
    },
    {
      text: "Docs",
      url: "https://www.dynamic.xyz/docs/wallets/embedded-wallets/mpc/delegated-access/overview",
    },
    { text: "Dashboard", url: "https://app.dynamic.xyz" },
    { text: "Support", url: "https://www.dynamic.xyz/join-slack" },
  ],
}: FooterProps) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur supports-backdrop-filter:bg-card/60 border-t border-border">
      <div className="container mx-auto px-4 py-3">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 text-xs text-muted-foreground">
          <SponsorLogos />
          <ul className="flex flex-wrap justify-center gap-4">
            {bottomLinks.map((link) => (
              <li key={link.url}>
                <a
                  href={link.url}
                  className="hover:text-foreground transition-colors duration-200"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.text}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
