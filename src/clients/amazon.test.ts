import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import type { AppConfig } from '../config.js';
import { AmazonClient } from './amazon.js';

describe('AmazonClient', () => {
  const baseConfig: AppConfig = {
    AWS_ACCESS_KEY_ID: 'AKIATESTKEY12345',
    AWS_SECRET_ACCESS_KEY: 'test-secret-key',
    AMAZON_PARTNER_TAG: 'test-partner',
    AMAZON_REGION: 'us-east-1',
    AMAZON_HOST: 'webservices.amazon.com'
  };

  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-02T03:04:05Z'));
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('sends a signed request and normalizes the response payload', async () => {
    const responseBody = {
      SearchResult: {
        Items: [
          {
            ASIN: 'B0TEST123',
            DetailPageURL: 'https://amazon.example/products/B0TEST123',
            ItemInfo: {
              Title: { DisplayValue: 'Noise Cancelling Headphones' },
              ByLineInfo: {
                Brand: { DisplayValue: 'ACME' }
              }
            },
            Offers: {
              Listings: [
                {
                  Price: {
                    DisplayAmount: '$199.99',
                    Amount: 199.99,
                    Currency: 'USD'
                  }
                }
              ]
            },
            CustomerReviews: {
              StarRating: '4.6',
              TotalReviewCount: '321'
            },
            Images: {
              Primary: {
                Medium: { URL: 'https://images.example/medium.jpg' },
                Small: { URL: 'https://images.example/small.jpg' }
              }
            }
          }
        ]
      },
      RequestId: 'REQUEST-123'
    };

    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue(JSON.stringify(responseBody))
      } as unknown as Response);

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new AmazonClient(baseConfig);

    const result = await client.searchProducts({
      keywords: 'headphones',
      category: 'Electronics',
      minPrice: 12.34,
      maxPrice: 199.99,
      sortBy: 'Featured'
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);

    const [endpoint, options] = fetchMock.mock.calls[0];
    expect(endpoint).toBe('https://webservices.amazon.com/paapi5/searchitems');
    expect(options?.method).toBe('POST');

    const headers = options?.headers as Record<string, string>;
    expect(headers).toBeDefined();
    expect(headers).toMatchObject({
      'Content-Encoding': 'amz-1.0',
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Amz-Target': 'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems',
      Accept: 'application/json'
    });
    expect(headers.Authorization).toMatch(
      /^AWS4-HMAC-SHA256 Credential=AKIATESTKEY12345\/20240102\/us-east-1\/ProductAdvertisingAPI\/aws4_request, SignedHeaders=content-encoding;content-type;host;x-amz-date;x-amz-target, Signature=[a-f0-9]{64}$/
    );
    expect(headers['X-Amz-Date']).toBe('20240102T030405Z');

    const body = JSON.parse(options?.body as string);
    expect(body).toEqual({
      Keywords: 'headphones',
      PartnerTag: 'test-partner',
      PartnerType: 'Associates',
      Resources: [
        'Images.Primary.Small',
        'Images.Primary.Medium',
        'ItemInfo.Title',
        'ItemInfo.ByLineInfo',
        'Offers.Listings.Price',
        'CustomerReviews.Count',
        'CustomerReviews.StarRating'
      ],
      SearchIndex: 'Electronics',
      SortBy: 'Featured',
      MinPrice: 1234,
      MaxPrice: 19999
    });

    expect(result).toEqual({
      products: [
        {
          asin: 'B0TEST123',
          title: 'Noise Cancelling Headphones',
          detailPageUrl: 'https://amazon.example/products/B0TEST123',
          price: {
            display: '$199.99',
            amount: 199.99,
            currency: 'USD'
          },
          rating: 4.6,
          totalReviews: 321,
          imageUrl: 'https://images.example/medium.jpg'
        }
      ],
      requestId: 'REQUEST-123'
    });
  });

  it('throws a descriptive error when Amazon responds with an error payload', async () => {
    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue({
        ok: false,
        status: 403,
        text: vi.fn().mockResolvedValue(
          JSON.stringify({
            Errors: [
              {
                Code: 'AccessDenied',
                Message: 'The security token included in the request is invalid'
              }
            ]
          })
        )
      } as unknown as Response);

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new AmazonClient(baseConfig);

    await expect(
      client.searchProducts({ keywords: 'books' })
    ).rejects.toThrow(
      'AccessDenied: The security token included in the request is invalid'
    );
  });

  it('throws when the Amazon API returns invalid JSON', async () => {
    const fetchMock = vi
      .fn<Parameters<typeof fetch>, ReturnType<typeof fetch>>()
      .mockResolvedValue({
        ok: true,
        status: 200,
        text: vi.fn().mockResolvedValue('not-json')
      } as unknown as Response);

    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const client = new AmazonClient(baseConfig);

    await expect(
      client.searchProducts({ keywords: 'kitchen' })
    ).rejects.toThrow(/Unable to parse Amazon API response as JSON/);
  });
});
