import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Plus Jakarta Sans', 'Inter', 'system-ui', 'sans-serif'],
				heading: ['Fredoka', 'Plus Jakarta Sans', 'sans-serif'],
				body: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
				mono: ['Fira Code', 'Courier New', 'monospace'],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				// StudyFlow specific colors
				focus: {
					DEFAULT: 'hsl(var(--focus-primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				achievement: {
					DEFAULT: 'hsl(var(--achievement))',
					foreground: 'hsl(var(--achievement-foreground))'
				},
				// Progress indicators with psychology
				progress: {
					DEFAULT: 'hsl(var(--progress))',         // Legacy support
					foreground: 'hsl(var(--progress-foreground))',
					excellent: 'hsl(var(--progress-excellent))', // 90-100% - Green
					good: 'hsl(var(--progress-good))',       // 70-89% - Light Green
					needswork: 'hsl(var(--progress-needs-work))', // 50-69% - Orange
					urgent: 'hsl(var(--progress-urgent))'    // 0-49% - Red
				},
				deadline: {
					DEFAULT: 'hsl(var(--deadline))',
					foreground: 'hsl(var(--deadline-foreground))'
				},
				// Status colors with psychology
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				// Orange hover system
				'orange-hover': {
					DEFAULT: 'hsl(var(--orange-hover))',
					foreground: 'hsl(var(--orange-hover-foreground))'
				},
				
				// Learning environment zones
				learning: {
					focus: 'hsl(var(--learning-focus))',     // Blue - Analytical thinking
					creative: 'hsl(var(--learning-creative))', // Magenta - Creativity
					premium: 'hsl(var(--learning-premium))', // Royal Blue - Authority
					innovation: 'hsl(var(--learning-innovation))' // Olive Green - Balance
				},
				
				// Subject categorization
				subject: {
					math: 'hsl(var(--subject-math))',        // Blue - Logic & Analysis
					science: 'hsl(var(--subject-science))',  // Green - Growth & Discovery
					language: 'hsl(var(--subject-language))', // Purple - Communication
					history: 'hsl(var(--subject-history))',  // Brown - Stability & Wisdom
					arts: 'hsl(var(--subject-arts))',        // Magenta - Creativity
					other: 'hsl(var(--subject-other))'       // Grey - Neutral
				},
				
				// Legacy colors (maintained for compatibility)
				yellow: {
					light: 'hsl(var(--secondary))',    // Now maps to warm cream
					warm: 'hsl(var(--secondary))',     // Now maps to warm cream
					DEFAULT: 'hsl(var(--secondary))'   // Now maps to warm cream
				},
				amber: {
					light: 'hsl(var(--secondary))',    // Now maps to warm cream
					DEFAULT: 'hsl(var(--warning))'     // Now maps to energy orange
				},
				'golden-glow': 'hsl(var(--warning))',   // Now maps to energy orange
				'primary-glow': 'hsl(var(--primary-glow))',
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				}
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: { height: '0', opacity: '0' },
					to: { height: 'var(--radix-accordion-content-height)', opacity: '1' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)', opacity: '1' },
					to: { height: '0', opacity: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(10px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'fade-out': {
					'0%': { opacity: '1', transform: 'translateY(0)' },
					'100%': { opacity: '0', transform: 'translateY(10px)' }
				},
				'scale-in': {
					'0%': { transform: 'scale(0.95)', opacity: '0' },
					'100%': { transform: 'scale(1)', opacity: '1' }
				},
				'scale-out': {
					from: { transform: 'scale(1)', opacity: '1' },
					to: { transform: 'scale(0.95)', opacity: '0' }
				},
				'slide-in-right': {
					'0%': { transform: 'translateX(100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'slide-out-right': {
					'0%': { transform: 'translateX(0)' },
					'100%': { transform: 'translateX(100%)' }
				},
				'slide-in-left': {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(0)' }
				},
				'slide-in-up': {
					'0%': { transform: 'translateY(100%)', opacity: '0' },
					'100%': { transform: 'translateY(0)', opacity: '1' }
				},
				'bounce-gentle': {
					'0%, 100%': { transform: 'translateY(0)' },
					'50%': { transform: 'translateY(-5px)' }
				},
				'glow-pulse': {
					'0%, 100%': { boxShadow: '0 0 20px hsl(var(--primary) / 0.5)' },
					'50%': { boxShadow: '0 0 40px hsl(var(--primary) / 0.8)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.3s ease-out',
				'fade-out': 'fade-out 0.3s ease-out',
				'scale-in': 'scale-in 0.2s ease-out',
				'scale-out': 'scale-out 0.2s ease-out',
				'slide-in-right': 'slide-in-right 0.3s ease-out',
				'slide-out-right': 'slide-out-right 0.3s ease-out',
				'slide-in-left': 'slide-in-left 0.3s ease-out',
				'slide-in-up': 'slide-in-up 0.4s ease-out',
				'bounce-gentle': 'bounce-gentle 2s ease-in-out infinite',
				'glow-pulse': 'glow-pulse 2s ease-in-out infinite',
				'enter': 'fade-in 0.3s ease-out, scale-in 0.2s ease-out',
				'exit': 'fade-out 0.3s ease-out, scale-out 0.2s ease-out'
			},
			transitionDuration: {
				'1500': '1500ms',
				'2000': '2000ms',
				'2500': '2500ms'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;
