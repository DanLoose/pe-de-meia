export default function AppLayout({ children }: LayoutProps<"/">) {
  return <div className="min-h-full flex-1 bg-background">{children}</div>;
}
