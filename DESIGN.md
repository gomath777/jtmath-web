# Mathgo Web Design System

## 1. Atmosphere & Identity

Mathgo Web uses a quiet Korean study-room atmosphere: warm parchment, ivory panels, restrained terracotta actions, and editorial serif headings. The signature is calm hierarchy: students should immediately know what to do next without feeling like they are inside an admin dashboard or a marketing page.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|------|-------|-------|------|-------|
| Surface/primary | `--parchment` / `bg-parchment` | `#f5f4ed` | n/a | Page background |
| Surface/secondary | `--ivory` / `bg-ivory` | `#faf9f5` | n/a | Cards and panels |
| Surface/muted | `--sand` / `bg-sand` | `#e8e6dc` | n/a | Subtle pills and grouped areas |
| Text/primary | `--ink` / `text-ink` | `#141413` | n/a | Headlines and primary body |
| Text/body | `--charcoal` / `text-charcoal` | `#4d4c48` | n/a | Dense reading text |
| Text/secondary | `--olive` / `text-olive` | `#5e5d59` | n/a | Helper text |
| Text/tertiary | `--stone` / `text-stone` | `#87867f` | n/a | Metadata |
| Accent/primary | `--terracotta` / `bg-terracotta` | `#c96442` | n/a | Primary actions and focus emphasis |
| Accent/hover | `--coral` / `bg-terracotta-light` | `#d97757` | n/a | Primary action hover |
| Status/error | `--crimson` / `text-crimson` | `#b53333` | n/a | Gate errors |
| Border/subtle | `--border-cream` / `border-border-cream` | `#f0eee6` | n/a | Soft card borders |
| Border/default | `--border-warm` / `border-border-warm` | `#e8e6dc` | n/a | Inputs and stronger dividers |

### Rules

- Use terracotta only for primary actions, current-step emphasis, and important affordances.
- Use olive for video or secondary progression states.
- New UI should prefer existing Tailwind tokens from `tailwind.config.ts` and CSS variables in `src/app/globals.css`.

## 3. Typography

### Scale

| Level | Size | Weight | Line Height | Tracking | Usage |
|-------|------|--------|-------------|----------|-------|
| H1 | 26px / 30px desktop | 400 serif | 1.25 | -0.01em | Share page headings |
| H2 | 20px | 400 serif | 1.25 | -0.01em | Section headings |
| H3 | 16px | 600 sans | 1.4 | 0 | Card headings |
| Body | 14px | 400 sans | 1.6 | -0.005em inherited | Main instructions |
| Body/sm | 13px | 400-500 sans | 1.5 | 0 | Share page rows |
| Caption | 11-12px | 500-600 sans/mono | 1.4 | 0.14em for overline | Labels and metadata |

### Font Stack

- Primary: `Pretendard Variable`, Pretendard, system UI, sans-serif.
- Serif: `Gowun Batang`, `Noto Serif KR`, Georgia, serif.
- Mono: `ui-monospace`, SFMono-Regular, Menlo, monospace.

### Rules

- Korean learning pages use compact text sizes and generous line height.
- Serif is reserved for page and section titles, not dense body copy.

## 4. Spacing & Layout

### Base Unit

All spacing derives from a 4px base.

| Token | Value | Usage |
|-------|-------|-------|
| `space-1` | 4px | Icon gaps |
| `space-2` | 8px | Tight row gaps |
| `space-3` | 12px | Inline padding |
| `space-4` | 16px | Compact card padding |
| `space-5` | 20px | Mobile page padding |
| `space-6` | 24px | Standard panel padding |
| `space-8` | 32px | Header and section separation |
| `space-10` | 40px | Share page vertical rhythm |
| `space-12` | 48px | Major grouped sections |

### Grid

- Student share pages default to `max-w-2xl` for focused reading.
- Wider pages may use `max-w-5xl` when embedded video and task columns need room.
- Breakpoints follow Tailwind defaults.

### Rules

- Use stable aspect-ratio containers for iframes and media.
- Mobile layouts stack first; desktop may split summary/progress from content.

## 5. Components

### Share Header

- **Structure**: overline, serif H1, short helper copy, optional metadata pills.
- **Spacing**: bottom border, `space-8` to first content.
- **States**: static.
- **Accessibility**: one H1 per page.
- **Motion**: none.

### Learning Action Card

- **Structure**: leading step badge, title/body, action anchor, optional icon.
- **Variants**: note, video, checklist.
- **Spacing**: `space-4` to `space-5` internal padding.
- **States**: default, hover, focus-visible.
- **Accessibility**: anchors have descriptive text and open external resources with `rel="noopener noreferrer"`.
- **Motion**: color and ring transitions only, 150ms.

### Embedded Video Block

- **Structure**: label/title header plus 16:9 iframe frame.
- **Variants**: primary lecture, follow-up lecture.
- **Spacing**: `space-4` header gap; stable aspect ratio.
- **States**: focusable iframe.
- **Accessibility**: iframe `title` describes the lecture.
- **Motion**: none.

## 6. Motion & Interaction

| Type | Duration | Easing | Usage |
|------|----------|--------|-------|
| Micro | 150ms | ease-out | Link/card hover and focus emphasis |
| Standard | 200ms | ease-in-out | Panel color/ring transitions |

### Rules

- Do not animate layout properties.
- Keep student pages calm; motion should clarify clickable affordances only.
- Respect native focus outlines or provide an equally visible focus ring.

## 7. Depth & Surface

### Strategy

Mixed: warm borders plus occasional whisper shadow.

| Level | Value | Usage |
|-------|-------|-------|
| Subtle border | `border-border-cream` | Share rows and cards |
| Default border | `border-border-warm` | Inputs and stronger panels |
| Whisper shadow | `shadow-whisper` | Elevated study panels |
| Warm ring | `shadow-ring-warm` / `ring-claude` | Hover or selected emphasis |

### Rules

- Cards use radius `xl` to `2xl`; buttons use `lg` to `xl`.
- Avoid nested decorative cards. A card may contain a media frame, but full page sections should stay unframed.
