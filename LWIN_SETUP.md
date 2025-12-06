# LWIN Database Integration Setup

This document explains how to set up and use the LWIN (Liv-ex Wine Identification Number) database integration.

## Overview

LWIN is a comprehensive wine database with over 125,000 wines. The integration allows your application to search and retrieve wine data from the LWIN database when API credentials are configured.

## Prerequisites

1. **LWIN API Access**: You need to obtain API credentials from Liv-ex
   - Contact Liv-ex to request API access
   - You'll receive a `CLIENT_KEY` and `CLIENT_SECRET`
   - Visit: https://www.liv-ex.com/ for more information

## Setup Instructions

### 1. Add Environment Variables

Add the following to your `.env.local` file:

```bash
# LWIN API Configuration
LWIN_CLIENT_KEY=your_client_key_here
LWIN_CLIENT_SECRET=your_client_secret_here
```

### 2. Restart Development Server

After adding the environment variables, restart your Next.js development server:

```bash
npm run dev
```

## How It Works

1. **Automatic Detection**: The system automatically detects if LWIN credentials are configured
2. **Fallback Behavior**: If LWIN is not configured, the system falls back to the sample dataset
3. **Priority**: LWIN results are prioritized over other sources when available
4. **Caching**: All external wine results (including LWIN) are automatically cached in your local database

## Usage

The LWIN integration is automatically used when:
- A user searches for wines in the "Browse Wines" section
- No local results are found for a search query
- The system queries external wine sources

## API Endpoint

The LWIN API endpoint used is:
- Base URL: `https://api.liv-ex.com`
- Endpoint: `/lwin/search`
- Method: POST
- Authentication: Basic Auth (using CLIENT_KEY and CLIENT_SECRET)

## Data Mapping

LWIN wine data is automatically mapped to your application's wine schema:
- **Name**: Wine name from LWIN
- **Vineyard**: Producer from LWIN
- **Region**: Sub-region or region from LWIN
- **Country**: Country from LWIN
- **Varietal**: Mapped from LWIN color/type fields
- **Vintage**: Vintage year from LWIN
- **Description**: Classification and size information

## Troubleshooting

### LWIN Not Working

1. **Check Credentials**: Verify your `LWIN_CLIENT_KEY` and `LWIN_CLIENT_SECRET` are set correctly
2. **Check Logs**: Look for error messages in your server console
3. **API Status**: Verify your API credentials are active with Liv-ex
4. **Network**: Ensure your server can reach `https://api.liv-ex.com`

### Common Issues

- **"LWIN API not configured"**: Add credentials to `.env.local` and restart server
- **"LWIN API error: 401"**: Invalid credentials - check your CLIENT_KEY and CLIENT_SECRET
- **"LWIN API error: 404"**: API endpoint may have changed - check Liv-ex documentation

## Notes

- The LWIN API implementation is based on Liv-ex API documentation
- Actual endpoint URLs and request formats may vary - consult the latest Liv-ex API documentation
- Rate limiting may apply - check with Liv-ex for API usage limits
- The integration gracefully handles API failures and falls back to other data sources

## Support

For LWIN API issues:
- Contact Liv-ex support: https://www.liv-ex.com/
- Review LWIN API documentation provided by Liv-ex

For integration issues:
- Check server logs for detailed error messages
- Verify environment variables are loaded correctly
- Ensure the development server has been restarted after adding credentials








