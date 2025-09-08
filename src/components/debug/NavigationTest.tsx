import { useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const NavigationTest = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const testRoutes = [
    { path: '/', label: 'Dashboard' },
    { path: '/tasks', label: 'Tasks' },
    { path: '/calendar', label: 'Calendar' },
    { path: '/study', label: 'Study' },
    { path: '/goals', label: 'Goals' },
    { path: '/settings', label: 'Settings' }
  ];

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Navigation Test</CardTitle>
        <p className="text-sm text-muted-foreground">
          Current route: <code>{location.pathname}</code>
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {testRoutes.map((route) => (
          <Button
            key={route.path}
            variant={location.pathname === route.path ? "default" : "outline"}
            className="w-full justify-start"
            onClick={() => {
              console.log(`Navigating to: ${route.path}`);
              navigate(route.path);
            }}
          >
            {route.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};