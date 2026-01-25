# Client Architecture Plan

## Requirements Summary

| Requirement | Priority | Notes |
|-------------|----------|-------|
| Game preview window | Must | Live Phaser game running in iframe |
| Code editor | Must | Readonly minimum, editable preferred |
| WebContainer | Must | Run Vite + Phaser in browser |
| Mobile support | Must | iPad, iPhone, responsive web |
| iOS App Store | Must | Native app via Capacitor, publishable |

---

## Technology Decisions

### Framework: **React + Vite**

**Why not React Native / Expo?**
- WebContainer API only works in browser (no native)
- Monaco Editor has limited RN support
- Game preview requires iframe/WebView
- Would need separate codebases anyway

**Strategy**: Build responsive web app, wrap in Capacitor for native if needed later.

### UI Framework: **TailwindCSS + shadcn/ui**

- Mobile-first responsive design
- Touch-friendly components
- Consistent design system
- Small bundle size

### Code Editor: **CodeMirror 6**

| Feature | Monaco | CodeMirror 6 |
|---------|--------|--------------|
| Mobile support | ❌ Poor | ✅ Excellent |
| Bundle size | ~2MB | ~200KB |
| Touch editing | ❌ | ✅ |
| Readonly mode | ✅ | ✅ |
| Syntax highlighting | ✅ | ✅ |
| TypeScript support | ✅ Native | ✅ Via extension |

**Decision**: CodeMirror 6 for mobile compatibility. Can add Monaco as optional for desktop power users later.

### WebContainer: **@webcontainer/api**

- Runs Node.js in browser via WebAssembly
- Supports Vite dev server
- File system API matches our patch protocol
- Works on modern browsers (Chrome, Edge, Safari 16.4+)

**Mobile limitation**: WebContainer requires SharedArrayBuffer, which needs:
- HTTPS with proper COOP/COEP headers
- Safari 16.4+ (iOS 16.4+, ~85% iOS devices)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Client App                           │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   Prompt    │  │    Code     │  │    Game Preview     │  │
│  │   Input     │  │   Editor    │  │    (iframe)         │  │
│  │             │  │ (CodeMirror)│  │                     │  │
│  └─────────────┘  └─────────────┘  └─────────────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                     State Management                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌─────────────┐  │
│  │ Session  │  │  Files   │  │  Agent   │  │  Preview    │  │
│  │  Store   │  │  Store   │  │  Events  │  │   State     │  │
│  └──────────┘  └──────────┘  └──────────┘  └─────────────┘  │
├─────────────────────────────────────────────────────────────┤
│                    WebSocket Client                          │
│              (connects to game-agent server)                 │
├─────────────────────────────────────────────────────────────┤
│                     WebContainer                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Virtual FS  →  Vite Dev Server  →  Phaser Game      │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

---

## Component Design

### 1. Layout (Mobile-First)

```
Desktop (>1024px)                      Mobile (<768px)
┌──────────────┬───────────────────┐   ┌─────────────────────┐
│              │                   │   │  [Preview ⇄ Editor] │
│   Prompt     │  Preview/Editor   │   │   (toggle button)   │
│   Panel      │  (toggle view)    │   │                     │
│   (pinned)   │                   │   │   Full workspace    │
│              │   ┌─────────────┐ │   │   area              │
│  - Input     │   │ Toggle:     │ │   │                     │
│  - Messages  │   │ Preview|Code│ │   ├─────────────────────┤
│  - Status    │   └─────────────┘ │   │  Prompt (floating)  │
│              │                   │   │  ↕ half-hideable    │
└──────────────┴───────────────────┘   └─────────────────────┘
```

**Desktop:**
- Left panel: Prompt input + message history + agent status (vertical, pinned)
- Right area: Preview OR Editor (toggle button to switch, one visible at a time)
- File tree: collapsible sidebar or dropdown

**Mobile:**
- Main area: Preview OR Editor (toggle button to switch)
- Bottom floating panel: Prompt input + messages
- Half-hideable: drag down to minimize prompt panel, show only input bar
- Swipe or button to toggle Preview ⇄ Editor

### 2. Core Components

```
src/
├── components/
│   ├── layout/
│   │   ├── AppShell.tsx           # Main responsive layout
│   │   ├── PromptPanel.tsx        # Left panel (desktop) / bottom sheet (mobile)
│   │   ├── WorkspaceArea.tsx      # Right area with toggle
│   │   └── ViewToggle.tsx         # Preview ⇄ Editor toggle button
│   ├── editor/
│   │   ├── CodeEditor.tsx         # CodeMirror wrapper
│   │   ├── FileTree.tsx           # File browser (collapsible)
│   │   └── FileTabs.tsx           # Open file tabs
│   ├── preview/
│   │   ├── GamePreview.tsx        # Iframe container
│   │   ├── PreviewControls.tsx    # Refresh, fullscreen, export
│   │   └── ConsolePanel.tsx       # Game console output
│   ├── prompt/
│   │   ├── PromptInput.tsx        # Chat-style input
│   │   ├── AgentStatus.tsx        # Loading, thinking indicators
│   │   ├── MessageList.tsx        # Vertical message history
│   │   └── BottomSheet.tsx        # Mobile half-hideable container
│   └── ui/                        # shadcn components
├── hooks/
│   ├── useWebSocket.ts          # Server connection
│   ├── useWebContainer.ts       # WebContainer lifecycle
│   ├── useFileSystem.ts         # Virtual FS operations
│   └── useSession.ts            # Session state
├── stores/
│   ├── session.ts               # Zustand session store
│   ├── files.ts                 # File state
│   └── preview.ts               # Preview state
└── lib/
    ├── ws-client.ts             # WebSocket protocol client
    ├── webcontainer.ts          # WebContainer setup
    └── patch.ts                 # File patch application
```

### 3. WebContainer Integration

```typescript
// Lifecycle
1. Boot WebContainer on session start
2. Write template files from server snapshot
3. Run `npm install` (or use pre-bundled deps)
4. Start Vite dev server
5. Embed preview URL in iframe
6. Apply patches as they arrive from server
7. Vite HMR auto-reloads preview

// File sync flow
Server fs/patch → WebSocket → applyPatch() → WebContainer.fs → Vite HMR → Preview
```

### 4. State Management

**Zustand** for simplicity and React 18 compatibility:

```typescript
interface SessionStore {
  sessionId: string | null
  engineId: string
  status: 'idle' | 'connecting' | 'running' | 'error'
  connect: (engineId: string) => Promise<void>
  disconnect: () => void
}

interface FileStore {
  files: Map<string, string>
  selectedFile: string | null
  applyPatch: (patch: FsPatch) => void
  selectFile: (path: string) => void
}

interface PreviewStore {
  url: string | null
  status: 'booting' | 'installing' | 'running' | 'error'
  logs: LogEntry[]
  refresh: () => void
}
```

---

## Mobile-Specific Considerations

### Touch Interactions

| Action | Desktop | Mobile |
|--------|---------|--------|
| Edit code | Click + type | Tap + keyboard |
| Scroll code | Mouse wheel | Touch scroll |
| Select text | Click + drag | Long press + handles |
| Resize panels | Drag divider | Swipe between tabs |
| View preview | Side panel | Full tab / overlay |

### Performance

- **Lazy load** CodeMirror and WebContainer
- **Virtualized** file tree for large projects
- **Debounced** patch application
- **Service Worker** for offline template caching

### iOS Safari Limitations

1. **SharedArrayBuffer**: Requires iOS 16.4+ and COOP/COEP headers
2. **Keyboard**: Use `visualViewport` API for proper layout
3. **Fullscreen**: Use CSS `env(safe-area-inset-*)` for notch
4. **Memory**: May need to limit WebContainer file count

---

## Server Headers Required

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

These enable SharedArrayBuffer for WebContainer.

---

## Package Dependencies

```json
{
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "@webcontainer/api": "^1.2.0",
    "@codemirror/state": "^6.4.0",
    "@codemirror/view": "^6.26.0",
    "@codemirror/lang-javascript": "^6.2.0",
    "@codemirror/lang-html": "^6.4.0",
    "@codemirror/lang-css": "^6.2.0",
    "@codemirror/lang-json": "^6.0.0",
    "zustand": "^4.5.0",
    "tailwindcss": "^3.4.0",
    "@radix-ui/react-tabs": "^1.0.0",
    "@radix-ui/react-dialog": "^1.0.0",
    "lucide-react": "^0.400.0",
    "clsx": "^2.1.0"
  },
  "devDependencies": {
    "vite": "^5.4.0",
    "@vitejs/plugin-react": "^4.3.0",
    "typescript": "^5.5.0"
  }
}
```

---

## Milestones

### Phase 1: Core Web Client (MVP)
- [ ] Project setup (Vite + React + Tailwind)
- [ ] WebSocket client connecting to server
- [ ] WebContainer boot and file sync
- [ ] Basic game preview in iframe
- [ ] Prompt input and agent status display
- [ ] Readonly code viewer

### Phase 2: Enhanced Editor
- [ ] CodeMirror integration with syntax highlighting
- [ ] File tree navigation
- [ ] Editable mode (patches sent to server)
- [ ] Multi-file tabs

### Phase 3: Mobile Polish
- [ ] Responsive layout with tab navigation
- [ ] Touch-optimized code editing
- [ ] Full-screen preview mode
- [ ] iOS Safari testing and fixes

### Phase 4: iOS App Store Release
- [ ] Capacitor setup for iOS
- [ ] WKWebView configuration for WebContainer support
- [ ] Native keyboard handling
- [ ] Safe area insets for notch/Dynamic Island
- [ ] App icons, splash screens, metadata
- [ ] Apple Developer account & provisioning
- [ ] TestFlight beta testing
- [ ] App Store submission & review

**Capacitor iOS Considerations:**
- WKWebView supports SharedArrayBuffer (iOS 16.4+)
- Need to configure `capacitor.config.ts` with proper COOP/COEP headers
- May need custom Capacitor plugin for file export (share sheet)
- Minimum iOS deployment target: 16.4

---

## Answered Questions

| Question | Decision |
|----------|----------|
| Offline support | ✅ Yes - allow editing without server |
| Collaboration | ✅ Plan for it - multiple users on same session |
| Export | ✅ Must have - download project as zip |
| History | TBD - undo/redo across agent changes |
| Templates | TBD - user-selectable game templates |
