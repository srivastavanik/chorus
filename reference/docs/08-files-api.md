# Files API Reference

## Overview
Upload documents and chat with them. File attachments automatically enable `document_search` tool.

**Requires**: xai-sdk >= 1.4.0

## Limitations
- **Max file size**: 48 MB
- **No batch requests**: Agentic (no `n > 1`)
- **Agentic models only**: `grok-4-fast`, `grok-4`

## Supported Formats
- Plain text (.txt)
- Markdown (.md)
- Code files (.py, .js, .java, etc.)
- CSV (.csv)
- JSON (.json)
- PDF (.pdf)
- Other text-based formats

## File Management

### Upload from Path
```python
from xai_sdk import Client

client = Client(api_key=os.getenv("XAI_API_KEY"))

file = client.files.upload("/path/to/document.pdf")
print(f"File ID: {file.id}")
print(f"Filename: {file.filename}")
print(f"Size: {file.size} bytes")
```

### Upload from Bytes
```python
content = b"Document content here..."
file = client.files.upload(content, filename="document.txt")
```

### Upload from File Object
```python
file = client.files.upload(open("doc.pdf", "rb"), filename="doc.pdf")
```

### Upload with Progress
```python
def progress_callback(bytes_uploaded: int, total_bytes: int):
    pct = (bytes_uploaded / total_bytes) * 100
    print(f"Progress: {pct:.1f}%")

file = client.files.upload(
    "/path/to/large-file.pdf",
    on_progress=progress_callback
)
```

### List Files
```python
response = client.files.list(
    limit=10,
    order="desc",  # or "asc"
    sort_by="created_at",  # or "filename", "size"
)
for file in response.data:
    print(f"{file.filename} ({file.id})")
```

### Get File Metadata
```python
file = client.files.get("file-abc123")
```

### Get File Content
```python
content = client.files.content("file-abc123")  # Returns bytes
```

### Delete File
```python
result = client.files.delete("file-abc123")
print(f"Deleted: {result.deleted}")
```

## Chat with Files

### Basic Usage
```python
from xai_sdk.chat import user, file

# Upload
uploaded = client.files.upload(content, filename="report.txt")

# Chat
chat = client.chat.create(model="grok-4-fast")
chat.append(user("What is the revenue?", file(uploaded.id)))
response = chat.sample()
print(response.content)

# Cleanup
client.files.delete(uploaded.id)
```

### Streaming
```python
chat.append(user("Summarize this document", file(uploaded.id)))

for response, chunk in chat.stream():
    for tool_call in chunk.tool_calls:
        print(f"Searching: {tool_call.function.name}")
    if chunk.content:
        print(chunk.content, end="", flush=True)
```

### Multiple Files
```python
chat.append(
    user(
        "Compare these documents",
        file(file1.id),
        file(file2.id),
        file(file3.id),
    )
)
```

### Multi-Turn with Files
```python
chat = client.chat.create(
    model="grok-4-fast",
    use_encrypted_content=True,  # Preserve context
)

chat.append(user("What is the employee's name?", file(uploaded.id)))
response1 = chat.sample()
chat.append(response1)

chat.append(user("What department?"))  # File context retained
response2 = chat.sample()
```

### With Images
```python
from xai_sdk.chat import user, file, image

chat.append(
    user(
        "Based on the guide, what about this cat?",
        file(text_file.id),
        image("https://example.com/cat.jpg"),
    )
)
```

### With Code Execution
```python
from xai_sdk.tools import code_execution

# CSV data file
data_file = client.files.upload(csv_content, filename="data.csv")

chat = client.chat.create(
    model="grok-4-fast",
    tools=[code_execution()],
)

chat.append(
    user(
        "Analyze this data: total by product, average by region",
        file(data_file.id)
    )
)
```

## OpenAI SDK Format

### Upload
```python
with open("doc.pdf", "rb") as f:
    file = client.files.create(file=f, purpose="assistants")
```

### Chat with File
```python
response = client.responses.create(
    model="grok-4-fast",
    input=[
        {
            "role": "user",
            "content": [
                {"type": "input_text", "text": "What is the revenue?"},
                {"type": "input_file", "file_id": file.id}
            ]
        }
    ]
)
```

### With Attachments
```python
response = client.responses.create(
    model="grok-4-fast",
    input=[
        {
            "role": "user",
            "content": "What is the revenue?",
            "attachments": [
                {
                    "file_id": file_id,
                    "tools": [{"type": "file_search"}]
                }
            ]
        }
    ]
)
```

