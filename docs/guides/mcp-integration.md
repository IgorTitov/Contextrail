<!-- @HEADER
@version 0.7.50 | 2026-05-03
@purpose Guide for exposing Contextrail hex modules as MCP (Model Context Protocol) servers for AI agent consumption.
@sidecar mcp-integration.md.header.md
@layer docs | @hex _none_ | @ctx _none_
@public true
@edit careful -->

# MCP Integration — Exposing Hex Modules to AI Agents

MCP (Model Context Protocol) lets AI agents access your application's
data and tools through a standardized protocol. In COA hex architecture,
an MCP server is just another **adapter** — it wraps existing domain
logic behind the MCP transport, exactly like a REST controller wraps
it behind HTTP.

See [ADR-0013](../adr/0013-inter-app-communication.md) for the
architectural decision.

---

## The pattern

```
modules/kanban/
  domain/
    board-logic.mjs           ← pure business logic (no MCP, no HTTP)
  ports/
    board-port.mjs            ← contract: getColumns, moveCard, addCard
  adapters/
    mcp-board-server.mjs      ← MCP adapter: exposes domain as MCP resources + tools
    rest-board-controller.mjs ← REST adapter: exposes domain as HTTP endpoints
    memory-board-adapter.mjs  ← test adapter: in-memory, no protocol
```

The domain doesn't know MCP exists. The MCP adapter calls domain
functions through the port, same as any other adapter.

## Step-by-step: adding MCP to a hex module

### 1. Install the MCP SDK (in your app, not the template)

```bash
pnpm add @modelcontextprotocol/sdk
```

This is an app-level dependency, not a module dependency. Hex modules
stay framework-free in domain/ports.

### 2. Create the MCP adapter

```js
// modules/kanban/adapters/mcp-board-server.mjs
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

/**
 * Create an MCP server exposing kanban board operations.
 * @param {import('../ports/board-port.mjs').BoardPort} boardPort
 */
export function createMcpBoardServer(boardPort) {
  const server = new McpServer({
    name: 'kanban-board',
    version: '1.0.0',
  });

  // Resource: read board state
  server.resource('board', 'kanban://board/current', async (uri) => ({
    contents: [{
      uri: uri.href,
      mimeType: 'application/json',
      text: JSON.stringify(boardPort.getColumns()),
    }],
  }));

  // Tool: move a card
  server.tool('move-card', {
    cardId: { type: 'string' },
    fromColumn: { type: 'string' },
    toColumn: { type: 'string' },
  }, async ({ cardId, fromColumn, toColumn }) => {
    const result = boardPort.moveCard(cardId, fromColumn, toColumn);
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  });

  return server;
}

// Standalone entry point (run as: node modules/kanban/adapters/mcp-board-server.mjs)
export async function main(boardPort) {
  const server = createMcpBoardServer(boardPort);
  const transport = new StdioServerTransport();
  await server.connect(transport);
}
```

### 3. Wire in the app layer

```js
// apps/my-app/mcp-entry.mjs
import { createMemoryBoardAdapter } from '../../modules/kanban/public-api.mjs';
import { main } from '../../modules/kanban/adapters/mcp-board-server.mjs';

const boardPort = createMemoryBoardAdapter(initialData);
await main(boardPort);
```

### 4. Register with Claude Code

In `.claude/settings.json`:
```json
{
  "mcpServers": {
    "kanban": {
      "command": "node",
      "args": ["apps/my-app/mcp-entry.mjs"]
    }
  }
}
```

Now Claude can `use_mcp_tool` to call `move-card` or read
`kanban://board/current`.

## What to expose via MCP

| MCP concept | Hex equivalent | Example |
|-------------|---------------|---------|
| **Resource** | Domain query (read-only) | Board state, user list, metrics |
| **Tool** | Domain command (write) | Move card, create user, run report |
| **Prompt** | Domain template | "Summarize this board", "Plan sprint" |

**Rule of thumb:** if it's already a function in your domain layer,
it can be an MCP tool. If it's a query that returns data, it can be
an MCP resource.

## Testing MCP adapters

```js
// tests/contract/kanban-mcp-contract.test.mjs
import { createMcpBoardServer } from '../../modules/kanban/adapters/mcp-board-server.mjs';
import { createMemoryBoardAdapter } from '../../modules/kanban/public-api.mjs';

test('MCP server exposes board resource', async () => {
  const board = createMemoryBoardAdapter(testData);
  const server = createMcpBoardServer(board);
  // Test that resources and tools are registered correctly
  // (use MCP test client or inspect server.resources/tools)
});
```

Domain logic is tested with regular unit tests against the port.
The MCP contract test only verifies that the adapter correctly wires
domain to MCP protocol.

## Multiple MCP servers from one app

A Contextrail app with multiple hex modules can expose each as a
separate MCP server, or combine them into one:

```js
// Combined: one MCP server, multiple modules
const server = new McpServer({ name: 'my-app', version: '1.0.0' });

// Wire kanban tools
server.tool('kanban:move-card', ...);
server.tool('kanban:add-card', ...);

// Wire analytics resources
server.resource('analytics:dashboard', ...);

// Wire scoring tools
server.tool('scoring:calculate', ...);
```

Use `module:action` naming to keep tools organized.

---

**Related:**
- [ADR-0013](../adr/0013-inter-app-communication.md) — decision record
- [Inter-App API Patterns](inter-app-api.md) — REST/GraphQL/WebSocket between apps
- [Framework in Hex Modules](framework-in-hex-modules.md) — framework code in adapters
