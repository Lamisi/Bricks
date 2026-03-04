import { Logo } from "@/components/logo";
import { Link } from "@/lib/navigation";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[var(--background)] px-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="flex justify-center">
          <Link href="/" aria-label="Back to homepage">
            <Logo size="md" showWordmark />
          </Link>
        </div>
        {children}
      </div>
    </div>
  );
}
