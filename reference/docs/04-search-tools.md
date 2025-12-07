# Search Tools Reference

## Web Search

### Basic Usage
```python
from xai_sdk.tools import web_search

chat = client.chat.create(
    model="grok-4-fast",
    tools=[web_search()],
)
```

### Filters

#### Allowed Domains (max 5)
```python
# xAI SDK
web_search(allowed_domains=["wikipedia.org", "x.ai"])

# OpenAI SDK
{"type": "web_search", "filters": {"allowed_domains": ["wikipedia.org"]}}
```

#### Excluded Domains (max 5)
```python
# xAI SDK
web_search(excluded_domains=["wikipedia.org"])

# OpenAI SDK
{"type": "web_search", "filters": {"excluded_domains": ["wikipedia.org"]}}
```

**Note**: `allowed_domains` and `excluded_domains` cannot be used together.

#### Enable Image Understanding
```python
# xAI SDK
web_search(enable_image_understanding=True)

# OpenAI SDK
{"type": "web_search", "enable_image_understanding": True}
```
- Enables `view_image` tool for analyzing images found during search
- Increases token usage
- Enabling for web_search also enables for x_search

## X Search

### Basic Usage
```python
from xai_sdk.tools import x_search

chat = client.chat.create(
    model="grok-4-fast",
    tools=[x_search()],
)
```

### Filters

#### Allowed X Handles (max 10)
```python
# xAI SDK
x_search(allowed_x_handles=["elonmusk", "xai"])

# OpenAI SDK
{"type": "x_search", "allowed_x_handles": ["elonmusk"]}
```

#### Excluded X Handles (max 10)
```python
# xAI SDK
x_search(excluded_x_handles=["someuser"])

# OpenAI SDK
{"type": "x_search", "excluded_x_handles": ["someuser"]}
```

**Note**: `allowed_x_handles` and `excluded_x_handles` cannot be used together.

#### Date Range
```python
from datetime import datetime

# xAI SDK (accepts datetime objects)
x_search(
    from_date=datetime(2025, 10, 1),
    to_date=datetime(2025, 10, 10),
)

# OpenAI SDK (ISO8601 strings)
{
    "type": "x_search",
    "from_date": "2025-10-01",
    "to_date": "2025-10-10"
}
```

#### Enable Image Understanding
```python
x_search(enable_image_understanding=True)
```

#### Enable Video Understanding
```python
# xAI SDK
x_search(enable_video_understanding=True)

# OpenAI SDK
{"type": "x_search", "enable_video_understanding": True}
```
- Only for X posts with videos
- Enables `view_x_video` tool
- Increases token usage

## Combining Search Tools

```python
from xai_sdk.tools import web_search, x_search

chat = client.chat.create(
    model="grok-4-fast",
    tools=[
        web_search(allowed_domains=["x.ai"]),
        x_search(allowed_x_handles=["xai"]),
    ],
)
```

## Citations

```python
# After response completes
print(response.citations)
# ['https://x.com/i/status/...', 'https://example.com/...']
```
- URLs of all sources encountered
- Not all may be in final answer
- Only available after completion (not during streaming)

## OpenAI Responses API Format

```python
response = client.responses.create(
    model="grok-4-fast",
    input=[{"role": "user", "content": "What is xAI?"}],
    tools=[
        {"type": "web_search"},
        {"type": "x_search"},
    ],
)
```

