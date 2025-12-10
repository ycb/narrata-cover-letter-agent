#!/bin/bash
# Test Appify API directly
curl -X POST https://api.cloud.appifyhub.com/v1/scrape/linkedin \
  -H "Authorization: Bearer apify_api_8E3Y9QGtlFmmuDPSPZRxxC2irUJh4h1VaWBA" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "9uYQ9HBku7rHNp3Vp",
    "linkedin_url": "https://www.linkedin.com/in/pspan"
  }' \
  2>&1 | head -100
