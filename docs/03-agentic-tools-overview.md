# Agentic Tool Calling Overview

## What is Agentic Tool Calling?
Server-side tools that the model autonomously orchestrates - xAI manages the entire reasoning and tool-execution loop.

## Available Server-Side Tools

| Tool | xAI SDK | OpenAI Responses API | Description |
|------|---------|---------------------|-------------|
| Web Search | `web_search()` | `{"type": "web_search"}` | Search web, browse pages |
| X Search | `x_search()` | `{"type": "x_search"}` | Search X posts, users, threads |
| Code Execution | `code_execution()` | `{"type": "code_interpreter"}` | Execute Python code |
| Collections Search | `collections_search()` | `{"type": "file_search"}` | Search uploaded collections |
| Remote MCP | `mcp()` | `{"type": "mcp"}` | Connect to MCP servers |
| Document Search | `file()` attachment | `{"type": "input_file"}` | Auto-enabled with file attachments |

## Quick Start Example

```python
import os
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.tools import web_search, x_search, code_execution

client = Client(api_key=os.getenv("XAI_API_KEY"))

chat = client.chat.create(
    model="grok-4-fast",
    tools=[
        web_search(),
        x_search(),
        code_execution(),
    ],
)

chat.append(user("What are the latest updates from xAI?"))

# Streaming (recommended)
for response, chunk in chat.stream():
    for tool_call in chunk.tool_calls:
        print(f"Tool: {tool_call.function.name}")
    if chunk.content:
        print(chunk.content, end="", flush=True)

# Non-streaming
response = chat.sample()
print(response.content)
```

## Understanding Response Objects

### Real-time Tool Calls (streaming)
```python
for response, chunk in chat.stream():
    for tool_call in chunk.tool_calls:
        print(f"Calling: {tool_call.function.name}")
        print(f"Args: {tool_call.function.arguments}")
```

### Citations
```python
# Available after completion
print(response.citations)
# ['https://x.com/...', 'https://example.com/...']
```

### Server-Side Tool Usage (billable)
```python
print(response.server_side_tool_usage)
# {'SERVER_SIDE_TOOL_WEB_SEARCH': 2, 'SERVER_SIDE_TOOL_X_SEARCH': 3}
```

### All Tool Calls (including failed)
```python
print(response.tool_calls)
# List of all attempted tool calls
```

## Tool Call Types

| Usage Category | Function Names |
|---------------|----------------|
| `SERVER_SIDE_TOOL_WEB_SEARCH` | `web_search`, `web_search_with_snippets`, `browse_page` |
| `SERVER_SIDE_TOOL_X_SEARCH` | `x_user_search`, `x_keyword_search`, `x_semantic_search`, `x_thread_fetch` |
| `SERVER_SIDE_TOOL_CODE_EXECUTION` | `code_execution` |
| `SERVER_SIDE_TOOL_VIEW_X_VIDEO` | `view_x_video` |
| `SERVER_SIDE_TOOL_VIEW_IMAGE` | `view_image` |
| `SERVER_SIDE_TOOL_COLLECTIONS_SEARCH` | `collections_search` |
| `SERVER_SIDE_TOOL_MCP` | `{server_label}.{tool_name}` |

## Identifying Tool Call Types

```python
from xai_sdk.tools import get_tool_call_type

for tool_call in response.tool_calls:
    call_type = get_tool_call_type(tool_call)
    # Returns: "client_side_tool", "web_search_tool", "x_search_tool",
    #          "code_execution_tool", "collections_search_tool", "mcp_tool"
```

### OpenAI SDK Types
| Type | Description |
|------|-------------|
| `function_call` | Client-side tool (needs local execution) |
| `web_search_call` | Server-side web search |
| `x_search_call` | Server-side X search |
| `code_interpreter_call` | Server-side code execution |
| `file_search_call` | Server-side collections search |
| `mcp_call` | Server-side MCP tool |

## Token Usage

```python
print(response.usage)
# completion_tokens: Final output tokens only
# prompt_tokens: Cumulative across all inference steps
# reasoning_tokens: Internal reasoning process
# cached_prompt_text_tokens: Cache hits (efficiency)
# prompt_image_tokens: Visual content tokens
```

## Billing Notes
- Only successful tool executions are billed
- Failed attempts are NOT charged
- Token costs plus tool invocation costs

