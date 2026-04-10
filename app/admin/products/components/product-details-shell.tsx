"use client";

import { useRef } from "react";
import type { ReactNode } from "react";
import { devLog } from "@/lib/dev-log";

type ProductClickSnapshot = {
  id: string;
  slug: string;
  name: string;
  categorySlug: string;
  stock: number;
  price: number;
  variantsCount: number;
  imagesCount: number;
  bulkTiersCount: number;
};

type ProductDetailsShellProps = {
  className?: string;
  productSnapshot: ProductClickSnapshot;
  children: ReactNode;
};

export const ProductDetailsShell = ({
  className,
  productSnapshot,
  children,
}: ProductDetailsShellProps) => {
  const wasOpenRef = useRef(false);

  return (
    <details
      className={className}
      onToggle={(event) => {
        const isOpen = event.currentTarget.open;
        if (isOpen && !wasOpenRef.current) {
          devLog("[admin-products] Product row opened.", productSnapshot);
        }
        wasOpenRef.current = isOpen;
      }}
    >
      {children}
    </details>
  );
};
