export type Category = {
  id: string;
  name: string;
  slug: string;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  price: number;
  previousPrice?: number;
  stock?: number;
  shortDescription: string;
  description: string;
  categorySlug: string;
  rating: number;
  images: string[];
  createdAt?: string;
  badgeLabel?: string;
  isPromo?: boolean;
  isNew?: boolean;
  variants?: ProductVariant[];
};

export type ProductVariant = {
  id: string;
  productId: string;
  color?: string | null;
  size?: string | null;
  price: number;
  previousPrice?: number;
  stock?: number;
  sku?: string | null;
  image?: string | null;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type BlogPost = {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  image: string;
  publishedAt: string;
  readTime: string;
  content: string[];
  seoDescription: string;
  seoTitle?: string;
  isPublished?: boolean;
  createdAt?: string;
};

export type Review = {
  id: string;
  name: string;
  rating: number;
  text: string;
  role?: string;
  avatarImagePath?: string;
  isActive?: boolean;
  createdAt?: string;
};

export type Offer = {
  id: string;
  title: string;
  shortDescription: string;
  discountLabel: string;
  productId: string;
  discountedPrice: number;
  startAt?: string | null;
  endAt?: string | null;
  imagePath?: string | null;
  bannerText?: string | null;
  isActive: boolean;
  isFeatured?: boolean;
  createdAt?: string;
};

export type CartItem = {
  productId: string;
  quantity: number;
  variantId?: string;
  selectedColor?: string;
  selectedSize?: string;
  selectedPrice?: number;
  selectedPreviousPrice?: number;
  selectedImage?: string;
};
