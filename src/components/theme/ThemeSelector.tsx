import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useUIStore } from "@/stores/uiStore";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

const themeOptions = [
  {
    id: 'teddy-orange' as const,
    name: 'Teddy Orange',
    description: 'Warm and friendly learning environment',
    colors: ['#F4A340', '#E6950D', '#FAF7F0'],
    gradient: 'from-orange-400 to-amber-500'
  },
  {
    id: 'ocean-blue' as const,
    name: 'Ocean Blue',
    description: 'Calm and focused study atmosphere',
    colors: ['#0080FF', '#0066CC', '#E6F3FF'],
    gradient: 'from-blue-500 to-cyan-500'
  },
  {
    id: 'forest-green' as const,
    name: 'Forest Green',
    description: 'Natural growth-oriented environment',
    colors: ['#2E8B57', '#228B22', '#F0FFF0'],
    gradient: 'from-green-600 to-emerald-500'
  }
];

export const ThemeSelector = () => {
  const { colorTheme, setColorTheme } = useUIStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Color Theme</CardTitle>
        <CardDescription>
          Choose a color theme that matches your study mood
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {themeOptions.map((theme) => (
          <div
            key={theme.id}
            className={cn(
              "relative p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md",
              colorTheme === theme.id
                ? "border-primary bg-primary/5 shadow-sm"
                : "border-border hover:border-primary/50"
            )}
            onClick={() => setColorTheme(theme.id)}
          >
            <div className="flex items-center gap-4">
              {/* Theme Preview */}
              <div className="flex gap-1">
                {theme.colors.map((color, index) => (
                  <div
                    key={index}
                    className="w-6 h-6 rounded-full border border-border"
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Theme Info */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{theme.name}</span>
                  {colorTheme === theme.id && (
                    <CheckCircle className="w-4 h-4 text-primary" />
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{theme.description}</p>
              </div>

              {/* Select Button */}
              <Button
                variant={colorTheme === theme.id ? "default" : "outline"}
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  setColorTheme(theme.id);
                }}
              >
                {colorTheme === theme.id ? "Selected" : "Select"}
              </Button>
            </div>

            {/* Preview Gradient */}
            <div className={cn(
              "mt-3 h-2 rounded-full bg-gradient-to-r",
              theme.gradient
            )} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
};