# Braindump UI Design Guide

## Product Vision
Braindump should feel like a living notebook for teams.

It is not a chaotic whiteboard and not a rigid document editor.
It is a calm, aesthetic, organized thinking surface where messy ideas can be captured instantly and then shaped into clear direction.

Core feeling:
- Pastel and warm
- Academic and focused
- Dynamic and playful
- Beautiful enough to enjoy using
- Structured enough to trust under pressure

## Design North Star
Chaos in, clarity out.

Every UI decision should help users do three things:
1. Capture thoughts fast
2. See connections clearly
3. Decide what to do next

## Brand Character
Braindump personality should feel like:
- A neat research journal
- A modern design studio wall
- A thought map that gently self-organizes

Never feel like:
- Corporate dashboard overload
- Childish sticky-note toy
- Generic productivity SaaS clone

## Visual Language
The app should look like a brain map:
- Notes are nodes
- Relationships are threads
- Related ideas form islands
- Islands form the bigger picture of the team mind

Visual style:
- Soft rounded geometry
- Airy spacing
- Light depth with subtle shadows
- Thread lines that curve naturally
- Layered surfaces with pastel accents

## Layout System
Use a 5-zone shell for the core product.

1. Top Command Bar
- Workspace title
- Search
- Undo/redo
- Mode switch (Visionary / Builder)
- Synthesize button (primary CTA)
- Collaboration avatars

2. Left Capture Rail
- Quick add text note
- Voice memo
- Image/photo
- Sketch
- Link
- Code snippet

3. Center Infinite Canvas
- Main thinking space
- Pan and zoom
- Multi-select
- Node creation/editing
- Thread connections
- Island clustering

4. Right Context Panel
- Selected note details
- Tags and category
- Connection labels
- Comments
- Suggested links

5. Bottom Utility Bar
- Zoom controls
- Minimap
- Filter chips
- Island visibility controls

## Primary Screens

### 1) Workspace Home
Purpose: Start quickly and return to active boards.

Contains:
- Recent boards grid
- New board button
- Template picker
- Team activity strip

Tone:
- Clean and minimal
- Strong typography and spacing
- Soft pastel card accents

### 2) Main Canvas
Purpose: Real-time multi-modal thinking.

Contains:
- Node and thread system
- Islands
- Presence indicators
- Inspector panel
- Synthesize action

Tone:
- Bright and breathable
- Organized despite high input volume
- Dynamic without visual noise

### 3) Synthesis View
Purpose: Convert board chaos into a structured brief.

Contains:
- Key themes
- Connected insights
- Open questions
- Suggested next steps
- Action list export

Tone:
- Editorial and polished
- Clear hierarchy
- Easy to scan and act on

## Component System

### Note Nodes
Core unit of thought.

Node types:
- Text note
- Voice note (with transcript)
- Image note
- Sketch note
- Link note
- Code note

Shared node anatomy:
- Type icon
- Title
- Content preview
- Metadata row (author, time, tags)
- Status indicator (new, discussed, actionable)

States:
- Default
- Hover
- Selected
- Editing
- Linked
- Grouped

Design rules:
- Rounded corners (16-20px)
- Soft border + low-contrast shadow
- Pastel tint by category
- Strong text contrast

### Connection Threads
Threads show thinking relationships.

Types:
- Supports
- Contradicts
- Depends on
- Inspires
- Question about

Styles:
- Solid line for strong links
- Dashed line for tentative links
- Labeled chips at midpoint
- Subtle glow on hover

### Islands
Clusters of related notes.

Island anatomy:
- Soft tinted contour
- Island title
- Note count
- Optional AI summary badge

Behavior:
- Auto-suggested or manual
- Expand/collapse
- Drag notes in/out
- Retain structure as canvas grows

### Synthesis Card
Structured AI output block.

Sections:
- Summary
- Top patterns
- Open gaps
- Next moves

Style:
- Clean card stack
- Editorial spacing
- Strong typographic hierarchy

## Interaction Model

### Capture Flow
1. User clicks quick add or pastes content
2. New note appears near current focus
3. User can tag, color, or leave raw
4. AI suggests nearby links

### Connect Flow
1. Drag connector from note edge
2. Hover target note to preview path
3. Drop to connect
4. Choose relationship label

### Organize Flow
1. Select multiple notes
2. Group into island
3. Name island
4. AI proposes missing links and next actions

### Synthesize Flow
1. User clicks Synthesize
2. Board scan animation (brief, elegant)
3. Structured brief appears in right pane or modal
4. User pins results back onto canvas as actionable cards

## Motion System
Motion should feel intentional and calm.

Principles:
- Communicate state, do not decorate
- Keep movement smooth and brief
- Avoid constant looping effects

Timings:
- Micro interactions: 120-180ms
- Component transitions: 220-320ms
- Context shifts (panel open, mode switch): 300-420ms

Easing:
- Standard: cubic-bezier(0.22, 0.61, 0.36, 1)
- Playful spring moments: cubic-bezier(0.34, 1.56, 0.64, 1)

Animated moments:
- Note appears with soft scale + fade
- Thread draws from origin to target
- Island forms with contour bloom
- Synthesis output reveals section-by-section

Reduced motion:
- Disable scale and spring
- Use fade only
- Keep all durations short and predictable

## Color System (Pastel First)
Avoid neon. Avoid hard contrast blocks. Keep warmth and legibility.

### Core Surface Colors
- App Background: #F7F6F3
- Canvas Base: #FCFBF8
- Panel Surface: #FFFFFF
- Elevated Surface: #FFFDFB
- Divider: #E7E2DA

### Text Colors
- Primary Text: #273437
- Secondary Text: #5E6D70
- Muted Text: #7B8A8D
- Inverse Text: #F8FAFA

### Pastel Semantic Palette
- Sage: #B9DEC8
- Mint: #BEE9DE
- Sky: #B8DAF0
- Peach: #F6D2B8
- Coral: #EFB9A6
- Sand: #E9DABF
- Butter: #F4E8B2

Usage guidance:
- Notes use tinted backgrounds, not fully saturated fills
- Threads borrow parent note hue at reduced opacity
- Islands use very soft translucent fills
- Primary CTA uses deeper sky/teal accent for contrast

### Feedback Colors (Muted)
- Success: #8BC7A5
- Warning: #D8B07A
- Error: #D38D82
- Info: #7CB4D6

## Typography
Goal: Academic clarity with warmth.

Recommended stack:
- Headings: Plus Jakarta Sans or Sora
- Body: Source Sans 3 or Inter
- Code: JetBrains Mono

Scale:
- Display: 32/40, weight 600
- H1: 28/34, weight 600
- H2: 22/30, weight 600
- H3: 18/26, weight 600
- Body Large: 16/24, weight 400
- Body: 14/22, weight 400
- Meta: 12/18, weight 500

Rules:
- Use strong hierarchy
- Keep body text highly readable
- Avoid tiny captions for key information

## Spacing, Radius, Depth

Spacing scale:
- 4, 8, 12, 16, 24, 32, 40, 56

Radius scale:
- Small controls: 10
- Cards/panels: 16
- Nodes: 18-20
- Pills/chips: 9999

Shadow style:
- Very soft, layered shadow only
- No harsh drop shadows

Examples:
- Node shadow: 0 6px 20px rgba(39, 52, 55, 0.08)
- Panel shadow: 0 10px 30px rgba(39, 52, 55, 0.10)

## Modes on One Canvas

### Visionary Mode
Focus:
- Mood
- Imagery
- Inspiration
- Emotional direction

Visual bias:
- Larger imagery previews
- Softer outlines
- Color-forward islands

### Builder Mode
Focus:
- Logic
- Dependencies
- Requirements
- Next steps

Visual bias:
- Denser metadata
- Clear connection labels
- Action-oriented cards

Important:
Same board data in both modes. Only presentation emphasis changes.

## Collaboration UX

Presence:
- Live cursors with names
- Active region glow for collaborators
- Avatar stack in top bar

Activity:
- Lightweight event feed
- Recent edits highlight
- Follow teammate viewpoint option

Conflict handling:
- Clear lock/edit indicators
- Non-destructive merge hints
- Version snapshots

## Accessibility

Keyboard support:
- Full node navigation and editing
- Connection creation via keyboard
- Inspector interaction without mouse

Minimum targets:
- 44x44 px minimum interactive areas

Contrast:
- Body text minimum 4.5:1
- UI indicators minimum 3:1

Do not rely on color only:
- Relationship types have icon + label + style

Reduced motion:
- Respect system preferences
- Keep app fully usable without animation

Screen reader:
- Semantic regions for bars and panels
- Notes exposed with meaningful labels
- Connection descriptions announced

## Responsive Behavior

Desktop:
- Full 3-pane workflow

Tablet:
- Collapsible side panels
- Floating quick-capture menu

Mobile:
- Capture-first workflow
- Focus view for one island at a time
- Bottom-sheet inspector

## UI Quality Checklist
A screen is ready if:
- It looks clean in under 2 seconds
- It still reads clearly with 50+ notes
- Pastel tones feel mature and intentional
- User can add and connect a note in under 5 seconds
- Board looks more organized after 3 minutes of use
- Synthesis output is scannable and actionable

## Implementation Phases (Design-First)

Phase 1: Foundation
- Core shell layout
- Note nodes
- Threads
- Islands
- Pastel design tokens

Phase 2: Collaboration + Polish
- Presence system
- Inspector depth
- Minimap and filters
- Motion refinement

Phase 3: Intelligence Surface
- AI connection suggestions
- Synthesis cards
- Smart cluster assistance
- Mode-specific refinements

## Starter Design Tokens

```json
{
  "color": {
    "bg": "#F7F6F3",
    "canvas": "#FCFBF8",
    "panel": "#FFFFFF",
    "textPrimary": "#273437",
    "textSecondary": "#5E6D70",
    "divider": "#E7E2DA",
    "sage": "#B9DEC8",
    "mint": "#BEE9DE",
    "sky": "#B8DAF0",
    "peach": "#F6D2B8",
    "coral": "#EFB9A6",
    "sand": "#E9DABF"
  },
  "radius": {
    "sm": 10,
    "md": 16,
    "lg": 20,
    "pill": 9999
  },
  "space": {
    "xs": 4,
    "sm": 8,
    "md": 12,
    "lg": 16,
    "xl": 24,
    "xxl": 32,
    "xxxl": 40
  },
  "motion": {
    "fast": "150ms",
    "base": "280ms",
    "slow": "380ms",
    "easeStandard": "cubic-bezier(0.22, 0.61, 0.36, 1)",
    "easeSpring": "cubic-bezier(0.34, 1.56, 0.64, 1)"
  }
}
```

## Final Rule
If a feature adds visual noise without helping capture, connect, or clarify ideas, remove it.
