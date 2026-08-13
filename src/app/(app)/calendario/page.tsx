import { redirect } from "next/navigation";

interface CalendarioPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

/** Legacy calendar route — mapa financeiro is the home calendar. */
export default async function CalendarioPage({
  searchParams,
}: CalendarioPageProps) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ?? String(now.getFullYear());
  const month = params.month ?? String(now.getMonth() + 1);
  const qs = new URLSearchParams({ year, month });
  redirect(`/mapa-financeiro?${qs.toString()}`);
}
