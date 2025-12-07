# xAI Models Reference

## Available Models

| Model | Type | Notes |
|-------|------|-------|
| `grok-4` | Reasoning | Full reasoning model, supports encrypted content |
| `grok-4-fast` | Reasoning | Optimized for agentic tool calling |
| `grok-4-fast-non-reasoning` | Non-reasoning | Based on grok-4-fast with reasoning disabled |
| `grok-3` | Reasoning | Does not return reasoning_content |
| `grok-3-mini` | Reasoning | Returns reasoning_content, supports reasoning_effort |

## Model Capabilities

### Reasoning Models
- Think through problems step-by-step before answering
- Excel at math & quantitative challenges
- `grok-3-mini` only: supports `reasoning_effort` parameter (`low` or `high`)
- `grok-4`: returns encrypted reasoning content (not raw)

### Agentic Tool Calling Support
- **Supported**: `grok-4`, `grok-4-fast`, `grok-4-fast-non-reasoning`
- **Recommended**: `grok-4-fast` - specifically trained for agentic workflows

## Unsupported Parameters by Model Type

### Reasoning Models (grok-4, grok-4-fast)
- `presencePenalty` - NOT supported
- `frequencyPenalty` - NOT supported  
- `stop` - NOT supported
- `reasoning_effort` - NOT supported (only grok-3-mini)

### Agentic Requests
- `n > 1` (batch requests) - NOT supported
- `response_format` (structured output) - NOT yet available with agentic tools
- Only `temperature` and `top_p` are respected

## Pricing

### Token Pricing
- Standard token-based pricing applies
- Reasoning tokens are billed in addition to completion tokens

### Tools Pricing
| Tool | Cost |
|------|------|
| Web Search | $10 per 1,000 tool invocations |
| X Search | $10 per 1,000 tool invocations |
| Code Execution | $10 per 1,000 tool invocations |
| Collections Search | $10 per 1,000 tool invocations |
| Document Search | $10 per 1,000 tool invocations |
| Live Search (legacy) | $25 per 1,000 sources used |

## Timeouts
- Reasoning models require longer timeouts
- Recommended: 3600 seconds (1 hour)

