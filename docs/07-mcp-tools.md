# Remote MCP Tools Reference

## Overview
Connect to external MCP (Model Context Protocol) servers to extend Grok with custom tools.

**Requires**: xai-sdk >= 1.4.0

## Configuration Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `server_url` | Yes | MCP server URL (Streaming HTTP or SSE) |
| `server_label` | No | Label for tool call prefixing |
| `server_description` | No | Description of server capabilities |
| `allowed_tool_names` | No | List of specific tools to allow (empty = all) |
| `authorization` | No | Authorization header token |
| `extra_headers` | No | Additional request headers |

## Basic Usage

### xAI SDK
```python
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.tools import mcp

client = Client(api_key=os.getenv("XAI_API_KEY"))

chat = client.chat.create(
    model="grok-4-fast",
    tools=[
        mcp(server_url="https://mcp.deepwiki.com/mcp"),
    ],
)

chat.append(user("What can you do with https://github.com/xai-org/xai-sdk-python?"))

for response, chunk in chat.stream():
    for tool_call in chunk.tool_calls:
        print(f"Tool: {tool_call.function.name}")
    if chunk.content:
        print(chunk.content, end="", flush=True)
```

### OpenAI SDK
```python
response = client.responses.create(
    model="grok-4-fast",
    input=[
        {"role": "user", "content": "What can you do with..."},
    ],
    tools=[
        {
            "type": "mcp",
            "server_url": "https://mcp.deepwiki.com/mcp",
            "server_label": "deepwiki",
        }
    ],
)
```

## Tool Access Control

### Allow Only Specific Tools
```python
mcp(
    server_url="https://tools.example.com/mcp",
    allowed_tool_names=["search_database", "format_data"]
)
```

Benefits:
- Better performance (fewer tool definitions)
- Reduced risk (e.g., read-only tools only)
- Focused model context

## Multi-Server Support

```python
chat = client.chat.create(
    model="grok-4-fast",
    tools=[
        mcp(server_url="https://mcp.deepwiki.com/mcp", server_label="deepwiki"),
        mcp(server_url="https://custom-tools.com/mcp", server_label="custom"),
        mcp(server_url="https://api.example.com/tools", server_label="api"),
    ],
)
```

## With Authentication

```python
mcp(
    server_url="https://secure-mcp.example.com/mcp",
    server_label="secure",
    authorization="Bearer your-token-here",
    extra_headers={"X-Custom-Header": "value"},
)
```

## Best Practices

1. **Descriptive Labels**: Help model understand each server's purpose
2. **Filter Tools**: Use `allowed_tool_names` when servers have many tools
3. **Use HTTPS**: Always use secure connections
4. **Provide Examples**: Add examples in prompts to guide tool selection

## Limitations

- `require_approval` parameter NOT supported
- `connector_id` parameter NOT supported
- Only Streaming HTTP and SSE transports supported

