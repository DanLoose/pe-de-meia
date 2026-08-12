import { GastosFixosTabs } from "@/components/gastos-fixos/GastosFixosTabs";
import { PageHeader } from "@/components/layout/PageHeader";
import { copy } from "@/lib/copy";

export default function GastosFixosLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-[var(--section-gap)]">
      <PageHeader
        title={copy.gastosFixos.title}
        description={copy.gastosFixos.subtitle}
      />
      <GastosFixosTabs />
      {children}
    </div>
  );
}
