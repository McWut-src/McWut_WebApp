# McWut — Creative & Interactive UI Ideas

**Created:** 26 October 2026  
**Companion docs:** [AGENT.md](AGENT.md), [SCOPE.md](SCOPE.md), [HANDOFF.md](HANDOFF.md)

---

## Overview

A curated catalog of creative, non-3D-exclusive JavaScript libraries evaluated for future visual, interactive, audio, and client-side intelligence enhancements in McWut (e.g., Messages, Doodle Canvas, Voice notes, Story Reader, Profile personalizations, and URLs).

---

## 🎨 Creative Coding & Generative Art

*Use cases: Digital art, canvas manipulation, vector illustrations, and procedural pattern generation.*

| Library | Primary Focus | Strengths & Capabilities | Potential McWut Application |
|---|---|---|---|
| **p5.js** | Generative art & creative coding | Beginner-friendly canvas API, rich mathematical drawing routines, built-in mouse/touch interaction. | Interactive doodle playground, custom avatar generator, procedural background pattern generator for user profiles. |
| **Two.js** | 2D vector graphics | Renderer-agnostic (Canvas, SVG, WebGL output from one API); focuses strictly on 2D shapes and curves. | Vector stickers and motifs, scalable icons, lightweight vector drawing tools. |
| **Paper.js** | Vector graphics scripting | Built-in Vector Geometry Engine; computes path intersections, curves, smoothing, and segment manipulations. | Advanced drawing tools in Messages doodle canvas (path smoothing, bezier drawing, shape merging). |

---

## 🏃 Performance Animation & Timelines

*Use cases: Micro-interactions, timeline sequencing, SVG morphing, and fluid layout transitions.*

| Library | Primary Focus | Strengths & Capabilities | Potential McWut Application |
|---|---|---|---|
| **GSAP** (GreenSock) | Professional timeline animation | High performance, multi-step sequencing, scroll triggers, SVG morphing, zero-jank frame rates. | Seamless card transitions, celebratory confetti/sticker animations in Messages, animated story slideshows. |
| **Anime.js** | Lightweight UI animations | Clean API for animating CSS properties, SVG attributes, DOM nodes, and JS objects with tiny footprint. | Smooth menu toggles, notification badges, micro-interactions on icons and pills. |
| **Framer Motion** | Gesture & layout animation | Declarative layout transitions, spring physics, drag/hover gestures, mount/unmount animations (React-oriented). | Reference for spring-physics interactions and drag-to-dismiss patterns. |

---

## 🍏 2D Physics & Simulations

*Use cases: Realistic gravity, bounce, friction, cloth simulations, and high-density particle systems.*

| Library | Primary Focus | Strengths & Capabilities | Potential McWut Application |
|---|---|---|---|
| **Matter.js** | 2D rigid body physics | Full physics engine with gravity, collision detection, friction, bouncing, constraints, and ragdolls. | Playful chat interactions (e.g., dropped stickers bounce and settle at the bottom of a thread), interactive Easter eggs. |
| **PixiJS** | High-performance 2D rendering | Fast WebGL 2D sprite batching; effortlessly renders thousands of moving objects at 60+ FPS. | Heavy particle effects (floating bubbles, falling snow, fireworks celebrations) without taxing CPU. |

---

## 🛠️ Interactive Data & Node Graphs

*Use cases: Visual programming, interactive knowledge maps, file relations, and network visualizations.*

| Library | Primary Focus | Strengths & Capabilities | Potential McWut Application |
|---|---|---|---|
| **D3.js** | Data-driven DOM manipulation | Binding data to SVGs/Canvas, force-directed graphs, custom data visualizations, and geographical maps. | Visual network map of member-shared files, file timeline history, audit activity graphs. |
| **Rete.js / Litegraph.js** | Node-based visual editors | Visual graph/node editor (like Blender Shader nodes or Unreal Blueprints). | Visual automation builder (e.g., file trigger -> auto-share -> notify), or visual prompt chains for AI. |

---

## 🔊 Web Audio, Music, & Sound Synthesis

*Use cases: Synthesized chimes, musical instruments, sound effects, audio spatialization, and frequency visualization.*

| Library | Primary Focus | Strengths & Capabilities | Potential McWut Application |
|---|---|---|---|
| **Tone.js** | Browser music creation & synthesis | High-level synth voices (FM, AM, synth drums), sequencers, effects (reverb, delay), master timeline. | Expanding McWut's 5 Web Audio chime themes into user-customizable synth tones and notification chimes. |
| **Howler.js** | Cross-browser audio playback | Rock-solid audio sprite management, auto-caching, volume/spatial panning, seamless format fallbacks. | Glitch-free playback of recorded voice memos and walkie-talkie notes across all mobile browsers. |
| **Meyda** | Real-time audio feature extraction | Extracts pitch, loudness, spectrum, and rhythm from microphone or media stream in real time. | Audio visualizer wave ripples during voice memo recording; rhythm-reactive chat stickers. |

---

## 👁️ Computer Vision, Face Tracking, & AI

*Use cases: Zero-server webcam ML, gesture detection, face landmark tracking, and local client-side computer vision.*

| Library | Primary Focus | Strengths & Capabilities | Potential McWut Application |
|---|---|---|---|
| **MediaPipe** (Google) | High-speed client-side ML | Hand gesture recognition, 3D face mesh, body pose tracking running completely in-browser via WebAssembly/GPU. | Touchless gesture controls (e.g., wave hand to advance photos in full screen), fun hand-drawn AR stickers. |
| **Face-api.js** | Face recognition & landmark detection | Built on TensorFlow.js; detects faces, facial landmarks (eyes, nose, mouth), and expression classification. | Local-only auto-cropping of profile pictures to faces; emotion-based emoji picker shortcuts. |
| **Tracking.js** | Lightweight computer vision | Pure JS, no heavy weights; color tracking and basic feature detection. | Simple color-tracking camera games or color-sampler tools for themes. |

---

## 📜 Creative Typography & Text Layouts

*Use cases: Kinetic typography, encrypted/glitch text reveal, and vector font glyph manipulation.*

| Library | Primary Focus | Strengths & Capabilities | Potential McWut Application |
|---|---|---|---|
| **Splitting.js** | Element & text splitting | Splits text into individual characters/words via CSS variables for fine-grained animation control. | Dramatic title animations in Story reader; dynamic entrance effects for hero banners. |
| **Baffle.js** | Text obfuscation & glitch reveal | Scrambles and smoothly reveals text with cyber/matrix character cycling. | Revealing sensitive info in Password Vault (unmasking passwords or share tokens with a tech flair). |
| **Opentype.js** | Direct font file path extraction | Reads OTF/TTF files and exposes vector glyph paths directly on HTML5 Canvas / SVG. | Custom monogram/initial emblem generation for member profile avatars. |

---

## 🪄 Creative UI Layouts & Immersive Scrolling

*Use cases: Cinematic scrolling, smooth dragging physics, and viewport interactions.*

| Library | Primary Focus | Strengths & Capabilities | Potential McWut Application |
|---|---|---|---|
| **Lenis** | Modern smooth scroll | High-performance, lightweight smooth scrolling that maintains native `position: sticky` and accessibility. | Polished, fluid reading experience across long stories or markdown documents. |
| **Locomotive Scroll** | Parallax & viewport scrolling | Built-in parallax effects, element viewport enter/leave triggers, and scroll-direction monitoring. | Cinematic photo gallery walkthroughs or timeline storytelling. |
| **Dragabilly** | Draggable physics | Lightweight touch & mouse dragging with physics-based constraints and boundaries. | Floating sticky notes, movable sticker placement over shared photos, custom draggable panels. |

---

## Evaluation & Recommended Next Steps for McWut

When picking candidate libraries to adopt in future cycles, prioritize:
1. **Zero External Dependencies / Minimal Bundle Size**: Lightweight vanilla JS libraries (like `Anime.js`, `Baffle.js`, or native Web Audio) preserve McWut's fast cold start and light footprint.
2. **Privacy & Offline First**: Client-side libraries (like `MediaPipe` or `Howler.js`) run entirely in the browser without uploading media to third parties, aligning with McWut's private family vault architecture.
3. **High-Impact Quick Wins**:
   - `Baffle.js` for password vault unmasking / secret tokens.
   - `Tone.js` / Web Audio expansion for customizable notification chimes.
   - `Paper.js` / `Two.js` smoothing algorithms for the Messages doodle pad.

---

## ⚡ Modernizing the ASP.NET Frontend Experience

*Techniques and lightweight libraries to eliminate the classic "default ASP.NET / Bootstrap" look without replacing Razor Pages or rewriting C# controllers.*

### 1. Eliminating Full-Page White Flash (SPA-Like Navigation)
- **Swup.js** or **Barba.js**: Intercepts link clicks and form submits via `fetch`, transitioning between Razor views with smooth cross-fades or slide animations. Keeps the backend 100% ASP.NET Core Razor Pages while feeling like a native iOS/desktop app.
- **htmx**: Enables declarative AJAX (`hx-get`, `hx-target`, `hx-swap`) directly on buttons and inputs to swap partial Razor views without full-page reloads.

### 2. Zero-Config List & DOM Animations
- **@formkit/auto-animate** (~2 KB): Added to a container (`autoAnimate(el)`), it automatically animates item additions, deletions, and sorting with smooth spring physics. Ideal for My files list (`/files`), URLs list (`/urls`), and chat message bubbles.

### 3. Lightweight Declarative Interactions
- **Alpine.js**: Embedded directly in Razor markup (`x-data`, `x-show`, `x-transition`) for smooth modal popups, sliding drawers, and dropdowns without needing React or Vue build steps.
- **Floating UI**: Smooth, collision-aware floating tooltips, popovers, and contextual menus.

### 4. Interactive Layouts & Draggable Controls
- **SortableJS**: Fluid drag-and-drop reordering with touch support for files, photo galleries, or dashboard shortcut cards.
- **Muuri / Masonry**: Animated masonry grid layouts for photos, stories, and saved notes.

### 5. Visual Styling & Modern Depth
- **Glassmorphism & Depth**: Subtle borders (`border: 1px solid rgba(255, 255, 255, 0.12)`), soft multi-layer box shadows, and `backdrop-filter: blur(12px)`.
- **Skeleton Placeholders**: Pulsing skeleton cards (`@keyframes pulse`) during async loading or SQL wake-up cycles instead of blank white frames.
- **Canvas Confetti**: Celebratory micro-bursts upon saving stories, sending invites, or clearing unread threads.

