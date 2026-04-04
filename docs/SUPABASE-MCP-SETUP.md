# Supabase MCP in Cursor

Use the [official Supabase MCP server](https://supabase.com/docs/guides/getting-started/mcp) so Cursor can run SQL, apply migrations, list tables, and use other project tools (with your approval on each tool call).

## Before you start

1. Read [Security risks](https://supabase.com/docs/guides/getting-started/mcp#security-risks) on the Supabase docs. Prefer a **dev** project or `read_only=true` when touching real data.
2. **Project reference:** In Supabase Dashboard → **Project Settings** → **General**, copy **Reference ID** (e.g. `slqinfweymgyliyccwqi`). You will use it as `project_ref`.

## Recommended: Supabase docs configurator

1. Open [Model context protocol (MCP) | Supabase Docs](https://supabase.com/docs/guides/getting-started/mcp).
2. Use the **configuration panel** on that page: choose **Cursor**, your project, and options (e.g. `project_ref`, optional `read_only`).
3. Copy the generated config into Cursor.

## Cursor: where to paste config

1. **Cursor Settings** → **Cursor Settings** → **Tools & MCP** (wording may vary slightly by version).
2. Add a **new MCP server** and paste the JSON, **or** use a project file:
   - **User-wide:** often `~/.cursor/mcp.json` (see Cursor docs for your OS).
   - **Project-only:** create `.cursor/mcp.json` in this repo (see [example](../.cursor/mcp.json.example)).

3. **Restart Cursor** after saving.

4. **Authorize:** Supabase MCP usually opens a **browser login** to grant access to your org/project (dynamic client registration). Complete that flow once.

## Manual HTTP config (reference)

If you configure by hand, the hosted server URL pattern is:

`https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF`

Optional query params (combine with `&`):

| Parameter       | Purpose                                      |
|----------------|-----------------------------------------------|
| `read_only=true` | Run SQL as read-only Postgres user           |
| `features=database,docs` | Limit which tool groups are enabled |

Example with project scoping only:

```json
{
  "mcpServers": {
    "supabase": {
      "type": "http",
      "url": "https://mcp.supabase.com/mcp?project_ref=YOUR_PROJECT_REF"
    }
  }
}
```

**CI / no browser:** use a [Personal Access Token](https://supabase.com/dashboard/account/tokens) and `Authorization: Bearer …` (see Supabase docs). Do not commit tokens.

## Verify

In Cursor chat, ask something like: “List tables in my Supabase project using MCP.” Approve the tool call when prompted.

## Tools relevant to migrations

- `list_migrations` — list migrations  
- `apply_migration` — apply a migration  
- `execute_sql` — run SQL  

Your agent should use these instead of the SQL Editor when MCP is connected.

## Repo files

- [`.cursor/mcp.json.example`](.cursor/mcp.json.example) — template; copy to `.cursor/mcp.json` locally and fill `YOUR_PROJECT_REF`. Add `.cursor/mcp.json` to `.gitignore` if it contains secrets.
