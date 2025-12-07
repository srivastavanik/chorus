# Advanced Usage Reference

## Mixing Server-Side and Client-Side Tools

### Key Difference
- **Server-side tools**: Executed automatically by xAI
- **Client-side tools**: Execution pauses, returns to you for local execution

### xAI SDK Example

```python
import json
from xai_sdk import Client
from xai_sdk.chat import user, tool, tool_result
from xai_sdk.tools import web_search, get_tool_call_type

client = Client(api_key=os.getenv("XAI_API_KEY"))

# Define client-side function
def get_weather(city: str) -> str:
    return f"Weather in {city} is sunny."

# Define tools
tools = [
    web_search(),  # Server-side
    tool(  # Client-side
        name="get_weather",
        description="Get weather for a city",
        parameters={
            "type": "object",
            "properties": {
                "city": {"type": "string", "description": "City name"}
            },
            "required": ["city"]
        },
    ),
]

# Create chat
chat = client.chat.create(
    model="grok-4-fast",
    tools=tools,
    store_messages=True,
)

chat.append(user("What's the weather in the city that won the 2025 NBA championship?"))

# Tool loop
while True:
    client_side_calls = []
    for response, chunk in chat.stream():
        for tool_call in chunk.tool_calls:
            if get_tool_call_type(tool_call) == "client_side_tool":
                client_side_calls.append(tool_call)
            else:
                print(f"Server tool: {tool_call.function.name}")
    
    if not client_side_calls:
        break
    
    # Continue with previous response
    chat = client.chat.create(
        model="grok-4-fast",
        tools=tools,
        store_messages=True,
        previous_response_id=response.id,
    )
    
    # Execute client-side tools
    for tool_call in client_side_calls:
        args = json.loads(tool_call.function.arguments)
        result = get_weather(args["city"])
        chat.append(tool_result(result))

print(response.content)
```

### Using Encrypted Content (Alternative)

```python
chat = client.chat.create(
    model="grok-4-fast",
    tools=tools,
    use_encrypted_content=True,  # Instead of store_messages
)

while True:
    client_side_calls = []
    for response, chunk in chat.stream():
        # ... collect client_side_calls
    
    chat.append(response)  # Add response for context
    
    if not client_side_calls:
        break
    
    for tool_call in client_side_calls:
        args = json.loads(tool_call.function.arguments)
        result = get_weather(args["city"])
        chat.append(tool_result(result))
```

### OpenAI SDK Client-Side Detection

```python
for item in response.output:
    if item.type == "function_call":
        # Client-side - execute locally
        args = json.loads(item.arguments)
        result = my_function(args)
        tool_outputs.append({
            "type": "function_call_output",
            "call_id": item.call_id,
            "output": result,
        })
    elif item.type in ("web_search_call", "x_search_call", 
                       "code_interpreter_call", "file_search_call", "mcp_call"):
        # Server-side - no action needed
        pass
```

## Multi-Turn Conversations with Agentic State

### Option 1: Store Remotely (store_messages)

```python
# First turn
chat = client.chat.create(
    model="grok-4-fast",
    tools=[web_search(), x_search()],
    store_messages=True,
)
chat.append(user("What is xAI?"))
for response, chunk in chat.stream():
    print(chunk.content, end="")

# Second turn - use previous_response_id
chat = client.chat.create(
    model="grok-4-fast",
    tools=[web_search(), x_search()],
    previous_response_id=response.id,  # Chain from previous
)
chat.append(user("What is their latest mission?"))
for response, chunk in chat.stream():
    print(chunk.content, end="")
```

### Option 2: Encrypted Content (ZDR / Local State)

```python
# First turn
chat = client.chat.create(
    model="grok-4-fast",
    tools=[web_search(), x_search()],
    use_encrypted_content=True,
)
chat.append(user("What is xAI?"))
for response, chunk in chat.stream():
    print(chunk.content, end="")

# Append response to maintain context
chat.append(response)

# Second turn - same chat object
chat.append(user("What is their latest mission?"))
for response, chunk in chat.stream():
    print(chunk.content, end="")
```

## Tool Combinations

### Research + Analysis
```python
from xai_sdk.tools import web_search, code_execution
tools = [web_search(), code_execution()]
```

### News Aggregation
```python
from xai_sdk.tools import web_search, x_search
tools = [web_search(), x_search()]
```

### Comprehensive
```python
from xai_sdk.tools import web_search, x_search, code_execution
tools = [web_search(), x_search(), code_execution()]
```

## Using Images in Context

```python
from xai_sdk.chat import image, user
from xai_sdk.tools import web_search, x_search

chat = client.chat.create(
    model="grok-4-fast",
    tools=[web_search(), x_search()],
)

chat.append(
    user(
        "Search and tell me what kind of dog is in this image",
        image("https://example.com/dog.jpg"),
    )
)
```

## Thinking Progress Display

```python
is_thinking = True
for response, chunk in chat.stream():
    for tool_call in chunk.tool_calls:
        print(f"\nTool: {tool_call.function.name}")
    
    if response.usage.reasoning_tokens and is_thinking:
        print(f"\rThinking... ({response.usage.reasoning_tokens} tokens)", 
              end="", flush=True)
    
    if chunk.content and is_thinking:
        print("\n\nResponse:")
        is_thinking = False
    
    if chunk.content:
        print(chunk.content, end="", flush=True)

print(f"\n\nCitations: {response.citations}")
print(f"Usage: {response.usage}")
print(f"Tool Usage: {response.server_side_tool_usage}")
```

