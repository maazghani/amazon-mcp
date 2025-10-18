import crypto from 'node:crypto';

import type { AppConfig } from '../config.js';
import type {
  NormalizedPrice,
  ProductSummary,
  SearchProductsInput,
  SearchProductsResult
} from '../types.js';

const SERVICE = 'ProductAdvertisingAPI';
const TARGET =
  'com.amazon.paapi5.v1.ProductAdvertisingAPIv1.SearchItems';
const API_PATH = '/paapi5/searchitems';

interface AmazonSearchItemsRequest {
  Keywords: string;
  PartnerTag: string;
  PartnerType: 'Associates';
  Resources: string[];
  SearchIndex?: string;
  SortBy?: string;
  MinPrice?: number;
  MaxPrice?: number;
}

interface AmazonSearchItemsResponse {
  SearchResult?: {
    Items?: AmazonItem[];
  };
  Errors?: Array<{
    Code?: string;
    Message?: string;
  }>;
  RequestId?: string;
}

interface AmazonItem {
  ASIN: string;
  DetailPageURL?: string;
  ItemInfo?: {
    Title?: {
      DisplayValue?: string;
    };
    ByLineInfo?: {
      Brand?: {
        DisplayValue?: string;
      };
      Manufacturer?: {
        DisplayValue?: string;
      };
    };
  };
  Offers?: {
    Listings?: Array<{
      Price?: {
        DisplayAmount?: string;
        Amount?: number;
        Currency?: string;
      };
    }>;
  };
  CustomerReviews?: {
    StarRating?: number | string;
    Count?: number | string;
    TotalReviewCount?: number | string;
  };
  Images?: {
    Primary?: {
      Small?: { URL?: string };
      Medium?: { URL?: string };
      Large?: { URL?: string };
    };
  };
}

function formatErrorMessages(errors: AmazonSearchItemsResponse['Errors']): string | undefined {
  if (!errors?.length) {
    return undefined;
  }

  return errors
    .map((error) => {
      const code = error.Code ?? 'UnknownCode';
      const message = error.Message ?? 'Unknown error from Amazon Product Advertising API';
      return `${code}: ${message}`;
    })
    .join('; ');
}

function toSubUnits(value: number): number {
  return Math.max(0, Math.round(value * 100));
}

export class AmazonClient {
  constructor(private readonly config: AppConfig) {}

  async searchProducts(input: SearchProductsInput): Promise<SearchProductsResult> {
    const requestBody = this.buildRequestBody(input);
    const bodyJson = JSON.stringify(requestBody);
    const { endpoint, headers } = this.buildSignedRequest(bodyJson);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: bodyJson
    });

    const rawPayload = await response.text();
    let payload: AmazonSearchItemsResponse;

    try {
      payload = rawPayload ? JSON.parse(rawPayload) : {};
    } catch (error) {
      throw new Error(
        `Unable to parse Amazon API response as JSON: ${(error as Error).message}`
      );
    }

    if (!response.ok) {
      const message =
        formatErrorMessages(payload.Errors) ??
        `Amazon API responded with status ${response.status}`;
      throw new Error(message);
    }

    if (payload.Errors?.length) {
      throw new Error(formatErrorMessages(payload.Errors) ?? 'Unknown Amazon API error');
    }

    const items = payload.SearchResult?.Items ?? [];

    const result: SearchProductsResult = {
      products: items.map((item) => this.normalizeItem(item))
    };

    if (payload.RequestId) {
      result.requestId = payload.RequestId;
    }

    return result;
  }

  private buildRequestBody(input: SearchProductsInput): AmazonSearchItemsRequest {
    const request: AmazonSearchItemsRequest = {
      Keywords: input.keywords,
      PartnerTag: this.config.AMAZON_PARTNER_TAG,
      PartnerType: 'Associates',
      Resources: [
        'Images.Primary.Small',
        'Images.Primary.Medium',
        'ItemInfo.Title',
        'ItemInfo.ByLineInfo',
        'Offers.Listings.Price',
        'CustomerReviews.Count',
        'CustomerReviews.StarRating'
      ]
    };

    if (input.category) {
      request.SearchIndex = input.category;
    }

    if (input.sortBy) {
      request.SortBy = input.sortBy;
    }

    if (typeof input.minPrice === 'number') {
      request.MinPrice = toSubUnits(input.minPrice);
    }

    if (typeof input.maxPrice === 'number') {
      request.MaxPrice = toSubUnits(input.maxPrice);
    }

    return request;
  }

  private buildSignedRequest(body: string): {
    endpoint: string;
    headers: Record<string, string>;
  } {
    const host = this.config.AMAZON_HOST;
    const region = this.config.AMAZON_REGION;
    const accessKey = this.config.AWS_ACCESS_KEY_ID;
    const secretKey = this.config.AWS_SECRET_ACCESS_KEY;

    const endpoint = `https://${host}${API_PATH}`;
    const amzDate = this.createAmzDate(new Date());
    const dateStamp = amzDate.slice(0, 8);

    const canonicalHeadersList: Array<[string, string]> = [
      ['content-encoding', 'amz-1.0'],
      ['content-type', 'application/json; charset=UTF-8'],
      ['host', host],
      ['x-amz-date', amzDate],
      ['x-amz-target', TARGET]
    ];

    const canonicalHeaders = canonicalHeadersList
      .map(([key, value]) => `${key}:${value}\n`)
      .join('');
    const signedHeaders = canonicalHeadersList.map(([key]) => key).join(';');
    const payloadHash = this.sha256(body);

    const canonicalRequest = [
      'POST',
      API_PATH,
      '',
      canonicalHeaders,
      signedHeaders,
      payloadHash
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/${SERVICE}/aws4_request`;

    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      this.sha256(canonicalRequest)
    ].join('\n');

    const signingKey = this.deriveSigningKey(secretKey, dateStamp, region);
    const signature = crypto
      .createHmac('sha256', signingKey)
      .update(stringToSign)
      .digest('hex');

    const authorizationHeader =
      `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, ` +
      `SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      endpoint,
      headers: {
        'Content-Encoding': 'amz-1.0',
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Amz-Date': amzDate,
        'X-Amz-Target': TARGET,
        Authorization: authorizationHeader,
        Accept: 'application/json'
      }
    };
  }

  private deriveSigningKey(
    secretKey: string,
    dateStamp: string,
    region: string
  ): Buffer {
    const kDate = crypto
      .createHmac('sha256', `AWS4${secretKey}`)
      .update(dateStamp)
      .digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(region).digest();
    const kService = crypto
      .createHmac('sha256', kRegion)
      .update(SERVICE)
      .digest();
    return crypto
      .createHmac('sha256', kService)
      .update('aws4_request')
      .digest();
  }

  private createAmzDate(date: Date): string {
    return date.toISOString().replace(/[:-]/g, '').replace(/\.\d{3}Z$/, 'Z');
  }

  private sha256(value: string): string {
    return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private normalizeItem(item: AmazonItem): ProductSummary {
    const listing = item.Offers?.Listings?.[0];
    const price = this.normalizePrice(listing?.Price);

    const rating = this.parseNumber(item.CustomerReviews?.StarRating);
    const reviewCount = this.parseInteger(
      item.CustomerReviews?.TotalReviewCount ?? item.CustomerReviews?.Count
    );

    const summary: ProductSummary = {
      asin: item.ASIN,
      title: item.ItemInfo?.Title?.DisplayValue ?? item.ASIN
    };

    if (item.DetailPageURL) {
      summary.detailPageUrl = item.DetailPageURL;
    }

    if (price) {
      summary.price = price;
    }

    if (typeof rating === 'number') {
      summary.rating = rating;
    }

    if (typeof reviewCount === 'number') {
      summary.totalReviews = reviewCount;
    }

    const imageUrl =
      item.Images?.Primary?.Medium?.URL ??
      item.Images?.Primary?.Small?.URL ??
      item.Images?.Primary?.Large?.URL;

    if (imageUrl) {
      summary.imageUrl = imageUrl;
    }

    return summary;
  }

  private normalizePrice(price?: {
    DisplayAmount?: string;
    Amount?: number;
    Currency?: string;
  }): NormalizedPrice | undefined {
    if (!price?.DisplayAmount) {
      return undefined;
    }

    const normalized: NormalizedPrice = {
      display: price.DisplayAmount
    };

    if (typeof price.Amount === 'number' && Number.isFinite(price.Amount)) {
      normalized.amount = price.Amount;
    }

    if (price.Currency) {
      normalized.currency = price.Currency;
    }

    return normalized;
  }

  private parseNumber(value: unknown): number | undefined {
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const parsed = Number(value);
      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }

    return undefined;
  }

  private parseInteger(value: unknown): number | undefined {
    const parsed = this.parseNumber(value);
    if (parsed === undefined) {
      return undefined;
    }

    const rounded = Math.round(parsed);
    return Number.isFinite(rounded) ? rounded : undefined;
  }
}
