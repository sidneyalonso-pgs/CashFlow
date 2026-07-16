import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PagSmile Treasury",
  description: "Gestão de caixa, pagamentos, receitas e conciliação",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
