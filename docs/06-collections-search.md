# Collections Search Tool Reference

## Overview
Search through uploaded knowledge bases (collections) to retrieve relevant information from your documents.

## SDK Mapping
| SDK | Tool Name |
|-----|-----------|
| xAI SDK | `collections_search()` |
| OpenAI Responses API | `file_search` |

## Complete Example

```python
import asyncio
import os
import httpx
from xai_sdk import AsyncClient
from xai_sdk.chat import user
from xai_sdk.proto import collections_pb2
from xai_sdk.tools import code_execution, collections_search

async def main():
    client = AsyncClient(api_key=os.getenv("XAI_API_KEY"))
    
    # 1. Create collection
    response = await client.collections.create("my-collection")
    collection_id = response.collection_id
    
    # 2. Upload document
    async with httpx.AsyncClient() as http_client:
        pdf_response = await http_client.get("https://example.com/doc.pdf")
        pdf_content = pdf_response.content
        
        doc_response = await client.collections.upload_document(
            collection_id=collection_id,
            name="document.pdf",
            data=pdf_content,
            content_type="application/pdf",
        )
        
        # Wait for processing
        while True:
            doc = await client.collections.get_document(
                doc_response.file_metadata.file_id, 
                collection_id
            )
            if doc.status == collections_pb2.DOCUMENT_STATUS_PROCESSED:
                break
            await asyncio.sleep(3)
    
    # 3. Search with collections
    chat = client.chat.create(
        model="grok-4-fast",
        tools=[
            collections_search(collection_ids=[collection_id]),
            code_execution(),  # Optional: for calculations
        ],
    )
    
    chat.append(user("What does the document say about X?"))
    
    async for response, chunk in chat.stream():
        if chunk.content:
            print(chunk.content, end="", flush=True)
    
    # Citations format
    print(response.citations)
    # ['collections://collection_id/files/file_id']
```

## OpenAI SDK Format

```python
response = client.responses.create(
    model="grok-4-fast",
    input=[
        {"role": "user", "content": "Search my documents for..."},
    ],
    tools=[
        {
            "type": "file_search",
            "vector_store_ids": ["your_collection_id"],
            "max_num_results": 10
        },
        {"type": "code_interpreter"},
    ],
)
```

## Citations Format

```
collections://collection_id/files/file_id
```

Components:
- `collections://` - Protocol identifier
- `collection_id` - Collection unique ID
- `files/file_id` - Document file ID

## Combining with Other Tools

### Collections + Web Search
```python
from xai_sdk.tools import collections_search, web_search, x_search

chat = client.chat.create(
    model="grok-4-fast",
    tools=[
        collections_search(collection_ids=[collection_id]),
        web_search(),
        x_search(),
    ],
)

chat.append(user(
    "Based on my documents, compare with current market sentiment"
))
```

## Use Cases

- **Financial Analysis**: SEC filings, earnings reports
- **Enterprise Knowledge**: Internal documents, policies
- **Customer Support**: Product documentation
- **Research**: Academic papers, technical reports
- **Compliance**: Guidelines, regulations
- **Legal**: Contracts, legal documents

## Best Practices

1. **Well-structured documents** work best
2. **Clear headings and sections** improve search
3. **Combine with code execution** for data analysis
4. **Use multiple collections** for different document types

