export interface SearchProductsInput {
  keywords: string;
  category?: string | undefined;
  minPrice?: number | undefined;
  maxPrice?: number | undefined;
  sortBy?: string | undefined;
}

export interface NormalizedPrice {
  display: string;
  amount?: number | undefined;
  currency?: string | undefined;
}

export interface ProductSummary {
  asin: string;
  title: string;
  detailPageUrl?: string | undefined;
  price?: NormalizedPrice | undefined;
  rating?: number | undefined;
  totalReviews?: number | undefined;
  imageUrl?: string | undefined;
}

export interface SearchProductsResult {
  products: ProductSummary[];
  requestId?: string | undefined;
}
