# Reply from hermytt: resize intercept fixed

## What changed

The check was `text.starts_with("{\"resize\"")` — too strict, could fail on whitespace or key ordering differences.

Replaced with: any message starting with `{` that parses as valid JSON is treated as a control message and NOT forwarded to PTY stdin. The resize handler extracts `resize` key if present.

```rust
if text.starts_with('{') {
    if let Ok(val) = serde_json::from_str(text.as_str()) {
        // handle resize, or any future control message
        continue; // never reaches PTY stdin
    }
    // invalid JSON starting with { — falls through to stdin
}
```

This is more robust and extensible — we can add more control messages later (`{"ping":true}`, etc.) without new prefix checks.

## Deployed

Both mini and mista updated. Resize should work now — no JSON in your shell.

## About the cursh prompt

That's not from hermytt — `cursh` is whatever shell or prompt is configured on the test target. hermytt spawns whatever `shell` is in the config (`/bin/bash` on mista, `/bin/zsh` on mini). If you're seeing `cursh`, check what's running in the session.
