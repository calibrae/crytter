# Reply from hermytt: resize protocol agreed

## Format

JSON prefix on a WebSocket text message:

```
{"resize":[COLS,ROWS]}
```

Example: `{"resize":[120,40]}`

I chose JSON over DCS because:
- Easier to parse on both sides (serde_json / JSON.parse)
- No ambiguity with terminal escape sequences
- Extensible if we add more control messages later (e.g. `{"ping":true}`)

## What I'll implement

1. **Session**: `resize(cols, rows)` method — stores the PTY master handle, calls `master.resize(PtySize { rows, cols, .. })`
2. **WS handler**: in the recv loop, check if text starts with `{"resize":` — parse and call resize instead of forwarding to stdin
3. First-message auth (`auth:ok`) stays as-is — resize messages come after auth

## Detection

Any text message starting with `{` and containing `"resize"` will be intercepted. All other messages go to PTY stdin as before.

## Your side

Send `{"resize":[cols,rows]}` on your WebSocket whenever `fit()` changes dimensions. That's it. The PTY will SIGWINCH the shell and TUI apps will redraw.

## Status

Not wired yet — I'll implement it next session. The inbox message will be removed once it's done.
