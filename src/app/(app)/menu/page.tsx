import Link from "next/link";
import {
  ChevronRight,
  LogOut,
  Mail,
  Shield,
  User,
  Wallet,
} from "lucide-react";
import { logoutAction } from "@/app/actions/auth";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getUserSettings } from "@/lib/services/user-settings";
import { cn } from "@/lib/utils";
import { redirect } from "next/navigation";

function subscriptionLabel(status: string) {
  switch (status) {
    case "ACTIVE":
      return copy.menu.subscriptionActive;
    case "CANCELLED":
      return copy.menu.subscriptionCancelled;
    case "EXPIRED":
      return copy.menu.subscriptionExpired;
    default:
      return copy.menu.subscriptionTrial;
  }
}

function MenuLink({
  href,
  label,
  description,
  icon: Icon,
}: {
  href: string;
  label: string;
  description?: string;
  icon: typeof User;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center justify-between gap-3 rounded-2xl border border-border/60",
        "bg-background/70 px-4 py-3.5 transition-colors hover:bg-muted/40",
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-medium tracking-tight">
            {label}
          </span>
          {description ? (
            <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
              {description}
            </span>
          ) : null}
        </span>
      </span>
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </Link>
  );
}

export default async function MenuPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const settings = await getUserSettings(session.user.id);

  return (
    <div className="space-y-8">
      <PageHeader title={copy.menu.title} description={copy.menu.subtitle} />

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {copy.menu.sectionAccount}
        </h2>
        <div
          className={cn(
            "rounded-[1.5rem] border border-border/50",
            "bg-gradient-to-br from-primary/[0.06] via-background to-background",
            "px-4 py-4 shadow-sm",
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold tracking-tight">
                {settings.name ?? settings.email}
              </p>
              <p className="mt-0.5 truncate text-sm text-muted-foreground">
                {settings.email}
              </p>
            </div>
            <Badge variant="secondary" className="shrink-0">
              {subscriptionLabel(settings.subscriptionStatus)}
            </Badge>
          </div>
        </div>
        <MenuLink
          href="/menu/perfil"
          label={copy.menu.profile}
          description={copy.menu.profileDescription}
          icon={User}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {copy.menu.sectionCash}
        </h2>
        <MenuLink
          href="/menu/configuracoes"
          label={copy.menu.settings}
          description={copy.menu.settingsDescription}
          icon={Wallet}
        />
      </section>

      <section className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          {copy.menu.sectionHelp}
        </h2>
        <div className="space-y-1 rounded-2xl border border-border/50 bg-background/60 px-2 py-2">
          <a
            href={`mailto:${copy.menu.feedbackEmail}?subject=Sugestão Pé-de-meia`}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-primary transition-colors hover:bg-muted/40"
          >
            <Mail className="size-4 shrink-0" />
            {copy.menu.feedback}
          </a>
          <Link
            href="/termos"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <Shield className="size-4 shrink-0" />
            {copy.menu.terms}
          </Link>
          <Link
            href="/privacidade"
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
          >
            <Shield className="size-4 shrink-0" />
            {copy.menu.privacy}
          </Link>
        </div>
      </section>

      <form action={logoutAction}>
        <Button
          type="submit"
          variant="outline"
          className="w-full rounded-2xl"
          data-testid="menu-logout-button"
        >
          <LogOut className="size-4" />
          {copy.menu.signOut}
        </Button>
      </form>
    </div>
  );
}
