'use client'
import { useEffect, useRef, useState } from 'react'

const TAU = Math.PI * 2
const CYCLE_S = 15         // durée d'un cycle complet
const N_STARS  = 1400      // total étoiles (seeded + natif)
const TRAIL_LEN = 72       // segments de traînée

// ─── Helpers ─────────────────────────────────────────────────────────────────

class V2 { constructor(public x: number, public y: number) {} }
class V3 { constructor(public x: number, public y: number, public z: number) {} }

// ─── Star ────────────────────────────────────────────────────────────────────

class Star {
  private dx: number; private dy: number
  private spiralLocation: number; private strokeWeightFactor: number
  private z: number; private angle: number; private distance: number
  private rotationDirection: number; private expansionRate: number; private finalScale: number

  constructor(cameraZ: number, cameraTravelDistance: number) {
    this.angle            = Math.random() * TAU
    this.distance         = 30 * Math.random() + 15
    this.rotationDirection = Math.random() > 0.5 ? 1 : -1
    this.expansionRate    = 1.2 + Math.random() * 0.8
    this.finalScale       = 0.7 + Math.random() * 0.6
    this.dx               = this.distance * Math.cos(this.angle)
    this.dy               = this.distance * Math.sin(this.angle)
    this.spiralLocation   = (1 - Math.pow(1 - Math.random(), 3.0)) / 1.3
    const lo = 0.5 * cameraZ
    const hi = cameraTravelDistance + cameraZ
    this.z = lo + Math.random() * (hi - lo)
    this.z = this.z * 0.7 + (cameraTravelDistance / 2) * 0.3 * this.spiralLocation
    this.strokeWeightFactor = Math.pow(Math.random(), 1.3)
  }

  /** Returns screen-space {x,y,r} or null (behind camera / too small). */
  computeDot(p: number, c: AnimationController): { x: number; y: number; r: number } | null {
    const sp = c.spiralPath(this.spiralLocation)
    const q = p - this.spiralLocation
    if (q <= 0) return null

    const dp = Math.min(4 * q, 1)
    const linear  = dp
    const elastic = c.easeOutElastic(dp)
    const power   = dp * dp
    let easing: number
    if      (dp < 0.3) easing = linear  + (power   - linear)  * (dp / 0.3)
    else if (dp < 0.7) easing = power   + (elastic - power)   * ((dp - 0.3) / 0.4)
    else               easing = elastic

    let sx: number, sy: number
    if (dp < 0.3) {
      const t = easing / 0.3
      sx = sp.x + (sp.x + this.dx * 0.3 - sp.x) * t
      sy = sp.y + (sp.y + this.dy * 0.3 - sp.y) * t
    } else if (dp < 0.7) {
      const mp = (dp - 0.3) / 0.4
      const cs = Math.sin(mp * Math.PI) * this.rotationDirection * 1.5
      const bx = sp.x + this.dx * 0.3, by = sp.y + this.dy * 0.3
      const tx = sp.x + this.dx * 0.7, ty = sp.y + this.dy * 0.7
      sx = bx + (tx - bx) * mp + (-this.dy * 0.4 * cs) * mp
      sy = by + (ty - by) * mp + ( this.dx * 0.4 * cs) * mp
    } else {
      const fp  = (dp - 0.7) / 0.3
      const bx  = sp.x + this.dx * 0.7, by = sp.y + this.dy * 0.7
      const td  = this.distance * this.expansionRate * 1.5
      const sa  = this.angle + 1.2 * this.rotationDirection * fp * Math.PI
      sx = bx + (sp.x + td * Math.cos(sa) - bx) * fp
      sy = by + (sp.y + td * Math.sin(sa) - by) * fp
    }

    const vx = (this.z - c.cameraZ) * sx / c.viewZoom
    const vy = (this.z - c.cameraZ) * sy / c.viewZoom

    const sizeMult = dp < 0.6
      ? 1.0 + dp * 0.2
      : 1.2 + (this.finalScale - 1.2) * ((dp - 0.6) / 0.4)

    return c.project(new V3(vx, vy, this.z), 14 * this.strokeWeightFactor * sizeMult)
  }
}

// ─── Controller ──────────────────────────────────────────────────────────────

class AnimationController {
  private rafId    = 0
  private startMs  = 0
  public  time     = 0                    // 0→1 chaque cycle
  private camZNow  = 0                    // pré-calculé chaque frame

  private readonly ctx:  CanvasRenderingContext2D
  private readonly size: number
  private readonly stars: Star[] = []

  private readonly changeEventTime      = 0.32
  public  readonly cameraZ              = -400
  private readonly cameraTravelDistance = 3400
  private readonly startDotYOffset      = 28
  public  readonly viewZoom             = 240

  constructor(
    _canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    size: number,
  ) {
    this.ctx  = ctx
    this.size = size
    this.buildStars()
    this.tick = this.tick.bind(this)
    this.rafId = requestAnimationFrame(this.tick)
  }

  // ─── Étoiles ───────────────────────────────────────────────────────────────

  private buildStars() {
    // Passe 1 : random seeded (patterns déterministes)
    const orig = Math.random
    let seed = 1234
    Math.random = () => { seed = (seed * 9301 + 49297) % 233280; return seed / 233280 }
    for (let i = 0; i < N_STARS / 2; i++)
      this.stars.push(new Star(this.cameraZ, this.cameraTravelDistance))
    Math.random = orig
    // Passe 2 : random natif
    for (let i = 0; i < N_STARS / 2; i++)
      this.stars.push(new Star(this.cameraZ, this.cameraTravelDistance))
  }

  // ─── RAF loop ──────────────────────────────────────────────────────────────

  private tick(now: number) {
    if (!this.startMs) this.startMs = now
    this.time = ((now - this.startMs) / 1000 / CYCLE_S) % 1
    this.render()
    this.rafId = requestAnimationFrame(this.tick)
  }

  public destroy() { cancelAnimationFrame(this.rafId) }

  // ─── Maths ─────────────────────────────────────────────────────────────────

  public ease(p: number, g: number): number {
    return p < 0.5 ? 0.5 * Math.pow(2 * p, g) : 1 - 0.5 * Math.pow(2 * (1 - p), g)
  }

  public easeOutElastic(x: number): number {
    if (x <= 0) return 0
    if (x >= 1) return 1
    return Math.pow(2, -8 * x) * Math.sin((x * 8 - 0.75) * (TAU / 4.5)) + 1
  }

  public map(v: number, s1: number, e1: number, s2: number, e2: number): number {
    return s2 + (e2 - s2) * ((v - s1) / (e1 - s1))
  }

  public lerp(s: number, e: number, t: number): number { return s + (e - s) * t }

  public spiralPath(p: number): V2 {
    p = Math.min(1.2 * p, 1)
    p = this.ease(p, 1.8)
    const theta = TAU * 6 * Math.sqrt(p)
    const r     = 170 * Math.sqrt(p)
    return new V2(r * Math.cos(theta), r * Math.sin(theta) + this.startDotYOffset)
  }

  /** Projection 3D→2D. Pré-calculer camZNow avant d'appeler en boucle. */
  public project(pos: V3, sizeFactor: number): { x: number; y: number; r: number } | null {
    if (pos.z <= this.camZNow) return null
    const depth = pos.z - this.camZNow
    const r = 400 * sizeFactor / depth
    if (r < 0.35) return null
    return { x: this.viewZoom * pos.x / depth, y: this.viewZoom * pos.y / depth, r }
  }

  // ─── Rendu principal ───────────────────────────────────────────────────────

  private render() {
    const { ctx, size } = this

    // Fond
    ctx.fillStyle = '#100208'
    ctx.fillRect(0, 0, size, size)

    ctx.save()
    ctx.translate(size / 2, size / 2)

    const t1 = Math.max(0, Math.min(1, this.map(this.time, 0, this.changeEventTime + 0.25, 0, 1)))
    const t2 = Math.max(0, Math.min(1, this.map(this.time, this.changeEventTime, 1, 0, 1)))

    // Pré-calcul camera (1x par frame pour toutes les étoiles)
    this.camZNow = this.cameraZ + this.ease(Math.pow(t2, 1.2), 1.8) * this.cameraTravelDistance

    ctx.rotate(-Math.PI * this.ease(t2, 2.7))

    // Traînée (batching par groupe d'opacité)
    this.drawTrail(t1)

    // ── Étoiles : 1 seul ctx.fill() pour toutes ──
    ctx.fillStyle = '#FF85A1'
    ctx.beginPath()
    for (const star of this.stars) {
      const d = star.computeDot(t1, this)
      if (!d) continue
      ctx.moveTo(d.x + d.r, d.y)
      ctx.arc(d.x, d.y, d.r, 0, TAU)
    }
    ctx.fill()

    // Point central
    if (this.time > this.changeEventTime) {
      const dy = this.cameraZ * this.startDotYOffset / this.viewZoom
      const dot = this.project(new V3(0, dy, this.cameraTravelDistance), 2.5)
      if (dot) {
        ctx.fillStyle = '#FBCFE8'
        ctx.beginPath()
        ctx.arc(dot.x, dot.y, dot.r, 0, TAU)
        ctx.fill()
      }
    }

    // Halo rose central (léger)
    const grd = ctx.createRadialGradient(0, 20, 0, 0, 20, size * 0.25)
    grd.addColorStop(0, 'rgba(249,168,212,0.08)')
    grd.addColorStop(1, 'rgba(249,168,212,0)')
    ctx.fillStyle = grd
    ctx.fillRect(-size / 2, -size / 2, size, size)

    ctx.restore()
  }

  // ─── Traînée (3 groupes → 3 fill() au lieu de 90) ──────────────────────────

  private drawTrail(t1: number) {
    // Pré-calculer les constantes communes
    const sw0     = 1.3 * (1 - t1) + 4.5 * Math.sin(Math.PI * t1)
    const ep      = this.easeOutElastic(Math.sin(this.time * TAU) * 0.5 + 0.5)

    const groups = [
      { from: 0,              to: TRAIL_LEN * 0.28 | 0, color: '#FF6B9DFF' },
      { from: TRAIL_LEN * 0.28 | 0, to: TRAIL_LEN * 0.62 | 0, color: '#FF6B9DBB' },
      { from: TRAIL_LEN * 0.62 | 0, to: TRAIL_LEN,             color: '#F9A8D466' },
    ]

    for (const g of groups) {
      this.ctx.fillStyle = g.color
      this.ctx.beginPath()

      for (let i = g.from; i < g.to; i++) {
        const f  = this.map(i, 0, TRAIL_LEN, 1.1, 0.1)
        const sw = sw0 * f
        if (sw < 0.2) continue

        const pathTime = t1 - 0.00015 * i
        const pos = this.spiralPath(pathTime)

        // Légère rotation
        const ox = pos.x + 5, oy = pos.y + 5
        const mx = (pos.x + ox) / 2, my = (pos.y + oy) / 2
        const dx = pos.x - mx, dy = pos.y - my
        const angle = Math.atan2(dy, dx)
        const o     = i % 2 === 0 ? -1 : 1
        const r     = Math.sqrt(dx * dx + dy * dy)
        const rx    = mx + r * Math.cos(angle + o * Math.PI * ep)
        const ry    = my + r * Math.sin(angle + o * Math.PI * ep)

        this.ctx.moveTo(rx + sw / 2, ry)
        this.ctx.arc(rx, ry, sw / 2, 0, TAU)
      }
      this.ctx.fill()
    }
  }
}

// ─── Composant React ─────────────────────────────────────────────────────────

export function SpiralAnimation({ className = '' }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctrlRef   = useRef<AnimationController | null>(null)
  const [dims, setDims] = useState({ w: 0, h: 0 })

  useEffect(() => {
    const update = () => setDims({ w: window.innerWidth, h: window.innerHeight })
    update()
    window.addEventListener('resize', update)
    return () => window.removeEventListener('resize', update)
  }, [])

  useEffect(() => {
    if (!dims.w || !dims.h) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d', { alpha: false })   // alpha:false = perf boost
    if (!ctx) return

    const dpr  = window.devicePixelRatio || 1
    const size = Math.max(dims.w, dims.h)

    canvas.width  = size * dpr
    canvas.height = size * dpr
    canvas.style.width  = `${dims.w}px`
    canvas.style.height = `${dims.h}px`
    ctx.scale(dpr, dpr)

    ctrlRef.current?.destroy()
    ctrlRef.current = new AnimationController(canvas, ctx, size)

    return () => { ctrlRef.current?.destroy(); ctrlRef.current = null }
  }, [dims])

  return (
    <div className={`relative w-full h-full ${className}`}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  )
}
