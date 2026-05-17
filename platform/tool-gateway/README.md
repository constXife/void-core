# Tool Gateway

`platform/tool-gateway` is the foundation contract for assistant tool calls.

It intentionally contains reusable primitives only:

- policy resolution for a tool call across chat, external MCP, and autonomous runner surfaces;
- audit decision shape for allowed, denied, confirmed, and rejected calls;
- confirmation-token storage contract for preview/apply write flows;
- reference in-memory implementation for local tests and downstream adapters.

It does not contain product tools, graph schemas, Kadath-specific write logic,
or client deployment policy. Those belong to downstream product or deployment
repositories.

## Rust Contract

The Rust contract lives under `rust/` and is dependency-free so downstream
repositories can vendor or wrap it without inheriting product code.

Run the contract tests:

```bash
rustc --edition=2021 --test rust/src/lib.rs -o /tmp/void-core-tool-gateway-tests
/tmp/void-core-tool-gateway-tests
```

The `assistant_confirm_tokens` PostgreSQL DDL is exposed as
`confirm_tokens::ASSISTANT_CONFIRM_TOKENS_DDL`. Concrete PostgreSQL execution
is implemented downstream by passing that DDL through the deployment's chosen
database client.
