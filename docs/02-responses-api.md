# Responses API Reference

## Overview
The Responses API enables **stateful conversations** where previous prompts, reasoning, and responses are stored server-side for 30 days.

## Key Benefits
- No need to send full conversation history
- Automatic context preservation
- Still billed for entire conversation (may benefit from caching)

## Creating a Response

### Using xAI SDK
```python
import os
from xai_sdk import Client
from xai_sdk.chat import user, system

client = Client(
    api_key=os.getenv("XAI_API_KEY"),
    timeout=3600,
)

chat = client.chat.create(model="grok-4", store_messages=True)
chat.append(system("You are Grok..."))
chat.append(user("What is the meaning of life?"))
response = chat.sample()
print(response.id)  # Save this to continue later
```

### Using OpenAI SDK
```python
from openai import OpenAI
import httpx

client = OpenAI(
    api_key="<API_KEY>",
    base_url="https://api.x.ai/v1",
    timeout=httpx.Timeout(3600.0),
)

response = client.responses.create(
    model="grok-4",
    input=[
        {"role": "system", "content": "You are Grok..."},
        {"role": "user", "content": "What is the meaning of life?"},
    ],
)
print(response.id)
```

### Simple String Input (no system prompt)
```python
response = client.responses.create(
    model="grok-4",
    input="What is 101*3?",
)
```

## Chaining Conversations

### Using previous_response_id
```python
# Continue from previous response
second_response = client.responses.create(
    model="grok-4",
    previous_response_id=response.id,
    input=[
        {"role": "user", "content": "What is the meaning of 42?"},
    ],
)
```

### Using xAI SDK with previous_response_id
```python
chat = client.chat.create(
    model="grok-4",
    previous_response_id=response.id,
    store_messages=True,
)
chat.append(user("Follow-up question"))
second_response = chat.sample()
```

## Encrypted Thinking Content

### Requesting Encrypted Content
```python
# xAI SDK
chat = client.chat.create(
    model="grok-4",
    store_messages=True,
    use_encrypted_content=True
)

# OpenAI SDK
response = client.responses.create(
    model="grok-4",
    input=[...],
    include=["reasoning.encrypted_content"]
)
```

### Using Encrypted Content for Continuation
```python
# xAI SDK - automatic
chat.append(response)  # SDK handles encrypted content
chat.append(user("Next question"))

# OpenAI SDK - spread output
second_response = client.responses.create(
    model="grok-4",
    input=[
        *response.output,  # Includes encrypted reasoning
        {"role": "user", "content": "Next question"},
    ],
)
```

## Retrieving Previous Responses

```python
# xAI SDK
response = client.chat.get_stored_completion("<response_id>")

# OpenAI SDK
response = client.responses.retrieve("<response_id>")

# curl
curl https://api.x.ai/v1/responses/{response_id} \
  -H "Authorization: Bearer $XAI_API_KEY"
```

## Deleting Responses

```python
# xAI SDK
client.chat.delete_stored_completion("<response_id>")

# OpenAI SDK
client.responses.delete("<response_id>")

# curl
curl -X DELETE https://api.x.ai/v1/responses/{response_id} \
  -H "Authorization: Bearer $XAI_API_KEY"
```

## Important Notes
- Responses stored for 30 days, then removed
- `instructions` parameter NOT supported
- When sending images, set `store` to `false`
- Not supported in Vercel AI SDK (use xAI or OpenAI SDK)

