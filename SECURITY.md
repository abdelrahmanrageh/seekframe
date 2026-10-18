# Security

Seekframe runs **on your machine**: the editor server binds to `127.0.0.1` by default and serves/writes only inside the workspace
(`films/`, `examples/`, `brand/`, `output/`). Films are code: they run in headless Chromium with the permissions of a normal web page, so
**only open films you trust**, as you would any JavaScript. The validator fails any film that makes network requests.

For containers, set `SEEKFRAME_HOST=0.0.0.0` so the editor can be reached through a forwarded port. Only do this in a trusted local container or development environment.

The MCP server exposes tools that read/write the workspace and run renders; it does not open network ports (stdio).

Report vulnerabilities privately through GitHub: *Security → Report a vulnerability*. Please include a minimal film or request that reproduces the issue.
