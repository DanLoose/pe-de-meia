import { PageHeader } from "@/components/layout/PageHeader";

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 py-8">
      <PageHeader
        title="Termos de uso"
        description="Documento em elaboração. Entre em contato para dúvidas."
      />
      <p className="text-sm text-muted-foreground">
        O Pé-de-meia é um aplicativo de finanças pessoais. Ao usar o serviço, você
        concorda em utilizar os dados inseridos apenas para fins pessoais.
      </p>
    </div>
  );
}
