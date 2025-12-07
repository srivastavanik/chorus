# xAI API Quick Reference

## Installation

```bash
pip install xai-sdk>=1.4.0
# or
pip install openai httpx
```

## Authentication

```python
import os
os.environ["XAI_API_KEY"] = "your_api_key"
```

## Client Setup

### xAI SDK
```python
from xai_sdk import Client
client = Client(api_key=os.getenv("XAI_API_KEY"), timeout=3600)
```

### OpenAI SDK
```python
from openai import OpenAI
import httpx
client = OpenAI(
    api_key=os.getenv("XAI_API_KEY"),
    base_url="https://api.x.ai/v1",
    timeout=httpx.Timeout(3600.0),
)
```

## Basic Chat

### xAI SDK
```python
from xai_sdk.chat import user, system

chat = client.chat.create(model="grok-4")
chat.append(system("You are helpful."))
chat.append(user("Hello!"))
response = chat.sample()
print(response.content)
```

### OpenAI SDK
```python
response = client.chat.completions.create(
    model="grok-4",
    messages=[
        {"role": "system", "content": "You are helpful."},
        {"role": "user", "content": "Hello!"},
    ],
)
print(response.choices[0].message.content)
```

## Streaming

```python
for response, chunk in chat.stream():
    print(chunk.content, end="", flush=True)
```

## Agentic Tools (Server-Side)

```python
from xai_sdk.tools import web_search, x_search, code_execution

chat = client.chat.create(
    model="grok-4-fast",
    tools=[web_search(), x_search(), code_execution()],
)
```

## Stateful Conversations

```python
# Store remotely
chat = client.chat.create(model="grok-4", store_messages=True)

# Continue later
chat = client.chat.create(model="grok-4", previous_response_id=response.id)
```

## Files

```python
from xai_sdk.chat import file

uploaded = client.files.upload(content, filename="doc.txt")
chat.append(user("Summarize", file(uploaded.id)))
```

## Structured Output

```python
response, parsed = chat.parse(MyPydanticModel)
```

## Key Model Names

| Model | Use Case |
|-------|----------|
| `grok-4` | General reasoning |
| `grok-4-fast` | Agentic tool calling |
| `grok-4-fast-non-reasoning` | Fast without reasoning |
| `grok-3-mini` | Lightweight with reasoning_effort |

## Tool Types

| xAI SDK | OpenAI Responses API |
|---------|---------------------|
| `web_search()` | `{"type": "web_search"}` |
| `x_search()` | `{"type": "x_search"}` |
| `code_execution()` | `{"type": "code_interpreter"}` |
| `collections_search()` | `{"type": "file_search"}` |
| `mcp()` | `{"type": "mcp"}` |

## Common Imports

```python
# xAI SDK
from xai_sdk import Client, AsyncClient
from xai_sdk.chat import user, system, tool, tool_result, file, image
from xai_sdk.tools import (
    web_search, x_search, code_execution, 
    collections_search, mcp, get_tool_call_type
)
from xai_sdk.search import SearchParameters  # For deprecated live search

# OpenAI SDK
from openai import OpenAI
import httpx
```

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `https://api.x.ai/v1/chat/completions` | Chat completions |
| `https://api.x.ai/v1/responses` | Responses API (stateful) |
| `https://api.x.ai/v1/files` | File management |

