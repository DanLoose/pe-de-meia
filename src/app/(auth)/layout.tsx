import { BrandLogo } from "@/components/layout/BrandLogo";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-8 bg-gradient-to-b from-muted/40 to-background p-6">
      <BrandLogo size="lg" />
      {children}
    </div>
  );
}
