import Image from "next/image";

type ForHireStampProps = {
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE_CLASS: Record<NonNullable<ForHireStampProps["size"]>, string> = {
  sm: "h-10 w-10",
  md: "h-14 w-14",
  lg: "h-20 w-20",
};

export function ForHireStamp({ size = "md", className = "" }: ForHireStampProps) {
  return (
    <Image
      src="/agents/for-hire-stamp.png"
      alt="For hire"
      width={200}
      height={200}
      className={`pointer-events-none object-contain drop-shadow-md ${SIZE_CLASS[size]} ${className}`}
      aria-hidden
    />
  );
}
