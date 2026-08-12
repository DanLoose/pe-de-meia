import { PageHeader } from "@/components/layout/PageHeader";

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-8">
      <PageHeader
        title="Política de privacidade"
        description="Documento em elaboração. Entre em contato para dúvidas."
      />
      <p className="text-sm text-muted-foreground">
        Seus dados financeiros são armazenados de forma segura e não são
        compartilhados com terceiros sem seu consentimento.
      </p>
    </div>
  );
}
