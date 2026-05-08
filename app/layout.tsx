import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terra Segura - Inbox",
  description: "Inbox de atención al cliente por WhatsApp",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-wa-darker text-white antialiased">{children}</body>
    </html>
  );
}
