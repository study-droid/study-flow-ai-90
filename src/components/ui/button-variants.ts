import { cva } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background study-flow-transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 touch-manipulation",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-orange-hover hover:text-orange-hover-foreground study-flow-shadow-soft hover:study-flow-shadow-medium study-flow-transition",
        destructive:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 study-flow-shadow-soft study-flow-transition",
        outline:
          "border border-input bg-background hover:bg-orange-hover/10 hover:text-orange-hover hover:border-orange-hover/30 study-flow-shadow-soft study-flow-transition",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-orange-hover/20 hover:text-orange-hover study-flow-shadow-soft study-flow-transition",
        ghost: "hover:bg-orange-hover/10 hover:text-orange-hover study-flow-transition",
        link: "text-primary underline-offset-4 hover:underline hover:text-orange-hover study-flow-transition",
        // StudyFlow specific variants with orange hover
        gradient: "study-flow-gradient-bg text-primary-foreground hover:bg-orange-hover hover:text-orange-hover-foreground hover:scale-105 study-flow-shadow-medium hover:study-flow-shadow-strong study-flow-transition-bounce",
        focus: "btn-focus text-white hover:bg-orange-hover hover:text-orange-hover-foreground hover:scale-105 study-flow-shadow-soft hover:study-flow-shadow-medium study-flow-transition",
        achievement: "bg-achievement text-achievement-foreground hover:bg-orange-hover hover:text-orange-hover-foreground study-flow-shadow-soft hover:study-flow-shadow-medium study-flow-transition",
        progress: "bg-progress text-progress-foreground hover:bg-orange-hover hover:text-orange-hover-foreground study-flow-shadow-soft hover:study-flow-shadow-medium study-flow-transition",
        glass: "glass-card hover:bg-orange-hover/20 backdrop-blur-md study-flow-shadow-soft study-flow-transition",
        glow: "bg-primary text-primary-foreground hover:bg-orange-hover hover:text-orange-hover-foreground study-flow-shadow-glow hover:animate-pulse-glow study-flow-transition",
        warm: "btn-warm hover:bg-orange-hover hover:text-orange-hover-foreground hover:scale-105 study-flow-shadow-soft hover:study-flow-shadow-medium study-flow-transition",
        light: "bg-gray-100 text-gray-700 font-medium hover:bg-orange-hover hover:text-orange-hover-foreground border border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-orange-hover dark:hover:text-orange-hover-foreground dark:border-gray-600 study-flow-shadow-soft hover:study-flow-shadow-medium study-flow-transition",
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