# AI Provider Selection Interface

A comprehensive interface for selecting and managing AI providers in the StudyFlow AI application. This system allows users to choose between multiple AI providers (DeepSeek, OpenAI, Claude, Gemini) with intelligent recommendations and seamless switching without losing conversation context.

## Features

### 🎯 Core Functionality
- **Multi-Provider Support**: Switch between DeepSeek, OpenAI, Anthropic Claude, Google Gemini, and Edge Functions
- **Context Preservation**: Maintain conversation history when switching providers
- **Intelligent Recommendations**: AI-powered provider suggestions based on performance and capabilities
- **Real-time Health Monitoring**: Live status updates for all providers
- **Capability Matching**: Automatic provider selection based on task requirements

### 🔧 Components

#### ProviderSelector
Main component for provider selection with capability indicators.

```tsx
import { ProviderSelector } from '@/features/ai-tutor/components/ProviderSelector';

<ProviderSelector
  currentProvider="deepseek"
  onProviderChange={(providerId) => console.log('Switched to:', providerId)}
  showComparison={true}
  compact={false}
/>
```

**Props:**
- `currentProvider?: string` - Currently selected provider ID
- `onProviderChange?: (providerId: string) => void` - Callback when provider changes
- `showComparison?: boolean` - Show comparison table
- `compact?: boolean` - Render in compact mode
- `className?: string` - Additional CSS classes

#### ProviderComparison
Side-by-side comparison of provider capabilities and performance.

```tsx
import { ProviderComparison } from '@/features/ai-tutor/components/ProviderComparison';

<ProviderComparison
  selectedProviders={['deepseek', 'openai']}
  onProviderSelect={(providerId) => console.log('Selected:', providerId)}
  showRecommendations={true}
/>
```

**Props:**
- `selectedProviders?: string[]` - Highlighted providers in comparison
- `onProviderSelect?: (providerId: string) => void` - Provider selection callback
- `showRecommendations?: boolean` - Display recommendation section
- `className?: string` - Additional CSS classes

#### ProviderSelectionModal
Complete modal interface combining selection and comparison.

```tsx
import { ProviderSelectionModal } from '@/features/ai-tutor/components/ProviderSelectionModal';

<ProviderSelectionModal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  onProviderChange={(providerId) => console.log('Changed to:', providerId)}
  currentProvider="deepseek"
  preserveContext={true}
/>
```

**Props:**
- `isOpen: boolean` - Modal visibility state
- `onClose: () => void` - Close modal callback
- `onProviderChange?: (providerId: string) => void` - Provider change callback
- `currentProvider?: string` - Currently active provider
- `preserveContext?: boolean` - Whether to preserve conversation context

### 🎣 Hooks

#### useProviderSelection
Main hook for managing provider selection state and operations.

```tsx
import { useProviderSelection } from '@/features/ai-tutor/hooks/useProviderSelection';

const {
  // State
  currentProvider,
  availableProviders,
  isLoading,
  error,
  
  // Computed
  onlineProviders,
  degradedProviders,
  offlineProviders,
  currentProviderInfo,
  recommendedProvider,
  hasHealthyProviders,
  
  // Actions
  switchProvider,
  resetToDefaultProvider,
  refreshProviders,
  
  // Queries
  getProviderRecommendations,
  getBestProviderForCapability,
  canSwitchProvider,
  getProviderComparison,
  
  // Utilities
  isProviderAvailable,
  getProviderById
} = useProviderSelection();
```

## Provider Configuration

### Supported Providers

1. **DeepSeek** (Primary)
   - Type: Direct API
   - Capabilities: Text generation, Code generation, Reasoning, Streaming
   - Priority: 1 (Highest)
   - Cost: Low

2. **Edge Function Professional** (Secondary)
   - Type: Edge Function
   - Capabilities: Text generation, Reasoning, Creative writing, Streaming
   - Priority: 2
   - Cost: High

3. **OpenAI** (Tertiary)
   - Type: Direct API
   - Capabilities: Text generation, Code generation, Reasoning, Creative writing, Streaming
   - Priority: 3
   - Cost: High

4. **Anthropic Claude** (Quaternary)
   - Type: Direct API
   - Capabilities: Text generation, Reasoning, Creative writing, Code generation, Streaming
   - Priority: 4
   - Cost: High

5. **Google Gemini** (Final)
   - Type: Direct API
   - Capabilities: Text generation, Reasoning, Creative writing, Streaming
   - Priority: 5
   - Cost: Medium

### Provider Health Status

- **Online**: Fully operational and responsive
- **Degraded**: Operational but with performance issues
- **Offline**: Unavailable or experiencing critical issues

## Usage Examples

### Basic Provider Selection

```tsx
import { ProviderSelector } from '@/features/ai-tutor/components/ProviderSelector';

function MyComponent() {
  const handleProviderChange = (providerId: string) => {
    console.log('Switched to provider:', providerId);
  };

  return (
    <ProviderSelector
      onProviderChange={handleProviderChange}
      showComparison={true}
    />
  );
}
```

### Advanced Provider Management

```tsx
import { useProviderSelection } from '@/features/ai-tutor/hooks/useProviderSelection';

function AdvancedProviderManager() {
  const {
    currentProvider,
    availableProviders,
    switchProvider,
    getProviderRecommendations
  } = useProviderSelection();

  const handleSmartSwitch = async () => {
    const recommendations = getProviderRecommendations({
      preferSpeed: true,
      requiredCapabilities: ['code-generation']
    });

    if (recommendations.length > 0) {
      const result = await switchProvider(recommendations[0].providerId);
      if (result.success) {
        console.log('Switched to recommended provider');
      }
    }
  };

  return (
    <div>
      <p>Current: {currentProvider}</p>
      <button onClick={handleSmartSwitch}>
        Switch to Best Provider for Coding
      </button>
    </div>
  );
}
```

### Modal Integration

```tsx
import { useState } from 'react';
import { ProviderSelectionModal } from '@/features/ai-tutor/components/ProviderSelectionModal';

function ChatInterface() {
  const [showProviderModal, setShowProviderModal] = useState(false);
  const [currentProvider, setCurrentProvider] = useState('deepseek');

  return (
    <div>
      <button onClick={() => setShowProviderModal(true)}>
        Select AI Provider
      </button>
      
      <ProviderSelectionModal
        isOpen={showProviderModal}
        onClose={() => setShowProviderModal(false)}
        onProviderChange={setCurrentProvider}
        currentProvider={currentProvider}
      />
    </div>
  );
}
```

## Recommendation Algorithm

The system uses a sophisticated scoring algorithm to recommend providers:

### Scoring Factors

1. **Status Score** (40 points max)
   - Online: 40 points
   - Degraded: 20 points
   - Offline: 0 points

2. **Priority Score** (30 points max)
   - Based on provider priority (lower number = higher score)

3. **Performance Score** (20 points max)
   - Response time under 500ms: 15 points
   - Response time under 1000ms: 10 points
   - Error rate under 5%: 10 points

4. **Capability Score** (10 points max)
   - 2 points per capability
   - Bonus for comprehensive capabilities

### Preference Modifiers

- **Speed Preference**: Bonus for fast response times
- **Quality Preference**: Bonus for reasoning capabilities and professional services
- **Cost Preference**: Bonus for cost-effective providers

## Accessibility

The provider selection interface is fully accessible:

- **Keyboard Navigation**: Full keyboard support with focus management
- **Screen Readers**: Proper ARIA labels and semantic HTML
- **High Contrast**: Support for high contrast modes
- **Scalable Text**: Responsive to text scaling preferences

## Testing

### Unit Tests

```bash
npm test src/features/ai-tutor/components/__tests__/ProviderSelector.test.tsx
npm test src/features/ai-tutor/hooks/__tests__/useProviderSelection.test.ts
```

### Integration Tests

The components are tested with realistic provider data and user interactions:

- Provider switching scenarios
- Error handling and recovery
- Recommendation accuracy
- Performance under load

## Performance Considerations

- **Lazy Loading**: Components load only when needed
- **Memoization**: Expensive calculations are memoized
- **Debounced Updates**: Provider health checks are debounced
- **Efficient Rendering**: Virtual scrolling for large provider lists

## Security

- **API Key Protection**: Secure storage and transmission of API keys
- **Input Validation**: All user inputs are validated
- **Rate Limiting**: Built-in rate limiting for provider switches
- **Audit Logging**: All provider changes are logged for security

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

When adding new providers or modifying the selection interface:

1. Update provider configurations in `ai-provider-router.ts`
2. Add corresponding tests
3. Update documentation
4. Ensure accessibility compliance
5. Test with real API endpoints

## Troubleshooting

### Common Issues

1. **Provider Not Available**
   - Check API key configuration
   - Verify network connectivity
   - Check provider health status

2. **Slow Switching**
   - Check network latency
   - Verify provider response times
   - Consider using fallback providers

3. **Context Loss**
   - Ensure `preserveContext` is enabled
   - Check session storage
   - Verify provider compatibility

### Debug Mode

Enable debug logging:

```tsx
import { logger } from '@/services/logging/logger';

logger.setLevel('debug');
```

This will provide detailed logs of provider selection operations and performance metrics.