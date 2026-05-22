import Link from "next/link";
import { SignUpForm } from "@/components/auth/sign-up-form";

export default function SignUpPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 p-8">
      <Link href="/" className="text-sm font-semibold text-primary">
        Stickman Studio
      </Link>
      <SignUpForm />
    </main>
  );
}
