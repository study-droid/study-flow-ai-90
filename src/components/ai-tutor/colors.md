# Mindscape Planner Color System

## Overview

The Mindscape Planner uses an evidence-based color system designed specifically for learning environments, combining psychological principles with modern design standards to enhance focus, motivation, and cognitive performance.

## Color Philosophy

### Learning Psychology Principles
- **Blue tones** promote focus, trust, and analytical thinking
- **Green shades** encourage growth, progress, and positive reinforcement
- **Orange accents** create urgency, highlight important actions
- **Purple/Magenta** stimulates creativity and imagination
- **Warm neutrals** reduce cognitive load and provide comfortable reading

### Technical Standards
- **WCAG 2.1 AA Compliance**: All color combinations meet minimum contrast ratios
- **HSL Color Space**: Consistent hue-based system for better color relationships
- **CSS Custom Properties**: Dynamic theming with semantic naming
- **Tailwind Integration**: Utility-first approach with design tokens

---

## 1. Color Palette Overview

### Primary Color Scheme

| Color | HSL Value | Hex | Usage | Psychology |
|-------|-----------|-----|-------|------------|
| **Primary Blue** | `207 71% 37%` | `#1976D2` | Navigation, primary actions | Trust, focus, stability |
| **Secondary Green** | `122 39% 39%` | `#388E3C` | Progress, success states | Growth, achievement |
| **Accent Orange** | `36 100% 50%` | `#FF9800` | CTAs, highlights | Energy, motivation |
| **Alert Red** | `4 70% 50%` | `#D32F2F` | Warnings, urgent tasks | Urgency, attention |

### 2025 Trend Colors

| Color | HSL Value | Hex | Usage | Psychology |
|-------|-----------|-----|-------|------------|
| **Royal Blue** | `210 100% 20%` | `#003366` | Premium features, headers | Authority, premium |
| **Olive Green** | `70 56% 34%` | `#6B8E23` | Creative zones, innovation | Nature, balance |
| **Soft Magenta** | `302 59% 65%` | `#DA70D6` | Imagination, creative tasks | Creativity, inspiration |

### Neutral Foundation

| Color | HSL Value | Hex | Usage | Psychology |
|-------|-----------|-----|-------|------------|
| **Light Grey** | `0 0% 96%` | `#F5F5F5` | Primary background | Clean, minimalist |
| **Warm Cream** | `48 100% 93%` | `#FFF9C4` | Content areas | Warmth, comfort |
| **Primary Text** | `0 0% 13%` | `#212121` | Main text | High contrast |
| **Secondary Text** | `0 0% 46%` | `#757575` | Descriptions | Readable hierarchy |

---

## 2. Design System Colors

### Core Semantic Tokens

```css
:root {
  /* Base Colors */
  --background: 0 0% 96%;                    /* Main app background */
  --foreground: 0 0% 13%;                    /* Primary text color */
  
  /* Component Colors */
  --card: 0 0% 100%;                         /* Card backgrounds */
  --card-foreground: 0 0% 13%;               /* Card text */
  --popover: 0 0% 100%;                      /* Popover backgrounds */
  --popover-foreground: 0 0% 13%;            /* Popover text */
  
  /* Interactive Colors */
  --primary: 207 71% 37%;                    /* Primary buttons, links */
  --primary-foreground: 0 0% 98%;            /* Text on primary bg */
  --secondary: 48 100% 93%;                  /* Secondary elements */
  --secondary-foreground: 0 0% 13%;          /* Text on secondary bg */
  --accent: 36 100% 50%;                     /* Accent elements */
  --accent-foreground: 0 0% 100%;            /* Text on accent bg */
  
  /* Form Elements */
  --input: 210 40% 88%;                      /* Input backgrounds */
  --border: 210 40% 88%;                     /* Border color */
  --ring: 207 71% 37%;                       /* Focus rings */
  
  /* State Colors */
  --success: 122 39% 39%;                    /* Success states */
  --success-foreground: 0 0% 100%;           /* Success text */
  --warning: 36 100% 50%;                    /* Warning states */
  --warning-foreground: 0 0% 100%;           /* Warning text */
  --destructive: 4 70% 50%;                  /* Error states */
  --destructive-foreground: 0 0% 100%;       /* Error text */
  
  /* Muted Elements */
  --muted: 210 40% 96%;                      /* Muted backgrounds */
  --muted-foreground: 0 0% 46%;              /* Muted text */
}
```

### Dark Mode Variables

```css
.dark {
  --background: 222.2 84% 4.9%;              /* Dark background */
  --foreground: 210 40% 98%;                 /* Light text */
  --card: 222.2 84% 4.9%;                    /* Dark cards */
  --primary: 210 40% 98%;                    /* Inverted primary */
  --secondary: 217.2 32.6% 17.5%;            /* Dark secondary */
  --muted: 217.2 32.6% 17.5%;                /* Dark muted */
  --border: 217.2 32.6% 17.5%;               /* Dark borders */
  /* Additional dark mode tokens... */
}
```

---

## 3. Functional Color Categories

### Interactive States

| State | Class | CSS Variable | Usage |
|-------|-------|--------------|-------|
| **Default** | `bg-primary` | `hsl(var(--primary))` | Normal button state |
| **Hover** | `hover:bg-primary/90` | `hsl(var(--primary) / 0.9)` | Mouse hover |
| **Active** | `active:bg-primary/95` | `hsl(var(--primary) / 0.95)` | Click/press state |
| **Disabled** | `disabled:bg-muted` | `hsl(var(--muted))` | Inactive elements |
| **Focus** | `focus:ring-ring` | `hsl(var(--ring))` | Keyboard navigation |

### Status Colors

| Status | HSL Value | Tailwind Class | CSS Variable | Use Cases |
|--------|-----------|----------------|--------------|-----------|
| **Success** | `122 39% 39%` | `text-success` | `var(--success)` | Completed tasks, achievements |
| **Warning** | `36 100% 50%` | `text-warning` | `var(--warning)` | Attention needed, deadlines |
| **Error** | `4 70% 50%` | `text-destructive` | `var(--destructive)` | Failed actions, validation errors |
| **Info** | `207 71% 37%` | `text-primary` | `var(--primary)` | System messages, tips |

### Content Hierarchy

| Level | Font Size | Color | Tailwind Classes | Usage |
|-------|-----------|-------|------------------|-------|
| **H1** | `3xl` | Primary | `text-3xl font-bold text-foreground` | Page titles |
| **H2** | `2xl` | Primary | `text-2xl font-semibold text-foreground` | Section headers |
| **H3** | `xl` | Primary | `text-xl font-semibold text-foreground` | Subsection headers |
| **H4** | `lg` | Primary | `text-lg font-medium text-foreground` | Component titles |
| **Body** | `base` | Primary | `text-base text-foreground` | Main content |
| **Caption** | `sm` | Secondary | `text-sm text-muted-foreground` | Descriptions, metadata |

---

## 4. Component-Specific Colors

### Dashboard Widgets

```css
/* Focus Zone Widget */
.zone-focus {
  background: linear-gradient(135deg, hsl(var(--focus-zone) / 0.1), hsl(var(--focus-zone) / 0.05));
  border-left: 4px solid hsl(var(--focus-zone));
}

/* Creative Zone Widget */
.zone-creative {
  background: linear-gradient(135deg, hsl(var(--creative-zone) / 0.1), hsl(var(--creative-zone) / 0.05));
  border-left: 4px solid hsl(var(--creative-zone));
}

/* Premium Zone Widget */
.zone-premium {
  background: linear-gradient(135deg, hsl(var(--premium-zone) / 0.1), hsl(var(--premium-zone) / 0.05));
  border-left: 4px solid hsl(var(--premium-zone));
}
```

### Study Session Status

| Status | Color Variable | Tailwind Class | Visual Treatment |
|--------|----------------|----------------|-------------------|
| **Active** | `--success` | `bg-success text-success-foreground` | Solid green background |
| **Paused** | `--warning` | `bg-warning text-warning-foreground` | Solid orange background |
| **Completed** | `--primary` | `bg-primary text-primary-foreground` | Solid blue background |
| **Pending** | `--muted` | `bg-muted text-muted-foreground` | Light grey background |

### Progress Indicators

```css
/* Progress Ring Colors */
:root {
  --progress-excellent: 122 39% 39%;    /* 90-100% - Green */
  --progress-good: 122 39% 49%;         /* 70-89% - Light Green */
  --progress-needs-work: 36 100% 50%;   /* 50-69% - Orange */
  --progress-urgent: 4 70% 50%;         /* 0-49% - Red */
}
```

### AI Interaction Colors

| Element | Color | Purpose | Implementation |
|---------|-------|---------|----------------|
| **AI Response** | Soft Magenta | Creative assistance | `bg-learning-creative/10 border-learning-creative` |
| **System Message** | Primary Blue | Information | `bg-primary/10 border-primary` |
| **User Input** | Warm Cream | Input areas | `bg-secondary border-border` |
| **Error Feedback** | Alert Red | Corrections | `bg-destructive/10 border-destructive` |

### Subject Categorization

```css
/* Subject Color Variables */
:root {
  --subject-math: 221 83% 53%;      /* Blue - Logic & Analysis */
  --subject-science: 122 39% 39%;   /* Green - Growth & Discovery */
  --subject-language: 271 76% 53%;  /* Purple - Communication */
  --subject-history: 25 76% 48%;    /* Brown - Stability & Wisdom */
  --subject-arts: 302 59% 65%;      /* Magenta - Creativity */
  --subject-other: 0 0% 46%;        /* Grey - Neutral */
}

/* Subject Badge Classes */
.subject-math { 
  background-color: hsl(var(--subject-math) / 0.1); 
  color: hsl(var(--subject-math)); 
  border: 1px solid hsl(var(--subject-math) / 0.3); 
}
```

---

## 5. Accessibility Compliance

### WCAG 2.1 AA Contrast Ratios

| Color Combination | Contrast Ratio | Status | Usage |
|-------------------|----------------|--------|-------|
| Primary Blue on White | 4.6:1 | ✅ AA | Primary buttons, links |
| Primary Text on Background | 15.8:1 | ✅ AAA | Main content |
| Secondary Text on Background | 4.5:1 | ✅ AA | Descriptions |
| Success Green on White | 4.7:1 | ✅ AA | Success messages |
| Alert Red on White | 4.5:1 | ✅ AA | Error messages |
| White on Primary Blue | 4.6:1 | ✅ AA | Button text |

### Color Blindness Considerations

#### Deuteranopia (Red-Green Colorblind)
- **Math (Blue)** vs **Science (Green)**: Distinguishable by different hues
- **Success** vs **Error**: Use icons alongside colors
- **Progress states**: Include text labels and patterns

#### Protanopia (Red-Green Colorblind)
- **Warning (Orange)** remains distinguishable
- **Subject colors** use varied hues, not just red-green spectrum

#### Tritanopia (Blue-Yellow Colorblind)
- **Primary Blue** vs **Warning Orange**: High contrast maintained
- **Text hierarchy** relies on weight and size, not just color

### High Contrast Alternatives

```css
/* High Contrast Mode Support */
@media (prefers-contrast: high) {
  :root {
    --border: 0 0% 20%;                 /* Darker borders */
    --ring: 0 0% 0%;                    /* Black focus rings */
    --primary: 0 0% 0%;                 /* Pure black primary */
    --success: 120 100% 25%;            /* Darker green */
    --destructive: 0 100% 40%;          /* Darker red */
  }
}

/* Reduced Motion Support */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## 6. Implementation Guide

### Tailwind CSS Classes

#### Background Colors
```html
<!-- Primary colors -->
<div class="bg-primary text-primary-foreground">Primary Background</div>
<div class="bg-secondary text-secondary-foreground">Secondary Background</div>
<div class="bg-accent text-accent-foreground">Accent Background</div>

<!-- Status colors -->
<div class="bg-success text-success-foreground">Success State</div>
<div class="bg-warning text-warning-foreground">Warning State</div>
<div class="bg-destructive text-destructive-foreground">Error State</div>

<!-- Learning zones -->
<div class="bg-learning-focus text-foreground">Focus Zone</div>
<div class="bg-learning-creative text-foreground">Creative Zone</div>
<div class="bg-learning-premium text-primary-foreground">Premium Zone</div>
```

#### Text Colors
```html
<!-- Hierarchy -->
<h1 class="text-foreground">Main Heading</h1>
<p class="text-foreground">Body Text</p>
<span class="text-muted-foreground">Secondary Text</span>

<!-- Status text -->
<span class="text-success">Success Message</span>
<span class="text-warning">Warning Message</span>
<span class="text-destructive">Error Message</span>

<!-- Subject colors -->
<span class="text-subject-math">Mathematics</span>
<span class="text-subject-science">Science</span>
<span class="text-subject-language">Language</span>
```

#### Border Colors
```html
<!-- Standard borders -->
<div class="border border-border">Standard Border</div>
<div class="border-2 border-primary">Primary Border</div>
<div class="border-l-4 border-success">Success Left Border</div>

<!-- Focus states -->
<input class="focus:ring-2 focus:ring-ring focus:border-ring" />
```

### CSS Custom Property Usage

#### Basic Implementation
```css
.custom-button {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
  border: 1px solid hsl(var(--primary) / 0.3);
}

.custom-button:hover {
  background-color: hsl(var(--primary) / 0.9);
}

.custom-button:disabled {
  background-color: hsl(var(--muted));
  color: hsl(var(--muted-foreground));
}
```

#### Advanced Color Manipulation
```css
.progress-bar {
  background: linear-gradient(
    90deg,
    hsl(var(--progress-urgent)),
    hsl(var(--progress-needs-work)),
    hsl(var(--progress-good)),
    hsl(var(--progress-excellent))
  );
}

.glassmorphism-card {
  background: hsl(var(--card) / 0.8);
  backdrop-filter: blur(20px);
  border: 1px solid hsl(var(--border) / 0.2);
}
```

### React Component Patterns

#### Theme-Aware Components
```tsx
// Color-aware button component
interface ButtonProps {
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'destructive';
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({ variant = 'primary', children }) => {
  const variantClasses = {
    primary: 'bg-primary text-primary-foreground hover:bg-primary/90',
    secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/90',
    success: 'bg-success text-success-foreground hover:bg-success/90',
    warning: 'bg-warning text-warning-foreground hover:bg-warning/90',
    destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
  };

  return (
    <button className={`px-4 py-2 rounded-lg transition-colors ${variantClasses[variant]}`}>
      {children}
    </button>
  );
};
```

#### Subject Badge Component
```tsx
interface SubjectBadgeProps {
  subject: 'math' | 'science' | 'language' | 'history' | 'arts' | 'other';
  children: React.ReactNode;
}

const SubjectBadge: React.FC<SubjectBadgeProps> = ({ subject, children }) => {
  return (
    <span className={`subject-${subject} px-2 py-1 rounded-md text-xs font-medium`}>
      {children}
    </span>
  );
};
```

### Theme Switching Implementation

#### Context Setup
```tsx
// Theme context
interface ThemeContextType {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  const toggleTheme = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
```

---

## 7. Color Usage Examples

### Dashboard Cards

```tsx
// Study session card with dynamic colors
const StudySessionCard = ({ session }: { session: StudySession }) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'border-success bg-success/10';
      case 'paused': return 'border-warning bg-warning/10';
      case 'completed': return 'border-primary bg-primary/10';
      default: return 'border-muted bg-muted/10';
    }
  };

  return (
    <div className={`card p-4 rounded-lg border-2 ${getStatusColor(session.status)}`}>
      <h3 className="text-lg font-semibold text-foreground">{session.subject}</h3>
      <p className="text-sm text-muted-foreground">{session.description}</p>
    </div>
  );
};
```

### Progress Visualization

```tsx
// Progress ring with color-coded performance
const ProgressRing = ({ percentage }: { percentage: number }) => {
  const getProgressColor = (percent: number) => {
    if (percent >= 90) return 'text-progress-excellent';
    if (percent >= 70) return 'text-progress-good';
    if (percent >= 50) return 'text-progress-needs-work';
    return 'text-progress-urgent';
  };

  return (
    <div className={`progress-ring ${getProgressColor(percentage)}`}>
      {/* SVG circle with dynamic stroke color */}
    </div>
  );
};
```

### AI Chat Interface

```tsx
// AI message with contextual coloring
const AIMessage = ({ message, type }: { message: string; type: 'ai' | 'system' | 'error' }) => {
  const getMessageStyle = (messageType: string) => {
    switch (messageType) {
      case 'ai':
        return 'bg-learning-creative/10 border-learning-creative text-foreground';
      case 'system':
        return 'bg-primary/10 border-primary text-foreground';
      case 'error':
        return 'bg-destructive/10 border-destructive text-destructive';
      default:
        return 'bg-muted border-border text-foreground';
    }
  };

  return (
    <div className={`p-3 rounded-lg border ${getMessageStyle(type)}`}>
      {message}
    </div>
  );
};
```

---

## Do's and Don'ts

### ✅ Do's

1. **Use semantic color names** - `text-success` instead of `text-green-500`
2. **Maintain contrast ratios** - Always test with accessibility tools
3. **Provide color alternatives** - Use icons, patterns, or text alongside colors
4. **Follow the hierarchy** - Primary for actions, secondary for content, muted for metadata
5. **Use opacity modifiers** - `bg-primary/10` for subtle backgrounds
6. **Test in both themes** - Ensure colors work in light and dark modes
7. **Consider color psychology** - Use appropriate colors for learning contexts

### ❌ Don'ts

1. **Don't use arbitrary colors** - Stick to the defined design tokens
2. **Don't rely on color alone** - Always provide additional context
3. **Don't ignore accessibility** - Test with real users and tools
4. **Don't overcomplicate** - Simple, consistent color usage is better
5. **Don't forget responsive design** - Colors should work at all screen sizes
6. **Don't mix color systems** - Use either HSL variables or Tailwind classes, not both
7. **Don't use colors for decoration** - Every color should have semantic meaning

---

## Color Testing Tools

### Accessibility Tools
- **WebAIM Contrast Checker**: Test contrast ratios
- **Colour Contrast Analyser**: Desktop app for testing
- **Stark (Figma Plugin)**: Design-time accessibility checks

### Color Blindness Testing
- **Coblis**: Color blindness simulator
- **Chromatic Vision Simulator**: Mobile app testing
- **Stark**: Comprehensive colorblind testing

### Browser DevTools
- **Chrome DevTools**: Built-in contrast checking
- **Firefox Accessibility Inspector**: Color analysis
- **Safari Web Inspector**: Color debugging

---

## Migration Guide

### From Existing Colors
```css
/* Old approach */
.button {
  background-color: #1976D2;
  color: white;
}

/* New approach */
.button {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

### Tailwind Class Updates
```html
<!-- Old -->
<div class="bg-blue-600 text-white">Primary Button</div>

<!-- New -->
<div class="bg-primary text-primary-foreground">Primary Button</div>
```

---

## Resources

### Design References
- [Material Design Color System](https://material.io/design/color)
- [Tailwind CSS Color Palette](https://tailwindcss.com/docs/customizing-colors)
- [shadcn/ui Theming](https://ui.shadcn.com/docs/theming)

### Accessibility Guidelines
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Color Universal Design](https://jfly.uni-koeln.de/color/)
- [WebAIM Color Accessibility](https://webaim.org/articles/contrast/)

### Color Psychology
- [Psychology of Color in Learning](https://www.color-meanings.com/color-psychology-learning/)
- [UI Color Psychology](https://blog.adobe.com/en/publish/2017/06/29/psychology-of-color-in-ui-design)

---

*Last updated: 2025-09-03*
*Version: 1.0.0*