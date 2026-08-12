import Link from "next/link";
import { ChevronRight, CreditCard, Settings, User } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { copy } from "@/lib/copy";
import { getUserSettings } from "@/lib/services/user-settings";
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

const links = [
  { href: "/menu/perfil", label: copy.menu.profile, icon: User },
  {
    href: "/menu/configuracoes",
    label: copy.menu.card,
    description: copy.menu.cardDescription,
    icon: CreditCard,
  },
  { href: "/menu/configuracoes", label: copy.menu.settings, icon: Settings },
];

export default async function MenuPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const settings = await getUserSettings(session.user.id);

  return (
    <div className="space-y-[var(--section-gap)]">
      <PageHeader title={copy.menu.title} description={copy.menu.subtitle} />

      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
          <div>
            <p className="font-medium">{settings.name ?? settings.email}</p>
            <p className="text-sm text-muted-foreground">{settings.email}</p>
          </div>
          <Badge variant="secondary">
            {subscriptionLabel(settings.subscriptionStatus)}
          </Badge>
        </CardContent>
      </Card>

      <div className="space-y-2">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={`${link.href}-${link.label}`}
              href={link.href}
              className="flex items-center justify-between rounded-lg border bg-card p-4 transition-colors hover:bg-muted/50"
            >
              <span className="flex items-center gap-3">
                <Icon className="size-5 text-muted-foreground" />
                <span>
                  <span className="block">{link.label}</span>
                  {"description" in link && link.description ? (
                    <span className="block text-xs text-muted-foreground">
                      {link.description}
                    </span>
                  ) : null}
                </span>
              </span>
              <ChevronRight className="size-4 text-muted-foreground" />
            </Link>
          );
        })}
      </div>

      <div className="space-y-2 text-sm">
        <a
          href={`mailto:${copy.menu.feedbackEmail}?subject=Sugestão Pé-de-meia`}
          className="block text-primary hover:underline"
        >
          {copy.menu.feedback}
        </a>
        <Link href="/termos" className="block text-muted-foreground hover:underline">
          {copy.menu.terms}
        </Link>
        <Link href="/privacidade" className="block text-muted-foreground hover:underline">
          {copy.menu.privacy}
        </Link>
      </div>
    </div>
  );
}
