# Service Status Indicator Component

A comprehensive React component for displaying real-time AI service health status with color-coded indicators, tooltips, and manual reset functionality.

## Features

- **Real-time Health Monitoring**: Automatically polls service health at configurable intervals
- **Color-coded Status Indicators**: Visual status representation with green (healthy), yellow (degraded), and red (unhealthy) indicators
- **Provider Details**: Detailed information about individual AI providers including response times, error rates, and circuit breaker states
- **Manual Service Reset**: One-click service reset functionality with loading states
- **Compact Mode**: Space-efficient display for headers and sidebars
- **Tooltips**: Rich hover information in compact mode
- **Accessibility**: Full keyboard navigation and screen reader support
- **Responsive Design**: Adapts to different screen sizes and layouts

## Components

### ServiceStatusIndicator

The main component that displays service health status.

```tsx
import { ServiceStatusIndicator } from '@/features/ai-tutor/components/ServiceStatusIndicator';

// Basic usage
<ServiceStatusIndicator />

// Compact mode for headers
<ServiceStatusIndicator compact={true} showResetButton={false} />

// Custom configuration
<ServiceStatusIndicator
  showDetails={true}
  showResetButton={true}
  refreshInterval={10000}
  onServiceReset={() => console.log('Services reset')}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `showDetails` | `boolean` | `true` | Whether to show detailed provider information |
| `showResetButton` | `boolean` | `true` | Whether to show manual reset button |
| `refreshInterval` | `number` | `5000` | Refresh interval in milliseconds |
| `compact` | `boolean` | `false` | Compact mode for smaller displays |
| `className` | `string` | - | Custom CSS className |
| `onServiceReset` | `() => void` | - | Callback when service is reset |

### useServiceStatus Hook

A custom hook for managing service status functionality.

```tsx
import { useServiceStatus } from '@/features/ai-tutor/hooks/useServiceStatus';

const MyComponent = () => {
  const serviceStatus = useServiceStatus({
    refreshInterval: 10000,
    onHealthChange: (health) => console.log('Health changed:', health.overall),
    onServiceReset: () => console.log('Services reset'),
    onError: (error) => console.error('Service error:', error)
  });

  return (
    <div>
      <p>Status: {serviceStatus.getOverallStatusText()}</p>
      <p>Online Providers: {serviceStatus.onlineProviders}/{serviceStatus.totalProviders}</p>
      <p>Success Rate: {serviceStatus.successRate.toFixed(1)}%</p>
      <button onClick={() => serviceStatus.resetServices()}>
        Reset Services
      </button>
    </div>
  );
};
```

#### Hook Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `refreshInterval` | `number` | `5000` | Auto-refresh interval in milliseconds |
| `autoStart` | `boolean` | `true` | Whether to start monitoring immediately |
| `onHealthChange` | `(health: ServiceHealthStatus) => void` | - | Callback when service health changes |
| `onServiceReset` | `() => void` | - | Callback when service reset completes |
| `onError` | `(error: string) => void` | - | Callback when errors occur |

#### Hook Return Value

| Property | Type | Description |
|----------|------|-------------|
| `health` | `ServiceHealthStatus \| null` | Current service health status |
| `isLoading` | `boolean` | Whether health status is being fetched |
| `error` | `string \| null` | Current error message |
| `lastUpdate` | `Date \| null` | Timestamp of last health update |
| `isResetting` | `boolean` | Whether services are being reset |
| `isHealthy` | `boolean` | Whether overall status is healthy |
| `isDegraded` | `boolean` | Whether overall status is degraded |
| `isUnhealthy` | `boolean` | Whether overall status is unhealthy |
| `onlineProviders` | `number` | Number of online providers |
| `totalProviders` | `number` | Total number of providers |
| `successRate` | `number` | Success rate percentage |
| `averageResponseTime` | `number` | Average response time in milliseconds |

#### Hook Actions

| Method | Description |
|--------|-------------|
| `refresh()` | Manually refresh service health |
| `resetServices()` | Reset all services |
| `startMonitoring()` | Start automatic monitoring |
| `stopMonitoring()` | Stop automatic monitoring |
| `clearError()` | Clear error state |
| `getProviderStatus(id)` | Get status of specific provider |
| `isProviderOnline(id)` | Check if provider is online |
| `getOverallStatusText()` | Get formatted status text |

## Service Health Status

The component displays health information from the Unified AI Service, including:

### Overall Status
- **Healthy**: All services operating normally
- **Degraded**: Some services experiencing issues but still functional
- **Unhealthy**: Critical services are down or experiencing severe issues

### Provider Information
- **Status**: online, degraded, or offline
- **Response Time**: Average response time in milliseconds
- **Error Rate**: Percentage of failed requests
- **Last Success**: Timestamp of last successful request
- **Circuit Breaker State**: closed, half-open, or open

### Metrics
- **Success Rate**: Percentage of successful requests
- **Average Response Time**: Overall average response time
- **Total Requests**: Number of requests processed
- **Failed Requests**: Number of failed requests

## Usage Examples

### Header Integration

```tsx
const AppHeader = () => (
  <header className="flex items-center justify-between p-4">
    <h1>AI Tutor Dashboard</h1>
    <div className="flex items-center gap-4">
      <ServiceStatusIndicator compact={true} showResetButton={false} />
      <UserMenu />
    </div>
  </header>
);
```

### Dashboard Widget

```tsx
const DashboardWidget = () => (
  <Card>
    <CardHeader>
      <CardTitle>Service Status</CardTitle>
    </CardHeader>
    <CardContent>
      <ServiceStatusIndicator
        showDetails={true}
        refreshInterval={10000}
        onServiceReset={() => {
          toast({
            title: 'Services Reset',
            description: 'All AI services have been reset successfully.'
          });
        }}
      />
    </CardContent>
  </Card>
);
```

### Custom Status Display

```tsx
const CustomStatusDisplay = () => {
  const { health, isHealthy, onlineProviders, totalProviders } = useServiceStatus();

  return (
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${
        isHealthy ? 'bg-green-500' : 'bg-red-500'
      }`} />
      <span>
        AI Services ({onlineProviders}/{totalProviders} online)
      </span>
    </div>
  );
};
```

## Styling

The component uses Tailwind CSS classes and can be customized with:

- Custom CSS classes via the `className` prop
- CSS custom properties for theming
- Tailwind utility classes for responsive design

### CSS Classes

```css
/* Custom status colors */
.status-online { @apply bg-green-500 text-green-50; }
.status-degraded { @apply bg-yellow-500 text-yellow-50; }
.status-offline { @apply bg-red-500 text-red-50; }

/* Animations */
.status-pulse { animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite; }
```

## Accessibility

The component follows accessibility best practices:

- **Keyboard Navigation**: Full keyboard support for all interactive elements
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Color Contrast**: High contrast colors for status indicators
- **Focus Management**: Visible focus indicators
- **Tooltips**: Accessible tooltip implementation

## Testing

Comprehensive test coverage includes:

- Component rendering in different states
- User interactions (reset button, tooltips)
- Hook functionality and state management
- Error handling scenarios
- Accessibility compliance

```bash
# Run tests
npm test ServiceStatusIndicator
npm test useServiceStatus
```

## Dependencies

- React 18+
- Lucide React (icons)
- Radix UI components (Button, Badge, Tooltip, etc.)
- Tailwind CSS
- Unified AI Service
- Circuit Breaker Manager

## Integration Requirements

To use this component, ensure the following services are available:

1. **Unified AI Service**: Provides service health status
2. **Circuit Breaker Manager**: Manages circuit breaker states
3. **Logger Service**: For error logging
4. **Toast System**: For user notifications (optional)

## Performance Considerations

- **Polling Optimization**: Configurable refresh intervals to balance real-time updates with performance
- **Memoization**: React.memo and useMemo for efficient re-renders
- **Lazy Loading**: Components load only when needed
- **Error Boundaries**: Graceful error handling without crashes

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When contributing to this component:

1. Follow the existing code style and patterns
2. Add tests for new functionality
3. Update documentation for API changes
4. Ensure accessibility compliance
5. Test across different screen sizes and devices