# Code Execution Tool Reference

## Overview
Enables Grok to write and execute Python code in real-time in a sandboxed environment.

## Key Capabilities
- Mathematical computations & equations
- Data analysis & statistics
- Financial modeling
- Scientific computing
- Code generation & testing

## Basic Usage

### xAI SDK
```python
from xai_sdk import Client
from xai_sdk.chat import user
from xai_sdk.tools import code_execution

client = Client(api_key=os.getenv("XAI_API_KEY"))

chat = client.chat.create(
    model="grok-4-fast",
    tools=[code_execution()],
)

chat.append(user("Calculate compound interest for $10,000 at 5% for 10 years"))

for response, chunk in chat.stream():
    for tool_call in chunk.tool_calls:
        print(f"Executing: {tool_call.function.name}")
    if chunk.content:
        print(chunk.content, end="", flush=True)
```

### OpenAI SDK
```python
response = client.responses.create(
    model="grok-4-fast",
    input=[
        {"role": "user", "content": "Calculate compound interest..."},
    ],
    tools=[
        {"type": "code_interpreter"},
    ],
)
```

## Data Analysis Example

```python
chat = client.chat.create(
    model="grok-4-fast",
    tools=[code_execution()],
)

chat.append(user("""
I have sales data for Q1-Q4: [120000, 135000, 98000, 156000].
Please analyze this data and create:
1. Quarterly trends
2. Growth rates
3. Statistical summary
"""))

response = chat.sample()
```

## Multi-Turn Analysis

```python
chat = client.chat.create(
    model="grok-4-fast",
    tools=[code_execution()],
)

# First turn
chat.append(user("Analyze: [120000, 135000, 98000, 156000]"))
response1 = chat.sample()
chat.append(response1)

# Follow-up
chat.append(user("Now predict Q1 next year using linear regression"))
response2 = chat.sample()
```

## Best Practices

### Be Specific
```python
# Good
"Calculate the correlation matrix and highlight correlations above 0.7"

# Avoid
"Analyze this data"
```

### Provide Data Format
```python
# Good
"""
CSV data with columns: date, revenue, costs
Calculate monthly profit margins.
Data: [['2024-01', 50000, 35000], ...]
"""
```

### Model Settings
- Use low temperature (0.0-0.3) for math
- Use reasoning models like `grok-4-fast`

## Common Use Cases

### Financial Analysis
```python
"Calculate the Sharpe ratio for portfolio returns [0.12, 0.08, -0.03, 0.15] with risk-free rate 0.02"
```

### Statistical Analysis
```python
"Perform a t-test comparing Group A: [23, 25, 28, 30] vs Group B: [20, 22, 24, 26]"
```

### Scientific Computing
```python
"Solve differential equation dy/dx = x^2 + y with y(0) = 1 using numerical methods"
```

## Environment Details

### Available Libraries
- NumPy
- Pandas
- Matplotlib
- SciPy
- Most popular Python packages

### Limitations
- Sandboxed execution environment
- Time limits for complex computations
- Memory constraints for large datasets
- No external network access
- Limited file system access
- Stateless (doesn't persist between requests)

## Security
- Isolated execution environment
- No external network access
- No persistent file storage
- All computations are stateless

