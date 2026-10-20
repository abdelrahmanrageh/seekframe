# Security

Seekframe runs **on your machine**. The editor server binds to `127.0.0.1` by default and serves/writes only inside the workspace
(`films/`, `brand/`, `output/`) and the package's read-only gallery. Films are code: they run in headless Chromium with the permissions of a
normal web page, so **only open films you trust**, as you would any JavaScript. The validator fails any film that makes network requests.

**Protection against web pages (v0.2):** a local server is still reachable by any page open in your browser, so the editor API checks every request:
the `Host` must be `localhost`, `127.0.0.1` or `[::1]` (blocks DNS-rebinding), and every state-changing request must carry an `X-Seekframe: 1` header
and, if the browser sends an `Origin`, an allowed one (blocks cross-site forms and `fetch` from other sites). There are no CORS headers. Tests cover this
(`test/server.test.ts`).

**Containers:** to reach the editor through a forwarded port, set `SEEKFRAME_HOST=0.0.0.0` and list the hostnames you will use in
`SEEKFRAME_ALLOWED_HOSTS` (comma separated, `*.example.com` wildcards allowed; the dev container sets the GitHub Codespaces domains). There is **no
authentication**: only expose the port to yourself (Codespaces keeps forwarded ports private by default; never publish it).

**Dependencies:** `npm install seekframe` runs one install script of ours to the outside world: `ffmpeg-static` downloads the ffmpeg binary (optional: `npm install --omit=optional`
and use your own ffmpeg, or set `SEEKFRAME_FFMPEG`). Chromium comes from `npx playwright install chromium`. Dependency scanners will report network access, shell access, `eval`
and install scripts for these and for the MCP server's web framework; none is used on film content.

The MCP server exposes tools that read/write the workspace and run renders; it does not open network ports (stdio).

Report vulnerabilities privately through GitHub: *Security → Report a vulnerability*. Please include a minimal film or request that reproduces the issue.
