# Agent Rules (Global for this project)

**Priority: High**

When the user asks for **code generation, setup/configuration steps, or library/API documentation**:
- **Always use the Context7 MCP tools** to resolve the library ID/version and fetch the latest official docs/snippets before answering.
- Prefer examples from docs returned by Context7 over model priors.
- Cite which functions/classes and version you used from the fetched docs in your explanation.
- If multiple libraries are possible, ask a 1-line clarification, otherwise choose the most probable and still call Context7 to confirm.
