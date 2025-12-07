# Live Search Reference (DEPRECATED)

## Deprecation Notice
**Deprecated by December 15, 2025**

Use the new [Agentic Tool Calling API](./03-agentic-tools-overview.md) instead.

## Overview
Chat completion endpoint with live data search capabilities.

## Pricing
$25 per 1,000 sources used ($0.025 per source)

## Enable Search

```python
# Minimal - empty search_parameters enables defaults
response = client.chat.completions.create(
    model="grok-4",
    messages=[...],
    search_parameters={},
)
```

### Search Mode
| Mode | Behavior |
|------|----------|
| `"off"` | Disable search |
| `"auto"` (default) | Model decides |
| `"on"` | Force search |

## xAI SDK

```python
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.search import SearchParameters

client = Client(api_key=os.getenv("XAI_API_KEY"))

chat = client.chat.create(
    model="grok-4",
    search_parameters=SearchParameters(mode="auto"),
)

chat.append(user("World news from this week"))
response = chat.sample()
print(response.content)
print(response.citations)
```

## Citations

```python
search_parameters=SearchParameters(
    mode="auto",
    return_citations=True,  # Default: True
)
```

## Date Range

```python
from datetime import datetime

SearchParameters(
    mode="auto",
    from_date=datetime(2022, 1, 1),
    to_date=datetime(2022, 12, 31),
)
```

## Max Results

```python
SearchParameters(
    mode="auto",
    max_search_results=10,  # Default: 20
)
```

## Data Sources

### Default Sources
`"web"`, `"news"`, `"x"`

### Source Configuration

```python
from xai_sdk.search import web_source, x_source, news_source, rss_source

SearchParameters(
    mode="auto",
    sources=[
        web_source(country="US", allowed_websites=["x.ai"]),
        x_source(included_x_handles=["xai"]),
        news_source(excluded_websites=["bbc.co.uk"]),
        rss_source(links=["https://status.x.ai/feed.xml"]),
    ],
)
```

### Source Parameters

| Source | Parameters |
|--------|-----------|
| `web` | `country`, `excluded_websites`, `allowed_websites`, `safe_search` |
| `x` | `included_x_handles`, `excluded_x_handles`, `post_favorite_count`, `post_view_count` |
| `news` | `country`, `excluded_websites`, `safe_search` |
| `rss` | `links` |

### Limits
- `allowed_websites` / `excluded_websites`: max 5 (cannot combine)
- `included_x_handles` / `excluded_x_handles`: max 10 (cannot combine)
- `rss.links`: max 1

### X Handle Note
`"grok"` handle excluded by default. To include, add to `included_x_handles`.

## JSON Format

```json
{
    "model": "grok-4",
    "messages": [...],
    "search_parameters": {
        "mode": "auto",
        "return_citations": true,
        "from_date": "2022-01-01",
        "to_date": "2022-12-31",
        "max_search_results": 10,
        "sources": [
            { "type": "web", "country": "US" },
            { "type": "x", "included_x_handles": ["xai"] },
            { "type": "news" },
            { "type": "rss", "links": ["https://example.com/feed.xml"] }
        ]
    }
}
```

