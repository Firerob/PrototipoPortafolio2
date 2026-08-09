# Graph Report - PROTOTIPO PORTAFOLIO2  (2026-08-09)

## Corpus Check
- 62 files · ~33,731 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 326 nodes · 495 edges · 21 communities (17 shown, 4 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 10 edges (avg confidence: 0.69)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `77d166a0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Page & Content Sections
- Hero 3D Scene
- Project Card Orbit
- Dev Dependencies
- Runtime Dependencies
- GitHub Pages Deploy Workflow
- TypeScript Compiler Config
- Layout, Fluid BG & Scroll
- TS Include/Exclude Paths
- Orientation Gizmo HUD
- Fluid Simulation Types
- Playwright Capture Script
- JS Path Aliases
- Fluid Adapter Script
- Dithering Texture Concept
- Next.js Config
- PostCSS Config
- ArchivePlane.tsx
- HeroScene.tsx
- AboutSection.tsx
- SectionHeading.jsx

## God Nodes (most connected - your core abstractions)
1. `compilerOptions` - 17 edges
2. `phaseOf()` - 12 edges
3. `smootherstep()` - 11 edges
4. `Project` - 9 edges
5. `owner` - 8 edges
6. `archiveScroll` - 8 edges
7. `include` - 8 edges
8. `build job` - 8 edges
9. `usePointerVector()` - 7 edges
10. `projects` - 6 edges

## Surprising Connections (you probably didn't know these)
- `PlaneLayout` --references--> `Project`  [EXTRACTED]
  components/archive/ArchivePlane.tsx → types/project.ts
- `ArchiveSection()` --indirect_call--> `subscribeTheme()`  [INFERRED]
  components/archive/ArchiveSection.tsx → lib/archiveScroll.ts
- `ProjectRowProps` --references--> `Project`  [EXTRACTED]
  components/index/ProjectRow.tsx → types/project.ts
- `NewsCardProps` --references--> `NewsItem`  [EXTRACTED]
  components/news/NewsCard.tsx → types/news.ts
- `NewsModalProps` --references--> `NewsItem`  [EXTRACTED]
  components/news/NewsModal.tsx → types/news.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **GitHub Pages Static-Export Deployment Pipeline** — github_workflows_deploy_build_job, github_workflows_deploy_actions_upload_pages_artifact, github_workflows_deploy_deploy_job, github_workflows_deploy_actions_deploy_pages [EXTRACTED 1.00]
- **OIDC-based Pages Deployment Authorization** — github_workflows_deploy_permissions, github_workflows_deploy_actions_deploy_pages, github_workflows_deploy_github_pages_environment [INFERRED 0.85]

## Communities (21 total, 4 thin omitted)

### Community 0 - "Page & Content Sections"
Cohesion: 0.07
Nodes (25): ContactFormProps, Errors, Phase, ContactSection(), CopyEmailProps, CopyState, LiveClock(), LiveClockProps (+17 more)

### Community 1 - "Hero 3D Scene"
Cohesion: 0.19
Nodes (19): ArchiveGallery(), ArchiveGalleryProps, ArchiveSection(), wavePath(), WaveTransition(), BackdropWord(), SpotGlow(), archiveScroll (+11 more)

### Community 2 - "Project Card Orbit"
Cohesion: 0.18
Nodes (18): dateFormatter, ProjectsOrbit(), ENTRY, OrbitCards(), slot, makeOrbitCardUniforms(), OrbitCardUniforms, assemblyFraction() (+10 more)

### Community 3 - "Dev Dependencies"
Cohesion: 0.08
Nodes (25): devDependencies, playwright, postcss, tailwindcss, @tailwindcss/postcss, @types/node, @types/react, @types/react-dom (+17 more)

### Community 4 - "Runtime Dependencies"
Cohesion: 0.10
Nodes (21): framer-motion, gsap, lenis, lucide-react, next, dependencies, framer-motion, gsap (+13 more)

### Community 5 - "GitHub Pages Deploy Workflow"
Cohesion: 0.10
Nodes (21): actions/checkout@v4, actions/configure-pages@v5, actions/deploy-pages@v4, actions/setup-node@v4 (node 20, npm cache), actions/upload-pages-artifact@v3 (path: ./out), Subpath base path needed because repo is not <owner>.github.io, build job, Build static export (npm run build) (+13 more)

### Community 6 - "TypeScript Compiler Config"
Cohesion: 0.06
Nodes (31): .claude, dom, dom.iterable, ES2022, **/*.js, **/*.jsx, .next/dev/types/**/*.ts, next-env.d.ts (+23 more)

### Community 7 - "Layout, Fluid BG & Scroll"
Cohesion: 0.17
Nodes (9): metadata, plexMono, plexSans, viewport, FluidBackground(), FluidBackgroundProps, SmoothScroll(), fluidBackgroundConfig (+1 more)

### Community 8 - "TS Include/Exclude Paths"
Cohesion: 0.16
Nodes (12): dateFormatter, NewsCard(), NewsCardProps, stamp(), NewsFiltersProps, dateFormatter, NewsModalProps, news (+4 more)

### Community 9 - "Orientation Gizmo HUD"
Cohesion: 0.31
Nodes (9): AXES, basisFromQuaternion(), OrientationGizmo(), bindPointer(), handleLeave(), handleMove(), orientation, pointer (+1 more)

### Community 11 - "Playwright Capture Script"
Cohesion: 0.40
Nodes (4): interesting, logs, progress, steps

### Community 12 - "JS Path Aliases"
Cohesion: 0.50
Nodes (3): compilerOptions, baseUrl, paths

### Community 13 - "Fluid Adapter Script"
Cohesion: 0.50
Nodes (3): grab(), Turn tkabalin/WebGL-Fluid-Background's standalone script into an ES module with, 1-indexed inclusive line range.

### Community 14 - "Dithering Texture Concept"
Cohesion: 1.00
Nodes (3): Banding Artifact Mitigation in Fluid Rendering, LDR_LLL1_0.png Dithering/Blue-Noise Texture, WebGL Fluid Simulation Background (adapted from PavelDoGreat/tkabalin)

### Community 17 - "ArchivePlane.tsx"
Cohesion: 0.18
Nodes (7): PlaneLayout, ProjectRowProps, ORIGIN, OrbitCardsProps, projects, Project, QuaternionLike

### Community 18 - "HeroScene.tsx"
Cohesion: 0.14
Nodes (15): CurvedGrid(), Prism(), scratchEuler, targetQuat, BackdropCanvasProps, BackdropLayer(), CameraRig(), HeroSceneProps (+7 more)

### Community 19 - "AboutSection.tsx"
Cohesion: 0.13
Nodes (9): AboutSectionProps, ProfileCard3DProps, ScrambleText(), ScrambleTextProps, Stat, StatCounterProps, TechItem, TechStackProps (+1 more)

## Knowledge Gaps
- **113 isolated node(s):** `plexSans`, `plexMono`, `metadata`, `viewport`, `AboutSectionProps` (+108 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `owner` connect `Page & Content Sections` to `AboutSection.tsx`, `Layout, Fluid BG & Scroll`?**
  _High betweenness centrality (0.033) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Runtime Dependencies` to `Dev Dependencies`?**
  _High betweenness centrality (0.013) - this node is a cross-community bridge._
- **What connects `plexSans`, `plexMono`, `metadata` to the rest of the system?**
  _113 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Page & Content Sections` be split into smaller, more focused modules?**
  _Cohesion score 0.07308970099667775 - nodes in this community are weakly interconnected._
- **Should `Dev Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.07692307692307693 - nodes in this community are weakly interconnected._
- **Should `Runtime Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.09523809523809523 - nodes in this community are weakly interconnected._
- **Should `GitHub Pages Deploy Workflow` be split into smaller, more focused modules?**
  _Cohesion score 0.10476190476190476 - nodes in this community are weakly interconnected._