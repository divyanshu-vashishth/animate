import Link from "next/link";
import { LoginForm } from "@/components/auth/login-form";

export default function SignInPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Link href="/" className="text-sm font-semibold text-primary">
        Stickman Studio
      </Link>
      <LoginForm />
    </main>
  );
}
