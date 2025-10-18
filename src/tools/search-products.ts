import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { AmazonClient } from '../clients/amazon.js';
import type { SearchProductsResult } from '../types.js';

const searchProductsInputShape = {
  keywords: z.string().min(1, 'Provide at least one keyword to search for.'),
  category: z.string().min(1, 'Category cannot be empty.').optional(),
  minPrice: z
    .number({ invalid_type_error: 'minPrice must be a number.' })
    .nonnegative('minPrice cannot be negative.')
    .optional(),
  maxPrice: z
    .number({ invalid_type_error: 'maxPrice must be a number.' })
    .nonnegative('maxPrice cannot be negative.')
    .optional(),
  sortBy: z
    .enum(
      [
        'Featured',
        'Price:LowToHigh',
        'Price:HighToLow',
        'NewestArrivals',
        'AvgCustomerReviews'
      ],
      {
        invalid_type_error: 'sortBy must be one of the supported values.'
      }
    )
    .optional()
} as const;

export const searchProductsInputSchema = z
  .object(searchProductsInputShape)
  .strict()
  .superRefine((value, ctx) => {
    if (
      typeof value.minPrice === 'number' &&
      typeof value.maxPrice === 'number' &&
      value.minPrice > value.maxPrice
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'minPrice cannot be greater than maxPrice.',
        path: ['minPrice']
      });
    }
  });

const searchProductsOutputShape = {
  products: z.array(
    z.object({
      asin: z.string(),
      title: z.string(),
      detailPageUrl: z.string().url().optional(),
      price: z
        .object({
          display: z.string(),
          amount: z.number().optional(),
          currency: z.string().optional()
        })
        .optional(),
      rating: z.number().min(0).max(5).optional(),
      totalReviews: z.number().int().nonnegative().optional(),
      imageUrl: z.string().url().optional()
    })
  ),
  requestId: z.string().optional()
} as const;

export const searchProductsOutputSchema = z.object(searchProductsOutputShape);

export type SearchProductsInput = z.infer<typeof searchProductsInputSchema>;

function formatProductResults(result: SearchProductsResult, query: string): string {
  if (!result.products.length) {
    return `No products found for "${query}".`;
  }

  const formattedProducts = result.products.map((product, index) => {
    const lines = [`${index + 1}. ${product.title} (ASIN: ${product.asin})`];

    if (product.price?.display) {
      lines.push(`   Price: ${product.price.display}`);
    }

    if (typeof product.rating === 'number') {
      const reviewsText =
        typeof product.totalReviews === 'number'
          ? ` from ${product.totalReviews} review${product.totalReviews === 1 ? '' : 's'}`
          : '';
      lines.push(`   Rating: ${product.rating.toFixed(1)}${reviewsText}`);
    }

    if (product.detailPageUrl) {
      lines.push(`   URL: ${product.detailPageUrl}`);
    }

    if (product.imageUrl) {
      lines.push(`   Image: ${product.imageUrl}`);
    }

    return lines.join('\n');
  });

  return formattedProducts.join('\n\n');
}

export function registerSearchProductsTool(
  server: McpServer,
  client: AmazonClient
): void {
  server.registerTool(
    'search_products',
    {
      title: 'Amazon Product Search',
      description:
        'Search Amazon for products using keywords with optional category and price filters.',
      inputSchema: searchProductsInputShape,
      outputSchema: searchProductsOutputShape
    },
    async (args) => {
      const input = searchProductsInputSchema.parse(args);
      const result = await client.searchProducts(input);

      return {
        content: [
          {
            type: 'text',
            text: formatProductResults(result, input.keywords)
          }
        ],
        structuredContent: result as unknown as Record<string, unknown>
      };
    }
  );
}
