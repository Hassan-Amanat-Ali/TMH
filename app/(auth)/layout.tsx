import { MarketingShell } from "@/components/layout/shells";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <MarketingShell>{children}</MarketingShell>;
}
