# Amazon Shopping MCP Server - VS Code Integration Guide

This guide explains how to use the Amazon Shopping MCP server with VS Code and GitHub Copilot.

## Prerequisites

Before you begin, ensure you have:

1. **VS Code** (latest version)
2. **GitHub Copilot** subscription and extension installed
3. **Amazon Product Advertising API credentials:**
   - AWS Access Key ID
   - AWS Secret Access Key
   - Amazon Partner Tag (from Amazon Associates)
   - Amazon Region (e.g., `us-east-1`)
   - Amazon Host (default: `webservices.amazon.com`)

> 📝 **Note:** See [supplies.md](../supplies.md) for detailed instructions on obtaining credentials.

## Setup Methods

You can run this MCP server in three ways:

### Option 1: Using Docker (Recommended)

Pull the pre-built image from GitHub Container Registry:

```bash
docker pull ghcr.io/maazghani/amazon-mcp:latest
```

Or build locally:

```bash
docker build -t amazon-mcp:latest .
```

### Option 2: Local Development with Node.js

Install dependencies and build:

```bash
npm install
npm run build
```

### Option 3: Development Mode (Hot Reload)

For development with automatic TypeScript compilation:

```bash
npm run dev
```

## Configuring VS Code

### Step 1: Configure MCP Settings

1. Open VS Code settings (File → Preferences → Settings or `Cmd/Ctrl + ,`)
2. Search for "MCP" or "Model Context Protocol"
3. Click "Edit in settings.json"

Add the MCP server configuration:

#### For Docker:

```json
{
  "github.copilot.chat.mcp.servers": {
    "amazon-shopping": {
      "command": "docker",
      "args": [
        "run",
        "--rm",
        "-i",
        "--env-file",
        "/absolute/path/to/your/.env",
        "ghcr.io/maazghani/amazon-mcp:latest"
      ]
    }
  }
}
```

#### For Local Node.js:

```json
{
  "github.copilot.chat.mcp.servers": {
    "amazon-shopping": {
      "command": "node",
      "args": [
        "/absolute/path/to/amazon-mcp/dist/index.js"
      ],
      "env": {
        "AWS_ACCESS_KEY_ID": "your-access-key-id",
        "AWS_SECRET_ACCESS_KEY": "your-secret-access-key",
        "AMAZON_PARTNER_TAG": "your-partner-tag",
        "AMAZON_REGION": "us-east-1",
        "AMAZON_HOST": "webservices.amazon.com"
      }
    }
  }
}
```

#### For Development Mode:

```json
{
  "github.copilot.chat.mcp.servers": {
    "amazon-shopping": {
      "command": "npm",
      "args": ["run", "dev"],
      "cwd": "/absolute/path/to/amazon-mcp",
      "env": {
        "AWS_ACCESS_KEY_ID": "your-access-key-id",
        "AWS_SECRET_ACCESS_KEY": "your-secret-access-key",
        "AMAZON_PARTNER_TAG": "your-partner-tag",
        "AMAZON_REGION": "us-east-1",
        "AMAZON_HOST": "webservices.amazon.com"
      }
    }
  }
}
```

### Step 2: Create Environment File (for Docker)

Create a `.env` file with your credentials:

```bash
cp .env.example .env
```

Edit `.env` and fill in your credentials:

```env
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AMAZON_PARTNER_TAG=yourtag-20
AMAZON_REGION=us-east-1
AMAZON_HOST=webservices.amazon.com
```

> ⚠️ **Security Warning:** Never commit your `.env` file to version control!

### Step 3: Reload VS Code

After configuring, reload VS Code:
- Press `Cmd/Ctrl + Shift + P`
- Type "Reload Window"
- Press Enter

## Using the MCP Server

### Available Tool: `search_products`

The server exposes one MCP tool for searching Amazon products.

#### Parameters:

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `keywords` | string | ✅ Yes | Search keywords |
| `category` | string | ❌ No | Product category (e.g., "Electronics", "Books") |
| `minPrice` | number | ❌ No | Minimum price filter (in dollars) |
| `maxPrice` | number | ❌ No | Maximum price filter (in dollars) |
| `sortBy` | string | ❌ No | Sort order: `Featured`, `Price:LowToHigh`, `Price:HighToLow`, `NewestArrivals`, `AvgCustomerReviews` |

### Example Prompts in GitHub Copilot Chat

Open GitHub Copilot Chat (`Cmd/Ctrl + Shift + I`) and try these prompts:

#### Basic Search:
```
Search for wireless headphones on Amazon
```

#### With Price Filter:
```
Find tablets on Amazon between $200 and $500
```

#### With Category and Sorting:
```
Search for laptops in the Electronics category on Amazon, 
sorted by customer reviews, max price $1000
```

#### Detailed Analysis:
```
Find the best rated coffee makers on Amazon under $100 
and compare their features
```

### Example Response

When you search, you'll get structured results like:

```
1. Sony WH-1000XM5 Wireless Headphones (ASIN: B09XYZ123)
   Price: $349.99
   Rating: 4.6 from 1,234 reviews
   URL: https://amazon.com/dp/B09XYZ123
   Image: https://images-na.ssl-images-amazon.com/...

2. Bose QuietComfort 45 (ASIN: B098ABC456)
   Price: $329.00
   Rating: 4.5 from 2,156 reviews
   URL: https://amazon.com/dp/B098ABC456
   Image: https://images-na.ssl-images-amazon.com/...
```

## Troubleshooting

### MCP Server Not Appearing in Copilot

1. Verify your settings.json configuration
2. Check that all paths are absolute
3. Ensure credentials are correct
4. Reload VS Code window
5. Check VS Code Developer Tools (Help → Toggle Developer Tools) for errors

### Docker Issues

**Container won't start:**
```bash
# Check if the container runs manually
docker run --rm -i --env-file .env ghcr.io/maazghani/amazon-mcp:latest
```

**Permission errors:**
```bash
# Ensure .env file is readable
chmod 644 .env
```

### Node.js Issues

**Build errors:**
```bash
# Clean and rebuild
rm -rf dist node_modules
npm install
npm run build
```

**Missing environment variables:**
```bash
# Verify all required vars are set
node -e "require('dotenv').config(); console.log(process.env)"
```

### API Errors

**"AccessDenied" errors:**
- Verify your AWS credentials are correct
- Ensure you have Product Advertising API access enabled
- Check that your Associate account is active

**Rate limiting:**
- Amazon PA-API has rate limits
- Wait a few minutes between large batches of requests
- Consider implementing request throttling

**Invalid region/host:**
- Ensure your region matches your Associate account marketplace
- Common regions: `us-east-1` (US), `eu-west-1` (UK), `us-west-2` (CA)

## Advanced Configuration

### Using Different Amazon Marketplaces

Configure for different regions:

**UK Marketplace:**
```json
{
  "AMAZON_REGION": "eu-west-1",
  "AMAZON_HOST": "webservices.amazon.co.uk",
  "AMAZON_PARTNER_TAG": "your-uk-tag"
}
```

**Canada Marketplace:**
```json
{
  "AMAZON_REGION": "us-west-2",
  "AMAZON_HOST": "webservices.amazon.ca",
  "AMAZON_PARTNER_TAG": "your-ca-tag"
}
```

### Multiple MCP Servers

You can run multiple MCP servers simultaneously:

```json
{
  "github.copilot.chat.mcp.servers": {
    "amazon-us": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "--env-file", "/path/to/.env.us", "amazon-mcp:latest"]
    },
    "amazon-uk": {
      "command": "docker",
      "args": ["run", "--rm", "-i", "--env-file", "/path/to/.env.uk", "amazon-mcp:latest"]
    }
  }
}
```

### Logging and Debugging

Enable debug logging by modifying the Docker command:

```json
{
  "command": "docker",
  "args": [
    "run",
    "--rm",
    "-i",
    "--env-file",
    "/path/to/.env",
    "-e",
    "DEBUG=*",
    "amazon-mcp:latest"
  ]
}
```

## Best Practices

1. **Credential Security:**
   - Use `.env` files with Docker
   - Never commit credentials to git
   - Rotate credentials periodically
   - Use environment-specific `.env` files

2. **Performance:**
   - Be specific with search keywords
   - Use category filters to narrow results
   - Set appropriate price ranges
   - Consider caching frequent searches

3. **Rate Limiting:**
   - Amazon PA-API has usage limits
   - Batch requests when possible
   - Implement exponential backoff for retries

4. **Testing:**
   - Test with simple queries first
   - Verify credentials before production use
   - Monitor API usage in Amazon Associate dashboard

## Resources

- [Amazon Product Advertising API Documentation](https://webservices.amazon.com/paapi5/documentation/)
- [Amazon Associates Program](https://affiliate-program.amazon.com/)
- [GitHub Copilot MCP Documentation](https://code.visualstudio.com/docs/copilot/chat)
- [Model Context Protocol Specification](https://modelcontextprotocol.io/)

## Support

For issues specific to this MCP server:
- Check the [Architecture Plan](./ARCHITECTURE_PLAN.md)
- Review [supplies.md](../supplies.md) for credential setup
- Open an issue on GitHub

For Amazon PA-API issues:
- Contact Amazon Associates support
- Check the PA-API forum

For VS Code/Copilot issues:
- Check VS Code documentation
- Visit GitHub Copilot support
