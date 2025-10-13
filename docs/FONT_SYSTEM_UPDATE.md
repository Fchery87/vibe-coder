# Font System Update - Inter & JetBrains Mono

## Overview
Updated the entire application to use the professional Atlas/Cosine-style font system with Inter for UI text and JetBrains Mono for code.

## Font Stack Implementation

### CSS Variables Added (`frontend/app/globals.css`)
```css
:root {
  /* Font Stacks */
  --sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  --mono: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;

  /* Font Sizes */
  --base-size: 14px;    /* body text */
  --code-size: 13px;    /* editor/diff/CLI */
  --small-size: 12px;   /* badges, meta, timestamps */
  --h1-size: 20px;      /* main headings */
  --h2-size: 16px;      /* subheadings */
  --h3-size: 14px;      /* tertiary headings */
}
```

## Typography Hierarchy

### Body Text
- **Font**: Inter (14px)
- **Usage**: All UI text, descriptions, paragraphs
- **Line height**: 1.4
- **Weight**: 400-500 for body, 600 for emphasis

### Headings
- **h1**: Inter Semi-Bold, 20px, line-height 1.2
- **h2**: Inter Semi-Bold, 16px, line-height 1.3
- **h3**: Inter Semi-Bold, 14px, line-height 1.4

### Code/Monospace
- **Font**: JetBrains Mono (13px)
- **Usage**: CLI output, code editor, diffs, `<pre>`, `<code>`
- **Line height**: 1.5
- **Features**: Ligatures supported, excellent readability

### Small Text
- **Font**: Current context font (12px)
- **Usage**: Badges, timestamps, metadata, helper text
- **Classes**: `.text-small`, `.badge`, `.meta`

## Changes Made

### 1. Global Styles (`frontend/app/globals.css`)
```css
body {
  font-family: var(--sans);
  font-size: var(--base-size);
  line-height: 1.4;
}

h1, h2, h3 {
  font-family: var(--sans);
  font-weight: 600;
}

.font-mono, .editor, pre, code, kbd, samp {
  font-family: var(--mono);
  font-size: var(--code-size);
  line-height: 1.5;
}

.text-small, .badge, .meta {
  font-size: var(--small-size);
}
```

### 2. Atlas CLI Component (`frontend/app/components/AtlasCLI.tsx`)

**Container**:
```tsx
<div className="flex flex-col h-full bg-slate-900 font-mono"
     style={{ fontSize: 'var(--code-size)' }}>
```

**Header Title**:
```tsx
<span className="text-green-400 font-bold"
      style={{ fontSize: 'var(--h3-size)' }}>
  Atlas CLI
</span>
```

**Small Text** (version, stats, timestamps):
```tsx
<span className="text-gray-400 text-small">Genie Agent v1.0</span>
<div className="flex items-center gap-2 text-small text-gray-400">
  <span>{commands.length} commands</span>
  ...
</div>
```

**Input Field**:
```tsx
<input
  className="flex-1 bg-transparent border-0 outline-none text-gray-200"
  style={{ fontSize: 'var(--code-size)' }}
  ...
/>
```

### 3. Layout (`frontend/app/layout.tsx`)
Removed hardcoded `font-inter` class - now using CSS variable system.

## Font Loading

Fonts are loaded via Next.js Google Fonts:
```typescript
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});
```

Applied to HTML element:
```tsx
<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
```

## Usage Guidelines

### For UI Components
Use default body font (Inter):
```tsx
<div className="text-base">Regular UI text</div>
<h1>Main Heading</h1>
<span className="text-small">Helper text</span>
```

### For Code/CLI
Use monospace font (JetBrains Mono):
```tsx
<div className="font-mono">Code or CLI output</div>
<pre><code>Preformatted code</code></pre>
```

### Font Size Classes
- **Default**: `var(--base-size)` (14px) - automatic on body
- **Code**: `var(--code-size)` (13px) - automatic on `.font-mono`
- **Small**: `.text-small` class or `var(--small-size)` (12px)
- **Headings**: Use `<h1>`, `<h2>`, `<h3>` - automatically sized

## Benefits

### 1. **Consistency**
- Uniform typography across the entire app
- Predictable sizing and spacing
- Professional appearance matching Atlas/Cosine design system

### 2. **Readability**
- Inter optimized for UI text at small sizes
- JetBrains Mono designed for code with excellent character distinction
- Proper line heights for each context

### 3. **Maintainability**
- CSS variables make global changes easy
- Single source of truth for all font settings
- Easy to adjust sizes across entire app

### 4. **Performance**
- System font fallbacks for fast loading
- Google Fonts optimized delivery
- Subset loading for smaller bundle size

## Testing

### Visual Check:
1. Reload the application
2. **UI Text** should be in Inter (clean, modern sans-serif)
3. **CLI/Code** should be in JetBrains Mono (monospace with ligatures)
4. **Sizes** should be consistent: 14px body, 13px code, 12px small text

### Font Verification:
Open browser DevTools and check computed styles:
```javascript
// Check body font
getComputedStyle(document.body).fontFamily
// Should include "Inter"

// Check CLI font
getComputedStyle(document.querySelector('.font-mono')).fontFamily
// Should include "JetBrains Mono"

// Check sizes
getComputedStyle(document.body).fontSize
// Should be "14px"

getComputedStyle(document.querySelector('.font-mono')).fontSize
// Should be "13px"
```

## Browser DevTools Inspection

You can verify the font system in Chrome DevTools:
1. Open DevTools (F12)
2. Go to Elements tab
3. Select `<body>` element
4. Check Computed tab → see `font-family: Inter, ...`
5. Select a `.font-mono` element (like CLI)
6. Check Computed tab → see `font-family: JetBrains Mono, ...`

## Notes

- **CLI Terminal Font**: Users can configure their terminal app (iTerm, Terminal) to use JetBrains Mono or SF Mono at 13-14px for native CLI
- **Ligatures**: JetBrains Mono supports ligatures (→, ===, !=, etc.) if enabled
- **Fallbacks**: Robust fallback chain ensures fonts display even if primary fails
- **Accessibility**: Font sizes meet WCAG guidelines for readability
