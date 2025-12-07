# Function Calling (Client-Side Tools) Reference

## Overview
Traditional tool calling where the client handles execution. The LLM initiates RPCs to your system.

## Flow
1. Send user request with tool definitions
2. Model returns tool_calls in response
3. Execute functions locally
4. Send results back to model
5. Model generates final response

## Setup

### xAI SDK
```python
import os
import json
from xai_sdk import Client
from xai_sdk.chat import tool, tool_result, user

client = Client(api_key=os.getenv('XAI_API_KEY'))
chat = client.chat.create(model="grok-4")
```

### OpenAI SDK
```python
from openai import OpenAI

client = OpenAI(
    api_key=os.getenv("XAI_API_KEY"),
    base_url="https://api.x.ai/v1",
)
```

## Define Tools

### With Pydantic
```python
from typing import Literal
from pydantic import BaseModel, Field

class TemperatureRequest(BaseModel):
    location: str = Field(description="City and state, e.g. San Francisco, CA")
    unit: Literal["celsius", "fahrenheit"] = Field("fahrenheit")

def get_temperature(request: TemperatureRequest):
    temp = 59 if request.unit == "fahrenheit" else 15
    return {"location": request.location, "temperature": temp, "unit": request.unit}

# xAI SDK
tool_definitions = [
    tool(
        name="get_temperature",
        description="Get current temperature in a location",
        parameters=TemperatureRequest.model_json_schema(),
    ),
]

# OpenAI SDK
tool_definitions = [
    {
        "type": "function",
        "function": {
            "name": "get_temperature",
            "description": "Get current temperature in a location",
            "parameters": TemperatureRequest.model_json_schema(),
        }
    },
]
```

### With Raw Dictionary
```python
# xAI SDK
tool_definitions = [
    tool(
        name="get_temperature",
        description="Get current temperature",
        parameters={
            "type": "object",
            "properties": {
                "location": {"type": "string", "description": "City and state"},
                "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
            },
            "required": ["location"],
        },
    ),
]

# OpenAI SDK
tool_definitions = [
    {
        "type": "function",
        "function": {
            "name": "get_temperature",
            "description": "Get current temperature",
            "parameters": {
                "type": "object",
                "properties": {
                    "location": {"type": "string"},
                    "unit": {"type": "string", "enum": ["celsius", "fahrenheit"]},
                },
                "required": ["location"],
            }
        }
    },
]
```

## Tool Mapping
```python
tools_map = {
    "get_temperature": get_temperature,
    "get_ceiling": get_ceiling,
}
```

## Execute Flow

### xAI SDK
```python
chat = client.chat.create(
    model="grok-4",
    tools=tool_definitions,
    tool_choice="auto",
)

chat.append(user("What's the temperature in San Francisco?"))
response = chat.sample()

# Handle tool calls
chat.append(response)
if response.tool_calls:
    for tool_call in response.tool_calls:
        fn_name = tool_call.function.name
        fn_args = json.loads(tool_call.function.arguments)
        result = tools_map[fn_name](**fn_args)
        chat.append(tool_result(result))

# Get final response
final = chat.sample()
print(final.content)
```

### OpenAI SDK
```python
messages = [{"role": "user", "content": "What's the temperature in SF?"}]

response = client.chat.completions.create(
    model="grok-4",
    messages=messages,
    tools=tool_definitions,
    tool_choice="auto",
)

# Append assistant message
messages.append(response.choices[0].message)

# Handle tool calls
if response.choices[0].message.tool_calls:
    for tool_call in response.choices[0].message.tool_calls:
        fn_name = tool_call.function.name
        fn_args = json.loads(tool_call.function.arguments)
        
        if fn_name in tools_map:
            result = tools_map[fn_name](**fn_args)
            messages.append({
                "role": "tool",
                "content": json.dumps(result),
                "tool_call_id": tool_call.id,
            })
        else:
            messages.append({
                "role": "tool",
                "content": json.dumps({"error": f"Unknown function: {fn_name}"}),
                "tool_call_id": tool_call.id,
            })

# Get final response
final = client.chat.completions.create(
    model="grok-4",
    messages=messages,
    tools=tool_definitions,
)
print(final.choices[0].message.content)
```

## Tool Choice Modes

| Mode | Behavior |
|------|----------|
| `"auto"` (default) | Model decides if/which tools to call |
| `"required"` | Force model to call at least one tool |
| `"none"` | Disable function calling |
| `{"type": "function", "function": {"name": "my_fn"}}` | Force specific function |

## Parallel Function Calling
- Enabled by default
- Multiple tool calls returned in single response
- Disable with `parallel_function_calling: false`

## Vercel AI SDK Example

```javascript
import { xai } from '@ai-sdk/xai';
import { streamText, tool, stepCountIs } from 'ai';
import { z } from 'zod';

const result = streamText({
  model: xai('grok-4'),
  tools: {
    getTemperature: tool({
      description: 'Get current temperature',
      inputSchema: z.object({
        location: z.string().describe('City and state'),
        unit: z.enum(['celsius', 'fahrenheit']).default('fahrenheit'),
      }),
      execute: async ({ location, unit }) => ({
        location,
        temperature: unit === 'fahrenheit' ? 59 : 15,
        unit,
      }),
    }),
  },
  stopWhen: stepCountIs(5),
  prompt: "What's the temperature in San Francisco?",
});

for await (const chunk of result.fullStream) {
  switch (chunk.type) {
    case 'text-delta':
      process.stdout.write(chunk.text);
      break;
    case 'tool-call':
      console.log(`Tool: ${chunk.toolName}`, chunk.input);
      break;
    case 'tool-result':
      console.log(`Result: ${chunk.toolName}`, chunk.output);
      break;
  }
}
```

## Notes
- With streaming, tool calls returned in single chunk (not streamed)
- Streaming with reasoning models: set longer timeout

