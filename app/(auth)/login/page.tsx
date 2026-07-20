import Link from "next/link";
import { Card } from "@/components/ui";
import { LoginModal } from "@/components/auth/login-modal";

export default function LoginPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-220px)] max-w-3xl place-items-center px-4 py-12">
      <Card className="p-8 text-center">
        <h1 className="font-serif text-4xl font-bold text-burgundy-dark">Sign in</h1>
        <p className="mt-3 text-mauve-dark">Use the secure login modal to access your dashboard.</p>
        <Link href="/?login=1" className="mt-6 inline-flex rounded-full bg-burgundy px-6 py-3 text-sm font-bold text-cream">
          Open sign in
        </Link>
      </Card>
      <LoginModal />
    </section>
  );
}
