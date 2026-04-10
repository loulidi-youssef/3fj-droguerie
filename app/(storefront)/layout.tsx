import { TopBar } from "@/components/top-bar";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { CartProvider } from "@/components/cart-provider";
import { FavoritesProvider } from "@/components/favorites-provider";
import { ToastProvider } from "@/components/toast-provider";

export default function StorefrontLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
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
  );
}
