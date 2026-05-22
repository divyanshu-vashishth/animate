import type { Metadata } from "next";
import { Manrope } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { cn } from "@/lib/utils";
import "./globals.css";

const manrope = Manrope({subsets:['latin'],variable:'--font-sans'});

export const metadata: Metadata = {
  title: "Stickman Studio",
  description: "AI-powered stickman animation editor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("dark font-sans", "font-sans", manrope.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster />
      </body>
    </html>
  );
}
