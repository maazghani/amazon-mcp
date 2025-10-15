# Supplies Checklist

Quick reference for everything you need before running the Amazon Shopping MCP server locally inside a Codespace.

## Credentials & Configuration
| Item | Why it's needed | How to obtain |
| --- | --- | --- |
| `AWS_ACCESS_KEY_ID` & `AWS_SECRET_ACCESS_KEY` | Sign requests to the Amazon Product Advertising API (PA-API). | Create an AWS account, enable Product Advertising API access, then generate an IAM user with the "Product Advertising API" policy and create access keys. |
| `AMAZON_PARTNER_TAG` | Identifies your Associate account for PA-API requests. | Create or log into your Amazon Associates account, then copy the "Store ID"/partner tag from the Associates console. |
| `AMAZON_REGION` | Tells the client which PA-API endpoint region to target (e.g., `us-east-1`). | Match the region to the marketplace associated with your Associates account; the PA-API documentation lists valid regions. |
| `AMAZON_HOST` | Fully-qualified PA-API host (e.g., `webservices.amazon.com`). | Choose the host that corresponds to your marketplace; defaults to the US marketplace if unspecified. |

## Local Setup Steps
1. Create a `.env` file by copying `.env.example`.
2. Paste each credential into the corresponding environment variable.
3. Keep the `.env` file out of version control (already handled via `.gitignore`).
4. Run the MCP server locally once the implementation lands.

## Helpful Links
- Amazon Product Advertising API onboarding: https://advertising.amazon.com/API
- Amazon Associates Program: https://affiliate-program.amazon.com/
- PA-API Endpoints and Regions: https://webservices.amazon.com/paapi5/documentation/common-request-parameters.html#host-and-region
