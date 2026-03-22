# TODO

## Ready to ship
- [ ] `npm publish` — package is built, just needs `cd pkg && npm publish`

## Medium effort
- [ ] Mouse reporting (X10, SGR, button tracking) — TUI apps that need mouse input
- [ ] Ligature font support — detect and render programming ligatures
- [ ] OSC 8 hyperlink rendering — parsed but not visually distinct from URLs we detect
- [ ] Selection across scrollback — currently only works on visible grid
- [ ] Paste handling — bracket paste mode wrapping for Ctrl+V / Cmd+V

## Hard
- [ ] Text reflow on resize — rewrap lines when terminal width changes (most terminals get this wrong)
- [ ] IME / composition input — required for CJK text input in the terminal
- [ ] Sixel graphics — inline image rendering via DCS sequences

## Phase 5: Mobile
- [ ] Touch events → keyboard input mapping
- [ ] Virtual keyboard integration
- [ ] Pinch-to-zoom font size
- [ ] iOS Safari viewport handling

## Someday
- [ ] WebGL renderer — upgrade path if Canvas2D becomes a bottleneck (it hasn't)
- [ ] prytty integration — syntax highlighting toggle (wiring exists, needs UI)
- [ ] Fytti 🖕 — WASM runtime with native display server, no JS bridge
