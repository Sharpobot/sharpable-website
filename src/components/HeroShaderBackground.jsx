import { useEffect, useRef } from 'react'

// Original WebGL background: an animated grey domain-warped flow noise (an fbm swirl, the same
// general technique as classic "flow field" shaders) with a gold glow that trails the cursor with
// a bit of momentum. Built from scratch — not a port of any third-party shader — after the
// shaders.com library used in the reference project turned out to require a paid commercial
// license this project doesn't hold. Colors are the site's own tokens (deep/background greys,
// primary gold), not the reference's white/orange scheme.

const VERTEX_SRC = `
attribute vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}
`

const TRAIL_LENGTH = 8

const FRAGMENT_SRC = `
precision highp float;
uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uTrail[${TRAIL_LENGTH}];
uniform float uHover;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 5; i++) {
    v += amp * noise(p);
    p *= 2.02;
    amp *= 0.5;
  }
  return v;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = uv;
  p.x *= aspect;

  vec2 q = vec2(
    fbm(p * 1.6 + uTime * 0.045),
    fbm(p * 1.6 + vec2(5.2, 1.3) + uTime * 0.038)
  );
  vec2 r = vec2(
    fbm(p * 1.6 + 3.4 * q + vec2(1.7, 9.2) + uTime * 0.03),
    fbm(p * 1.6 + 3.4 * q + vec2(8.3, 2.8) + uTime * 0.032)
  );
  float n = fbm(p * 1.4 + 3.2 * r);

  vec3 greyDeep = vec3(0.05, 0.05, 0.06);
  vec3 greyCharcoal = vec3(0.14, 0.14, 0.165);
  vec3 greyLight = vec3(0.32, 0.32, 0.355);
  vec3 base = mix(greyDeep, greyCharcoal, smoothstep(0.12, 0.5, n));
  base = mix(base, greyLight, smoothstep(0.56, 0.88, n) * 0.75);

  // The same fbm shape re-mapped through a gold palette instead of grey, so the region near the
  // cursor reads as the material itself shifting color — not a light shining on top of it. Anchored
  // to the site's own tokens (primary-dark/primary/primary-light) so even the shadow end stays a
  // recognizable gold rather than sliding toward a muddy brown.
  vec3 goldDeep = vec3(0.4, 0.3, 0.03);
  vec3 goldMid = vec3(0.941, 0.702, 0.0);
  vec3 goldBright = vec3(1.0, 0.867, 0.439);
  vec3 goldTone = mix(goldDeep, goldMid, smoothstep(0.12, 0.5, n));
  goldTone = mix(goldTone, goldBright, smoothstep(0.56, 0.88, n) * 0.85);

  // A short comet trail rather than a single glowing dot: uTrail holds the last ${TRAIL_LENGTH}
  // eased cursor positions (newest first), each contributing a plain circular glow that shrinks and
  // fades further back in the array — so the highlight visibly streaks behind the cursor's motion
  // instead of just following it as one static shape.
  float mask = 0.0;
  for (int i = 0; i < ${TRAIL_LENGTH}; i++) {
    vec2 tp = uTrail[i];
    tp.x *= aspect;
    float d = length(p - tp);
    float fi = float(i);
    float weight = pow(0.72, fi);
    float radius = mix(0.34, 0.16, fi / float(${TRAIL_LENGTH} - 1));
    float m = smoothstep(radius, 0.0, d);
    mask = max(mask, m * m * weight);
  }
  mask *= uHover;
  vec3 color = mix(base, goldTone, mask);

  float vignette = smoothstep(1.05, 0.35, length(uv - 0.5));
  color *= mix(0.85, 1.0, vignette);

  gl_FragColor = vec4(color, 1.0);
}
`

function compileShader(gl, type, source) {
  const shader = gl.createShader(type)
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

export default function HeroShaderBackground() {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
    if (!gl) return

    const vertexShader = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SRC)
    const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SRC)
    if (!vertexShader || !fragmentShader) return

    const program = gl.createProgram()
    gl.attachShader(program, vertexShader)
    gl.attachShader(program, fragmentShader)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return
    gl.useProgram(program)

    const positionBuffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW
    )
    const aPosition = gl.getAttribLocation(program, 'aPosition')
    gl.enableVertexAttribArray(aPosition)
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0)

    const uResolution = gl.getUniformLocation(program, 'uResolution')
    const uTime = gl.getUniformLocation(program, 'uTime')
    const uTrail = gl.getUniformLocation(program, 'uTrail')
    const uHover = gl.getUniformLocation(program, 'uHover')

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const state = {
      mouseTarget: [0.5, 0.35],
      mouse: [0.5, 0.35],
      trail: Array.from({ length: TRAIL_LENGTH }, () => [0.5, 0.35]),
      hoverTarget: 0,
      hover: 0,
      width: 0,
      height: 0,
    }
    const trailBuffer = new Float32Array(TRAIL_LENGTH * 2)

    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      state.width = Math.max(1, Math.round(rect.width * dpr))
      state.height = Math.max(1, Math.round(rect.height * dpr))
      canvas.width = state.width
      canvas.height = state.height
      gl.viewport(0, 0, state.width, state.height)
    }
    resize()
    window.addEventListener('resize', resize)

    // Listened on window (not the canvas) because the hero's text content sits visually on top of
    // the canvas and would otherwise intercept pointer events before they ever reach it — the glow
    // needs to track the cursor across the whole hero, including where the headline covers it.
    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = 1 - (e.clientY - rect.top) / rect.height
      const within = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom
      state.hoverTarget = within ? 1 : 0
      if (within) state.mouseTarget = [x, y]
    }
    const onPointerLeaveDoc = () => { state.hoverTarget = 0 }
    window.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerleave', onPointerLeaveDoc)

    let rafId = null
    let start = performance.now()

    const render = (now) => {
      const t = (now - start) / 1000
      // Momentum: the glow eases toward the real pointer position rather than snapping to it.
      state.mouse[0] += (state.mouseTarget[0] - state.mouse[0]) * 0.07
      state.mouse[1] += (state.mouseTarget[1] - state.mouse[1]) * 0.07
      state.hover += (state.hoverTarget - state.hover) * 0.08

      // Trail: each frame's eased position gets pushed onto a short history, so the comet tail is
      // built from where the (already-lagging) glow has recently been, not just the live cursor.
      state.trail.pop()
      state.trail.unshift([state.mouse[0], state.mouse[1]])
      for (let i = 0; i < TRAIL_LENGTH; i++) {
        trailBuffer[i * 2] = state.trail[i][0]
        trailBuffer[i * 2 + 1] = state.trail[i][1]
      }

      gl.uniform2f(uResolution, state.width, state.height)
      gl.uniform1f(uTime, t)
      gl.uniform2fv(uTrail, trailBuffer)
      gl.uniform1f(uHover, state.hover)
      gl.drawArrays(gl.TRIANGLES, 0, 3)

      if (!reducedMotion) rafId = requestAnimationFrame(render)
    }

    if (reducedMotion) {
      render(start)
    } else {
      rafId = requestAnimationFrame(render)
    }

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerleave', onPointerLeaveDoc)
    }
  }, [])

  return <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />
}
