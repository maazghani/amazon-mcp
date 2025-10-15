# Amazon Shopping MCP Server MVP Plan

## Goal
Ship the leanest Model Context Protocol (MCP) server that can execute a single `search_products` tool against the Amazon Product
Advertising API with a couple of optional filters. The target environment is a GitHub Codespace; anything beyond the local CLI
loop (e.g., hosting, automation, observability) is explicitly out of scope for this MVP.

## Guiding Constraints
1. **Single capability:** Only expose one MCP tool, `search_products`.
2. **Local-first:** Optimize for manual testing from a Codespace shell; assume no cloud infrastructure.
3. **TypeScript minimalism:** Keep dependencies lean, emphasize readability, and rely on native Node.js facilities unless absolutely necessary.
4. **Observable outputs later:** Defer production-hardening topics (structured logs, metrics, autoscaling, alerting) to future iterations.

## Technology Choices
| Concern | Decision | Notes |
| --- | --- | --- |
| Language & Runtime | **TypeScript on Node.js 20** | Balanced DX and async HTTP support. |
| MCP SDK | `@modelcontextprotocol/server` | Provides request routing boilerplate; only import the pieces required to register a tool. |
| HTTP Client | Native `fetch` (Node 20) or `node-fetch` polyfill | Use built-in `fetch` unless we hit incompatibilities. |
| Validation | `zod` | Lightweight schema checks for tool inputs and trimmed Amazon responses. |
| Environment Management | `.env` + `dotenv` | Load API credentials locally. |
| Testing (later) | `vitest` (optional) | Only add once search flow stabilizes. |

## Minimal Architecture
```
┌───────────────────────┐        ┌────────────────────────────────┐
│   MCP Client (local)  │ ─────▶ │  Amazon Shopping MCP Server    │
└───────────────────────┘ JSON   │  • load env + init MCP server  │
                                │  • register search tool         │
                                │  • call Amazon SearchItems API  │
                                │  • normalize + return results   │
                                └────────────────────────────────┘
                                              │
                                              ▼
                               ┌────────────────────────────────┐
                               │ Amazon Product Advertising API │
                               └────────────────────────────────┘
```

### Core Pieces
1. **Entry Point (`src/index.ts`)** – boots the MCP server, loads configuration, and registers the tool.
2. **Search Tool (`src/tools/search-products.ts`)** – validates filters (keywords plus category/price bounds), invokes the Amazon client, and shapes the response for MCP.
3. **Amazon Client (`src/clients/amazon.ts`)** – signs and sends SearchItems requests, returning a trimmed product list.
4. **Types (`src/types.ts`)** – shared TypeScript types for inputs/outputs to avoid drift.

We intentionally skip caching, retries, and background jobs. If we encounter rate limits during local testing, we can add exponential backoff within the Amazon client later.

## File Structure (MVP)
```
amazon-mcp/
├── src/
│   ├── index.ts                # start MCP server, register tool
│   ├── config.ts               # env loading + validation helpers
│   ├── clients/
│   │   └── amazon.ts           # minimal SearchItems helper
│   ├── tools/
│   │   └── search-products.ts  # the only MCP tool for now
│   └── types.ts                # shared types (input, product summary)
├── package.json
├── tsconfig.json
├── .env.example                # document required credentials
├── supplies.md                 # quickstart credential checklist
└── ARCHITECTURE_PLAN.md
```

## Request Lifecycle
1. MCP client calls `search_products` with keywords and optional filters (category, price range, sort).
2. Tool validates the payload via Zod.
3. Tool uses the Amazon client to build a signed `SearchItems` request with filters applied.
4. Amazon API response is trimmed to the few attributes the client needs (title, ASIN, price, rating, thumbnail URL).
5. Tool returns normalized results to the MCP client.

## Configuration & Secrets
- Required env vars: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AMAZON_PARTNER_TAG`, `AMAZON_REGION`, and `AMAZON_HOST` (default `webservices.amazon.com`). If you use a different marketplace endpoint, adjust the host accordingly.
- Store them in `.env` locally; never commit.
- `config.ts` should validate presence at startup and exit with a helpful error message if any are missing.

## Testing & Validation Plan
- Start with manual testing using the MCP client from the Codespace terminal.
- Add minimal unit tests for the Zod schemas and the Amazon client’s request builder once the flow stabilizes.
- Mock HTTP responses instead of hitting the live API in automated tests.

## Future Enhancements (Out of Scope Now)
- Additional MCP tools (`get_product_details`, offers, etc.).
- Retry/backoff policies and response caching.
- Structured logging and metrics.
- CI pipelines, dockerization, or deployment automation.
- Robust error taxonomy and localization.
