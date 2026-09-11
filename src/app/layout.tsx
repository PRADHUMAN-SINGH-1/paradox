import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://paradox.engineer"),
  title: { default: "PARADOX — Useful tools, instantly.", template: "%s | PARADOX" },
  description: "Fast, free browser utilities with no account required.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
