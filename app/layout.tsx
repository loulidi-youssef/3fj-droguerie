import type { Metadata } from "next";
import "./globals.css";
import { TopBar } from "@/components/top-bar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/components/cart-provider";
import { ToastProvider } from "@/components/toast-provider";
import { getSiteUrl } from "@/lib/site-url";

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: "3FJ Droguerie | Materiaux de construction a Fes",
    template: "%s | 3FJ Droguerie",
  },
  description:
    "3FJ Droguerie a Fes: vente en gros et detail de materiaux de construction, outillage, peinture et quincaillerie.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>
        <CartProvider>
          <ToastProvider>
            <TopBar />
            <Header />
            <main>{children}</main>
            <Footer />
          </ToastProvider>
        </CartProvider>
      </body>
    </html>
  );
}
