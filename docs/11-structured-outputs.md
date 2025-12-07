# Structured Outputs Reference

## Overview
Get guaranteed JSON responses matching your defined schema.

## Supported Models
All models from `grok-2-1212` and later.

## Supported Schema Types
- `string` (no minLength/maxLength)
- `number` (integer, float)
- `object`
- `array` (no minItems/maxItems/minContains/maxContains)
- `boolean`
- `enum`
- `anyOf`

**Not Supported**: `allOf`

## Example: Invoice Parsing

### Define Schema with Pydantic

```python
from datetime import date
from enum import Enum
from typing import List
from pydantic import BaseModel, Field

class Currency(str, Enum):
    USD = "USD"
    EUR = "EUR"
    GBP = "GBP"

class LineItem(BaseModel):
    description: str = Field(description="Item description")
    quantity: int = Field(description="Units", ge=1)
    unit_price: float = Field(description="Price per unit", ge=0)

class Address(BaseModel):
    street: str = Field(description="Street address")
    city: str = Field(description="City")
    postal_code: str = Field(description="Postal/ZIP code")
    country: str = Field(description="Country")

class Invoice(BaseModel):
    vendor_name: str = Field(description="Vendor name")
    vendor_address: Address
    invoice_number: str = Field(description="Invoice ID")
    invoice_date: date
    line_items: List[LineItem]
    total_amount: float = Field(ge=0)
    currency: Currency
```

### Define Schema with Zod (JavaScript)

```javascript
import { z } from "zod";

const InvoiceSchema = z.object({
    vendor_name: z.string(),
    vendor_address: z.object({
        street: z.string(),
        city: z.string(),
        postal_code: z.string(),
        country: z.string(),
    }),
    invoice_number: z.string(),
    invoice_date: z.string().date(),
    line_items: z.array(z.object({
        description: z.string(),
        quantity: z.number().int().min(1),
        unit_price: z.number().min(0),
    })),
    total_amount: z.number().min(0),
    currency: z.enum(["USD", "EUR", "GBP"]),
});
```

### xAI SDK Usage

```python
from xai_sdk import Client
from xai_sdk.chat import system, user

client = Client(api_key=os.getenv("XAI_API_KEY"))
chat = client.chat.create(model="grok-4")

chat.append(system("Extract invoice data into JSON format."))
chat.append(user("""
Vendor: Acme Corp, 123 Main St, Springfield, IL 62704
Invoice Number: INV-2025-001
Date: 2025-02-10
Items:
- Widget A, 5 units, $10.00 each
- Widget B, 2 units, $15.00 each
Total: $80.00 USD
"""))

# Returns tuple: (response, parsed_object)
response, invoice = chat.parse(Invoice)

# Type-safe access
print(invoice.vendor_name)
print(invoice.total_amount)
print(invoice.line_items)
```

### OpenAI SDK Usage

```python
from openai import OpenAI

client = OpenAI(
    api_key="<API_KEY>",
    base_url="https://api.x.ai/v1",
)

completion = client.beta.chat.completions.parse(
    model="grok-4",
    messages=[
        {"role": "system", "content": "Extract invoice data into JSON."},
        {"role": "user", "content": "Vendor: Acme Corp..."},
    ],
    response_format=Invoice,
)

invoice = completion.choices[0].message.parsed
print(invoice)
```

### JavaScript OpenAI SDK

```javascript
import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";

const client = new OpenAI({
    apiKey: "<api key>",
    baseURL: "https://api.x.ai/v1",
});

const completion = await client.beta.chat.completions.parse({
    model: "grok-4",
    messages: [
        { role: "system", content: "Extract invoice data into JSON." },
        { role: "user", content: "Vendor: Acme Corp..." },
    ],
    response_format: zodResponseFormat(InvoiceSchema, "invoice"),
});

const invoice = completion.choices[0].message.parsed;
```

### Vercel AI SDK

```javascript
import { xai } from '@ai-sdk/xai';
import { generateObject } from 'ai';

const result = await generateObject({
    model: xai('grok-4'),
    schema: InvoiceSchema,
    system: 'Extract invoice data into JSON.',
    prompt: 'Vendor: Acme Corp...',
});

console.log(result.object);
```

## Output Example

```json
{
  "vendor_name": "Acme Corp",
  "vendor_address": {
    "street": "123 Main St",
    "city": "Springfield",
    "postal_code": "62704",
    "country": "IL"
  },
  "invoice_number": "INV-2025-001",
  "invoice_date": "2025-02-10",
  "line_items": [
    { "description": "Widget A", "quantity": 5, "unit_price": 10.0 },
    { "description": "Widget B", "quantity": 2, "unit_price": 15.0 }
  ],
  "total_amount": 80.0,
  "currency": "USD"
}
```

## Use Cases
- Document parsing (invoices, receipts, contracts)
- Entity extraction
- Report generation
- Data transformation
- API response formatting

