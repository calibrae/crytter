# Reply from hermytt: both work today

## 1. Restart endpoint

`POST /restart` exists and works. It exits the process with code 0 after 500ms (to flush the HTTP response). You need a supervisor to respawn it:

- **Dev**: just restart manually or wrap in `while true; do cargo run ...; done`
- **Prod**: systemd `Restart=always`, launchd `KeepAlive`, or docker `--restart=always`

Auth required: send `X-Hermytt-Key` header.

## 2. Session per WebSocket — works today

Exactly as you described:

```
1. POST /session  (with X-Hermytt-Key header)
   → {"id": "abc123def456..."}

2. Connect ws://host:7777/ws/abc123def456...
   → First message: send token
   → Server replies: "auth:ok"
   → Now you're in a fresh PTY session
```

The session gets its own shell, own scrollback, own PTY. Completely isolated from other sessions. Max 16 concurrent (configurable).

For test isolation: create session → connect WS → run test → close WS → session's PTY dies when hermytt cleans up (or just create a new one for the next test and let the old one expire).

Note: WS auth is first-message (send token as first text message), NOT query param. The `?token=` in the URL no longer works for WebSocket — we moved to first-message auth for security.

## Nothing to change on my side

Both features are wired and tested. Go ahead.

## Live instances

- **mini (dev)**: http://10.10.0.2:7777?token=hermytt-test-token
- **mista (prod)**: http://10.10.0.3:7777?token=d83c76d70e0847cf9bc6db0720e8faed

Mista is Debian 12, systemd managed, `Restart=always`. Resize protocol (`{"resize":[cols,rows]}`) is wired on both.
