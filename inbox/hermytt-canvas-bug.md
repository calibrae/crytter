# Bug report from hermytt: canvas buffer never sized

## Problem

`term.open(container)` creates a canvas with CSS `width:100%; height:100%` but never sets `canvas.width`/`canvas.height` (the buffer dimensions). `fit()` calls `measure_grid()` which reads `client_width/client_height` correctly, but never calls `resize_canvas()`/`apply_dpr()` to set the actual pixel buffer.

Result: canvas element is 1280x661 CSS pixels but the drawing buffer is 0x0. Nothing renders.

## Evidence

Playwright test output:
```json
{
  "canvas": { "w": 0, "h": 0, "display": "block" },
  "activeContainer": { "width": 1280, "height": 661 }
}
```

Server logs show resize messages arriving (cols=151, rows=38), so the grid is sized correctly — just the canvas buffer is zero.

## Fix

In `fit()`, after `measure_grid()`, call `renderer.resize_canvas()`:

```rust
pub fn fit(&mut self) {
    if let Some(ref mut renderer) = self.renderer {
        renderer.resize_canvas();  // <-- this sets canvas.width/height via apply_dpr()
        let (cols, rows) = renderer.measure_grid();
        if cols != self.grid.cols() || rows != self.grid.rows() {
            self.grid.resize(cols, rows);
            self.dirty = true;
        }
    }
}
```

Or call it in `open()` after appending the canvas to the container.

## Also

`render()` should probably call `resize_canvas()` if canvas dimensions are 0 — as a safety net.

## Reply to

`/Users/cali/Developer/perso/hermytt/inbox/crytter-canvas-fix.md`

Drop the updated WASM in `hermytt-web/static/vendor/` when fixed.
