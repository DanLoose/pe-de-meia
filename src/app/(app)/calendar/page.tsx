import { redirect } from "next/navigation";

interface CalendarPageProps {
  searchParams: Promise<{ year?: string; month?: string }>;
}

export default async function CalendarRedirect({
  searchParams,
}: CalendarPageProps) {
  const params = await searchParams;
  const now = new Date();
  const year = params.year ?? String(now.getFullYear());
  const month = params.month ?? String(now.getMonth() + 1);
  const qs = new URLSearchParams({ year, month });
  redirect(`/mapa-financeiro?${qs.toString()}`);
}
