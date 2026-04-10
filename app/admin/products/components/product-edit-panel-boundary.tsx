"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type ProductEditPanelBoundaryProps = {
  productId: string;
  productSlug: string;
  children: ReactNode;
};

type ProductEditPanelBoundaryState = {
  hasError: boolean;
};

export class ProductEditPanelBoundary extends Component<
  ProductEditPanelBoundaryProps,
  ProductEditPanelBoundaryState
> {
  state: ProductEditPanelBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError(): ProductEditPanelBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[admin-products] Product edit panel crashed.", {
      productId: this.props.productId,
      productSlug: this.props.productSlug,
      error,
      componentStack: errorInfo.componentStack,
    });
  }

  componentDidUpdate(prevProps: ProductEditPanelBoundaryProps) {
    if (prevProps.productId !== this.props.productId && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
          Ce produit contient des donnees partielles ou invalides. Modifiez les champs necessaires,
          puis reenregistrez pour corriger la fiche.
        </div>
      );
    }

    return this.props.children;
  }
}
