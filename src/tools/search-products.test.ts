import { describe, it, expect, vi } from 'vitest';

import { registerSearchProductsTool, searchProductsInputSchema } from './search-products.js';

describe('search-products tool', () => {
  it('validates inputs using Zod schema', () => {
    expect(() =>
      searchProductsInputSchema.parse({
        keywords: 'tablet',
        minPrice: 20,
        maxPrice: 10
      })
    ).toThrowError(/minPrice cannot be greater than maxPrice/);
  });

  it('registers the tool and formats responses for MCP clients', async () => {
    const registerTool = vi.fn();
    const fakeServer = { registerTool } as unknown as import('@modelcontextprotocol/sdk/server/mcp.js').McpServer;

    const normalizedResult = {
      products: [
        {
          asin: 'B012345678',
          title: 'Sample Tablet',
          detailPageUrl: 'https://amazon.example/B012345678',
          price: { display: '$149.99' },
          rating: 4.25,
          totalReviews: 84,
          imageUrl: 'https://images.example/tablet.jpg'
        }
      ],
      requestId: 'REQ-42'
    };

    const client = {
      searchProducts: vi.fn().mockResolvedValue(normalizedResult)
    } as unknown as import('../clients/amazon.js').AmazonClient;

    registerSearchProductsTool(fakeServer, client);

    expect(registerTool).toHaveBeenCalledTimes(1);

    const [, , handler] = registerTool.mock.calls[0];

    const response = await handler({
      keywords: 'tablet',
      minPrice: 50,
      maxPrice: 200,
      sortBy: 'Featured'
    });

    expect(client.searchProducts).toHaveBeenCalledWith({
      keywords: 'tablet',
      minPrice: 50,
      maxPrice: 200,
      sortBy: 'Featured'
    });

    expect(response.structuredContent).toEqual(normalizedResult);
    expect(response.content).toEqual([
      {
        type: 'text',
        text: `1. Sample Tablet (ASIN: B012345678)\n   Price: $149.99\n   Rating: 4.3 from 84 reviews\n   URL: https://amazon.example/B012345678\n   Image: https://images.example/tablet.jpg`
      }
    ]);
  });
});
