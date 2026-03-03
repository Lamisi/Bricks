import Image from "next/image";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showWordmark?: boolean;
  className?: string;
}

const sizes = {
  sm: { mark: 24, text: "text-lg" },
  md: { mark: 32, text: "text-2xl" },
  lg: { mark: 48, text: "text-4xl" },
};

export function Logo({ size = "md", showWordmark = true, className }: LogoProps) {
  const { mark, text } = sizes[size];

  return (
    <div className={`flex items-center gap-2.5 ${className ?? ""}`}>
      <Image
        src="/logo.svg"
        alt="Bricks"
        width={mark}
        height={Math.round(mark * 0.75)}
        priority
      />
      {showWordmark && (
        <span
          className={`font-bold tracking-tight text-brand-navy ${text}`}
          style={{ fontFamily: "var(--font-geist-sans)" }}
        >
          Bricks
        </span>
      )}
    </div>
  );
}
