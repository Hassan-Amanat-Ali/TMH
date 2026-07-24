import { Card } from "@/components/ui";
import { LoginModal } from "@/components/auth/login-modal";

export default function LoginPage() {
  return (
    <section className="mx-auto grid min-h-[calc(100vh-220px)] max-w-3xl place-items-center px-4 py-12">
      <Card className="w-full max-w-lg p-8">
        <h1 className="font-serif text-4xl font-bold text-burgundy-dark">Sign in</h1>
        <p className="mt-3 text-mauve-dark">Use your member or admin credentials to access Thai My Heart.</p>
        <div className="mt-6">
          <LoginModal standalone />
        </div>
      </Card>
    </section>
  );
}
