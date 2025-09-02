import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background study-flow-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90 study-flow-shadow-soft hover:study-flow-shadow-medium",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 study-flow-shadow-soft",
        outline:
          "border border-input bg-background hover:bg-accent hover:text-accent-foreground study-flow-shadow-soft",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 study-flow-shadow-soft",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        // StudyFlow specific variants
        gradient: "study-flow-gradient text-primary-foreground hover:scale-105 study-flow-shadow-medium hover:study-flow-shadow-strong study-flow-transition-bounce",
        focus: "btn-focus text-white hover:scale-105 study-flow-shadow-soft hover:study-flow-shadow-medium study-flow-transition",
        achievement: "bg-achievement text-achievement-foreground hover:bg-achievement/90 study-flow-shadow-soft hover:study-flow-shadow-medium",
        progress: "bg-progress text-progress-foreground hover:bg-progress/90 study-flow-shadow-soft hover:study-flow-shadow-medium",
        glass: "glass-card hover:bg-white/20 dark:hover:bg-black/40 backdrop-blur-md study-flow-shadow-soft",
        glow: "bg-primary text-primary-foreground hover:bg-primary/90 study-flow-shadow-glow hover:animate-pulse-glow",
        warm: "btn-warm hover:scale-105 study-flow-shadow-soft hover:study-flow-shadow-medium study-flow-transition",
      },
      size: {
        default: "min-h-[44px] h-11 px-4 py-2",
        sm: "min-h-[36px] h-9 rounded-md px-3",
        lg: "min-h-[48px] h-12 rounded-md px-8",
        xl: "min-h-[56px] h-14 rounded-lg px-12 text-base",
        icon: "min-h-[44px] min-w-[44px] h-11 w-11",
        "icon-sm": "min-h-[36px] min-w-[36px] h-9 w-9",
        "icon-lg": "min-h-[48px] min-w-[48px] h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)