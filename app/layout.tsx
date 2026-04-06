import type { Metadata, Viewport } from "next";
import "./globals.css";
import { TopBar } from "@/components/top-bar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/components/cart-provider";
import { FavoritesProvider } from "@/components/favorites-provider";
import { ToastProvider } from "@/components/toast-provider";
import { businessInfo } from "@/data/business";
import { resolveSocialImageUrl } from "@/lib/seo";
import { getSiteUrl } from "@/lib/site-url";

const defaultTitle = "3FJ Droguerie | Materiaux de construction a Fes";
const defaultDescription =
  "3FJ Droguerie a Fes: vente en gros et detail de materiaux de construction, outillage, peinture et quincaillerie.";
const defaultSocialImage = resolveSocialImageUrl();

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: defaultTitle,
    template: "%s | 3FJ Droguerie",
  },
  description: defaultDescription,
  openGraph: {
    type: "website",
    locale: "fr_MA",
    url: getSiteUrl(),
    siteName: businessInfo.brandName,
    title: defaultTitle,
    description: defaultDescription,
    images: [
      {
        url: defaultSocialImage,
        alt: businessInfo.brandName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: defaultTitle,
    description: defaultDescription,
    images: [defaultSocialImage],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
 return (
  <html lang="fr">
    <head>
      <meta name="google-site-verification" content="KJZgpm6bgI4ycEFeLD_6S67eYMcmQxTSVFLfXqP5ezM" />
    </head>
    <body>
      <CartProvider>
        <FavoritesProvider>
          <ToastProvider>
            <TopBar />
            <Header />
            <main>{children}</main>
            <Footer />
          </ToastProvider>
        </FavoritesProvider>
      </CartProvider>
    </body>
  </html>
);
}
