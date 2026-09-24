# PERFORMANCE-TRADEOFFS.md

## How performance is measured here (moved from the old NEXT-STEPS.md, which no longer exists in that form)

`pagespeed.web.dev` never worked from the Browser pane, so use the CLI against a local production
preview: `npm run build`, `npm run preview`, then
`npx lighthouse http://localhost:PORT --preset=perf --form-factor=mobile --screenEmulation.mobile --throttling-method=simulate --chrome-flags="--headless --no-sandbox"`.
It always throws `EPERM` cleaning up its temp Chrome profile on Windows (Controlled Folder Access) —
harmless; check the report file exists rather than the exit code. This machine's numbers are noisy
(back-to-back runs of the same build swung Total Blocking Time 737↔1237ms and the score 64↔73), so
trust only large, repeated signals (a metric moving 800ms+, an audit disappearing) and average 2–3
runs. A real run against the deployed URL via the actual PageSpeed infrastructure has never been done.
Already shipped and free of visual cost: legal-page code-splitting, image `srcSet`/width caps,
preconnect to Cloudinary, IntersectionObserver pauses (Hero shader, Features widgets), below-the-fold
lazy loading, self-hosted fonts (FCP 3.5s→2.7s, LCP 4.1s→3.2s), and the sub-1024px GPU trims
(no grain overlay, halved backdrop blur, no `filter` on Protocol's scrub, 1x shader DPR).

---

Optional performance adjustments that were deliberately **not** applied — each one trades away a
real, visible piece of the site's polish for a real performance gain. Passes 1–3 plus the shader
DPR cap and font/lazy-load work (see the measurement notes at the top of this file) were all "free" — zero visual cost. These
three are not free. Don't apply any of these speculatively; only reach for this file when there's
an actual, current complaint ("still feels laggy on phones," a real low mobile Lighthouse score)
that the free passes didn't fully resolve.

**How to use this file in a future session:** read the complaint, pick the option below that best
matches it (all three specifically target *mobile* — none of them touch desktop), confirm with the
user which trade-off they're willing to accept before touching code, execute it exactly as
described, then verify using the steps given rather than assuming it worked.

---

## Option A — Simplify the Hero shader's noise detail on mobile

**What it is:** `HeroShaderBackground.jsx`'s `fbm()` function (fragment shader, ~line 39) layers 5
"octaves" of noise on top of each other to build the swirling flow-noise texture — each octave is a
real, repeated cost per pixel, and this shader already runs continuously on every frame the Hero is
visible. Dropping to 3 octaves on mobile cuts that per-pixel cost by ~40% for the single most
GPU-intensive continuous effect on the entire site.

**What you're giving up:** the swirl pattern reads as visibly simpler/smoother on phones — less
fine-grained texture, a softer look overall. Still clearly the same effect, same colors, same
cursor-glow behavior — just less richly detailed. Desktop is unaffected if scoped as below.

**How to execute:**
1. Add a new uniform: `uniform int uOctaves;` near the other uniform declarations in `FRAGMENT_SRC`
   (~line 19-22).
2. Change the fbm loop to respect it:
   ```glsl
   for (int i = 0; i < 5; i++) {
     if (i >= uOctaves) break;
     v += amp * noise(p);
     p *= 2.02;
     amp *= 0.5;
   }
   ```
3. In the component body, look up the uniform location alongside the others (`uResolution`, `uTime`,
   etc., ~line 138-141): `const uOctaves = gl.getUniformLocation(program, 'uOctaves')`.
4. Set it once, using the same `window.innerWidth >= 1024` breakpoint check already established for
   the DPR cap in this exact file (~line 156): `gl.uniform1i(uOctaves, window.innerWidth >= 1024 ? 5 : 3)`.
   Do this once at setup (no need to re-set on resize/rotate the way DPR does, since octave count
   isn't as visually jarring to leave stale across a breakpoint crossing — but mirror the DPR
   pattern if consistency matters more than the extra complexity).

**How to tell if it worked:**
- Visual: at a real mobile viewport, the background should look noticeably smoother/less detailed
  than at desktop width — compare a screenshot at each width.
- Correctness: `gl.getUniformLocation(program, 'uOctaves')` should resolve to a valid location (not
  `null`) — if the shader failed to compile with the new uniform, this returns `null` silently.
- Performance: re-run the CLI Lighthouse workflow described at the top of this file,
  averaging 2-3 runs (this dev machine's numbers are noisy run-to-run — see the notes at the top).
  Expect a measurable drop in `mainthread-work-breakdown`'s `paintCompositeRender`/`Rendering` group
  specifically, since this is a GPU-bound cost, not a JS one.

---

## Option B — Cap the Hero shader to ~30fps on mobile

**What it is:** the render loop (`HeroShaderBackground.jsx`, ~line 190-204) currently draws a new
frame every single `requestAnimationFrame` tick — a full 60fps (or higher, on a 120Hz phone) on
every device. Skipping every other frame on mobile halves the GPU draw-call cost for the same
visual motion, since the flow-noise animates slowly to begin with.

**What you're giving up:** close to nothing, honestly — this is the lowest-risk of the three
options. The content is slow ambient motion (not fast action), so dropping to 30fps is very hard to
consciously notice. The only real cost is a very slightly less "silky" feel specifically on a
120Hz+ display, which is a small minority of phones.

**How to execute:** track elapsed time since the last actual draw, and only call `gl.drawArrays`
(not `requestAnimationFrame` — keep scheduling every tick so the loop stays alive and responsive)
once enough time has passed:
```js
let lastDrawTime = 0
const FRAME_INTERVAL_MOBILE = 1000 / 30 // ~33.3ms

const render = (now) => {
  const isDesktop = window.innerWidth >= 1024
  if (isDesktop || now - lastDrawTime >= FRAME_INTERVAL_MOBILE) {
    lastDrawTime = now
    const t = (now - start) / 1000
    // ...existing uniform updates + gl.drawArrays call, unchanged...
  }
  if (!reducedMotion && visible) rafId = requestAnimationFrame(render)
}
```
**Note (added after the shader-freeze fix):** the snippet above predates it. In the real file, `render()`'s re-schedule now reads `if (!reducedMotion && visible && !contextLost) rafId = requestAnimationFrame(render) else rafId = null`, and uniforms are read via `uniforms.uResolution` etc. Keep that `else rafId = null` and the `uniforms.*` names when applying this option — dropping the reset reintroduces the permanent freeze after scrolling away and back.

Keep the uniform-update block (mouse easing, `uTime`, `gl.drawArrays`) exactly as it is today —
just wrap it in the interval check above. Don't gate the `requestAnimationFrame(render)` re-schedule
call itself behind the interval check, or the loop stops entirely instead of just skipping draws.

**How to tell if it worked:** this is genuinely hard to verify reliably through this project's
Browser-pane tooling — `requestAnimationFrame` and screenshot timing are both documented as
unreliable in `CLAUDE.md`'s tooling-gotchas section. The most trustworthy check: temporarily add a
`window.__drawCount` counter incremented only inside the `now - lastDrawTime >= FRAME_INTERVAL_MOBILE`
branch, let it run for a real few seconds at a real mobile viewport, and confirm the count is close
to `(seconds elapsed) * 30`, not `* 60` — remove the counter afterward. A real physical phone or an
un-instrumented desktop browser at a narrow window is a more reliable way to eyeball this than the
automated tool.

---

## Option C — Drop Protocol's sticky-stacking effect on mobile entirely

**This is the biggest lever on this list, and also the biggest visible change.** Read carefully
before doing this one — it removes a signature interaction, not just softens an effect.

**What it is:** `Protocol.jsx`'s 3 process-step cards use real `position: sticky` (the `.protocol-card`
className, ~line 65: `sticky top-24 sm:top-28`) plus a GSAP `ScrollTrigger` scrub tween (the
`useEffect` at the top of the file) that keeps recalculating scale/opacity on every scroll tick
while the section is being scrolled through. This is the only section on the entire site still
doing continuous scroll-tied work on mobile after Pass 3 (which only trimmed the `filter` property
out of this same tween — the sticky positioning and the scrub tween itself are both still fully
live on mobile). Dropping both entirely on mobile removes real, continuous CPU+layout cost specific
to phones, not just the GPU costs the other options and Pass 3 already addressed.

**What you're giving up:** the actual "cards stack on top of each other as you scroll" effect,
completely, on mobile. Instead the 3 steps would just be plain cards in normal document flow,
scrolling past like any other section — no pinning, no stacking, no scale/fade transition between
them. Desktop keeps the full effect exactly as it is today if scoped as below. This is a genuine
loss of a distinctive, deliberately-built interaction — confirm the user actually wants this
specific trade before doing it, don't apply it just because it's technically the biggest win.

**How to execute:**
1. In the `useEffect` at the top of `Protocol.jsx`, compute `const isDesktop = window.matchMedia('(min-width: 1024px)').matches` once (same pattern Pass 3 already uses in this exact file for the `filter` drop).
2. Skip building the GSAP `ScrollTrigger` scrub tween entirely on mobile — wrap the `cards.forEach(...)` loop body (or the whole `gsap.context` callback) in `if (!isDesktop) return` before it creates any tweens.
3. Make the `sticky top-24 sm:top-28` positioning conditional too, since a `position: sticky` element with nothing animating it will still visually "stick" and cover the next card oddly — change the className (~line 65) to something like:
   ```jsx
   className={`protocol-card ${isDesktop ? 'sticky top-24 sm:top-28' : 'relative'} mx-auto max-w-6xl ...`}
   ```
   This needs `isDesktop` computed at render time too (not just inside the effect) — lift it to a
   `useState`/`useEffect`-driven value, or a `window.matchMedia` check at the top of the component
   function, so the className reflects it on first render, not just after the effect runs.
4. Double check: the last card (`i === cards.length - 1`, currently skipped from getting a tween
   regardless) doesn't need any special-casing — it already never sticks/animates, it's just the
   final resting card.

**How to tell if it worked:**
- Correctness: at a mobile viewport, scroll to Protocol and confirm each card's
  `getBoundingClientRect().top` moves in exact lockstep with `scrollY` (a real scroll delta of Npx
  should move the card by the same Npx) — this is the literal opposite of the "does it clamp"
  check `CLAUDE.md`'s sticky-bug entry describes, and confirms the sticky behavior is genuinely gone,
  not just visually similar.
- Correctness: `ScrollTrigger.getAll().length` (GSAP's own registry) should be 2 fewer at a mobile
  viewport than at desktop width (the 2 non-last cards no longer get a scrub tween created at all).
- Performance: re-run the CLI Lighthouse workflow (described at the top of this file), averaging
  multiple runs. Expect the clearest win of these three options in `total-blocking-time` and
  `mainthread-work-breakdown`'s `styleLayout` group specifically, since this removes continuous
  scroll-driven layout recalculation, not just a GPU paint cost.
- Visual: confirm desktop (≥1024px) is completely unchanged — same sticky/scrub behavior as today.
