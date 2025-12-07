# Streaming Response Reference

## Overview
Server-Sent Events (SSE) for real-time text generation feedback.

## Supported Models
All models with text output capability.

**Not Supported**: Image generation models.

## Enable Streaming
Set `"stream": true` in request.

## xAI SDK

```python
import os
from xai_sdk import Client
from xai_sdk.chat import user, system

client = Client(
    api_key=os.getenv('XAI_API_KEY'),
    timeout=3600,  # Longer timeout for reasoning models
)

chat = client.chat.create(model="grok-4")
chat.append(system("You are Grok..."))
chat.append(user("What is the meaning of life?"))

for response, chunk in chat.stream():
    print(chunk.content, end="", flush=True)  # Each chunk
    # print(response.content, end="")  # Accumulated

print(response.content)  # Full response after completion
```

## OpenAI SDK (Python)

```python
from openai import OpenAI
import httpx

client = OpenAI(
    api_key=os.getenv("XAI_API_KEY"),
    base_url="https://api.x.ai/v1",
    timeout=httpx.Timeout(3600.0),
)

stream = client.chat.completions.create(
    model="grok-4",
    messages=[{"role": "user", "content": "Hello!"}],
    stream=True,
)

for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)
```

## JavaScript

```javascript
import OpenAI from "openai";

const client = new OpenAI({
    apiKey: "<api key>",
    baseURL: "https://api.x.ai/v1",
    timeout: 360000,
});

const stream = await client.chat.completions.create({
    model: "grok-4",
    messages: [{ role: "user", content: "Hello!" }],
    stream: true,
});

for await (const chunk of stream) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
}
```

## curl

```bash
curl https://api.x.ai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $XAI_API_KEY" \
  -d '{
    "model": "grok-4",
    "messages": [{"role": "user", "content": "Hello!"}],
    "stream": true
  }'
```

## SSE Format

```
data: {"id":"...","object":"chat.completion.chunk","created":...,"model":"grok-4","choices":[{"index":0,"delta":{"content":"Ah","role":"assistant"}}],"usage":{...}}
data: {"id":"...","object":"chat.completion.chunk","created":...,"model":"grok-4","choices":[{"index":0,"delta":{"content":",","role":"assistant"}}],"usage":{...}}
data: [DONE]
```

## Agentic Streaming with Progress

```python
is_thinking = True
for response, chunk in chat.stream():
    # Show tool calls
    for tool_call in chunk.tool_calls:
        print(f"\nTool: {tool_call.function.name}")
    
    # Show reasoning progress
    if response.usage.reasoning_tokens and is_thinking:
        print(f"\rThinking... ({response.usage.reasoning_tokens} tokens)", 
              end="", flush=True)
    
    # Transition to content
    if chunk.content and is_thinking:
        print("\n\nResponse:")
        is_thinking = False
    
    # Show content
    if chunk.content:
        print(chunk.content, end="", flush=True)

# After completion
print(f"\nCitations: {response.citations}")
print(f"Usage: {response.server_side_tool_usage}")
```

## Important Notes

### Timeouts
- Reasoning models need longer timeouts
- Recommended: 3600 seconds (1 hour)

### Function Calls in Streaming
- Tool calls returned in single chunk (not streamed across chunks)

### Citations with Streaming
- Citations only in **last chunk**
- Similar to usage data behavior

