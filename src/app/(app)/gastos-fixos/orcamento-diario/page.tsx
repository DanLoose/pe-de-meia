import { redirect } from "next/navigation";

export default function OrcamentoDiarioPage() {
  redirect("/gastos-fixos?tab=variaveis");
}
