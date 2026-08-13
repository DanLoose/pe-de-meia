import { redirect } from "next/navigation";

interface SaldosPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

/** Caixa/Saldos leaves the journey — heatmap lives on the mapa cells. */
export default async function SaldosPage({ searchParams }: SaldosPageProps) {
  const params = await searchParams;
  const qs = new URLSearchParams();
  if (params.year) qs.set("year", params.year);
  if (params.month) qs.set("month", params.month);
  const query = qs.toString();
  redirect(query ? `/mapa-financeiro?${query}` : "/mapa-financeiro");
}
