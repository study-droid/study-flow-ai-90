# Request Queue System Documentation

## Overview

The Request Queue System provides intelligent request queuing, rate limiting, and retry logic for AI tutor interactions. It ensures reliable service delivery while managing API quotas and handling failures gracefully.

## Architecture

### Core Components

1. **RequestQueueService** - Core service managing the queue
2. **useRequestQueue** - React hook for queue integration
3. **QueueStatusIndicator** - UI component for status display

### Key Features

- **Intelligent Queuing**: Priority-based request ordering
- **Rate Limiting**: Configurable limits per minute and burst protection
- **Retry Logic**: Exponential backoff with jitter
- **Real-time Status**: Live queue monitoring and user feedback
- **Error Recovery**: Automatic fallback and recovery mechanisms

## RequestQueueService

### Configuration

```typescript
const queueService = new RequestQueueService(
  // Rate limit configuration
  {
    maxRequestsPerMinute: 30,
    maxConcurrentRequests: 3,
    burstLimit: 5,
    cooldownPeriod: 2000
  },
  // Retry configuration
  {
    baseDelay: 1000,
    maxDelay: 30000,
    backoffMultiplier: 2,
    jitter: true
  }
);
```

### Methods

#### `queueRequest<T>(message, sessionId, options, priority, maxRetries): Promise<T>`

Queues a request for processing with the specified priority and retry settings.

**Parameters:**
- `message`: The message to send to the AI
- `sessionId`: Unique session identifier
- `options`: Request options including event handlers
- `priority`: Request priority (higher numbers = higher priority)
- `maxRetries`: Maximum number of retry attempts

**Returns:** Promise that resolves with the AI response

#### `getStatus(): QueueStatus`

Returns current queue status including:
- Queue length and processing count
- Rate limiting status
- Estimated wait times
- Request history metrics

#### `onStatusChange(callback): () => void`

Subscribes to queue status changes. Returns unsubscribe function.

#### `clearQueue(): void`

Clears all pending requests and rejects their promises.

#### `pauseProcessing() / resumeProcessing(): void`

Pauses or resumes queue processing.

### Events

The service emits various events through the `onEvent` callback:

- `queue_status`: Position and estimated wait time
- `processing_start`: Request processing begins
- `retry_attempt`: Retry attempt with count and delay

## useRequestQueue Hook

### Usage

```typescript
const {
  queueRequest,
  status,
  activeRequests,
  isQueueActive,
  isRateLimited,
  estimatedWaitTime,
  clearQueue,
  pauseQueue,
  resumeQueue,
  getQueueStats
} = useRequestQueue({
  priority: 1,
  maxRetries: 3,
  onStatusChange: (status) => console.log(status)
});
```

### Options

- `priority`: Default priority for requests (0-10)
- `maxRetries`: Default maximum retry attempts
- `onStatusChange`: Callback for status updates

### Return Values

- `queueRequest`: Function to queue new requests
- `status`: Current queue status object
- `activeRequests`: Array of currently tracked requests
- `isQueueActive`: Boolean indicating if queue has activity
- `isRateLimited`: Boolean indicating rate limit status
- `estimatedWaitTime`: Estimated wait time in milliseconds
- `clearQueue/pauseQueue/resumeQueue`: Queue management functions
- `getQueueStats`: Function returning formatted statistics

## QueueStatusIndicator Component

### Usage

```typescript
<QueueStatusIndicator 
  className="custom-styles"
  showDetails={true}
/>
```

### Props

- `className`: Additional CSS classes
- `showDetails`: Whether to show detailed information (wait times, requests/min)

### Features

- **Auto-hide**: Only visible when there's queue activity
- **Status Icons**: Different icons for different states
- **Color Coding**: Visual indication of queue health
- **Time Formatting**: Human-readable wait time estimates

## Rate Limiting

### Configuration

Rate limiting is configured with multiple parameters:

```typescript
interface RateLimitConfig {
  maxRequestsPerMinute: number;    // Long-term rate limit
  maxConcurrentRequests: number;   // Concurrent processing limit
  burstLimit: number;              // Short-term burst protection
  cooldownPeriod: number;          // Cooldown after rate limit hit
}
```

### Behavior

1. **Request History**: Tracks timestamps of recent requests
2. **Burst Protection**: Prevents too many requests in short time
3. **Concurrent Limiting**: Limits simultaneous processing
4. **Automatic Recovery**: Resumes processing when limits reset

## Retry Logic

### Configuration

```typescript
interface RetryConfig {
  baseDelay: number;        // Initial retry delay
  maxDelay: number;         // Maximum retry delay
  backoffMultiplier: number; // Exponential backoff factor
  jitter: boolean;          // Add randomization to prevent thundering herd
}
```

### Retry Conditions

Requests are retried for:
- Network errors (timeouts, connection issues)
- Rate limit errors (429 status)
- Server errors (502, 503, 504)
- Temporary service unavailability

Requests are NOT retried for:
- Authentication errors (401, 403)
- Invalid request format (400)
- Not found errors (404)

### Exponential Backoff

Delay calculation: `baseDelay * (backoffMultiplier ^ (retryCount - 1))`

With jitter: `delay * (0.5 + random() * 0.5)`

## Error Handling

### Error Classification

The system classifies errors into categories:
- **Retryable**: Can be retried with backoff
- **Non-retryable**: Permanent failures
- **Rate-limited**: Temporary quota issues

### User Feedback

- **Queue Position**: Shows position in queue
- **Wait Times**: Estimates based on current load
- **Retry Status**: Indicates retry attempts
- **Error Messages**: User-friendly error descriptions

## Integration Examples

### Basic Usage

```typescript
// Queue a simple request
const response = await queueRequest(
  'Explain quantum physics',
  'session-123'
);
```

### Advanced Usage with Events

```typescript
const response = await queueRequest(
  'Complex calculation',
  'session-123',
  {
    onEvent: (event) => {
      switch (event.type) {
        case 'queue_status':
          console.log(`Position: ${event.data.position}`);
          break;
        case 'processing_start':
          console.log('Processing started');
          break;
        case 'retry_attempt':
          console.log(`Retry ${event.data.retryCount}`);
          break;
      }
    }
  },
  5, // High priority
  5  // Max retries
);
```

### Status Monitoring

```typescript
const { status, getQueueStats } = useRequestQueue();

// Real-time status
console.log('Queue length:', status?.queueLength);
console.log('Processing:', status?.processingCount);

// Formatted statistics
const stats = getQueueStats();
console.log('Total queued:', stats?.totalQueued);
console.log('Average wait:', stats?.averageWaitTime);
```

## Performance Considerations

### Memory Management

- Request history is automatically cleaned up
- Completed requests are removed after 5 seconds
- Queue size is monitored to prevent memory leaks

### Optimization Tips

1. **Use appropriate priorities** - Reserve high priorities for urgent requests
2. **Configure rate limits** - Match your API quotas
3. **Monitor queue depth** - Adjust concurrent limits based on performance
4. **Handle errors gracefully** - Provide fallback options for users

## Testing

### Unit Tests

The system includes comprehensive unit tests covering:
- Queue operations and priority handling
- Rate limiting behavior
- Retry logic and error handling
- Status monitoring and events

### Integration Tests

Integration tests verify:
- End-to-end request flow
- Error recovery scenarios
- UI component behavior
- Hook functionality

### Manual Testing

Use the `QueueIntegrationExample` component to manually test:
- Queue behavior under load
- Rate limiting in action
- Error handling and recovery
- UI responsiveness

## Troubleshooting

### Common Issues

1. **Requests stuck in queue**
   - Check rate limit configuration
   - Verify service health
   - Look for network connectivity issues

2. **High retry rates**
   - Review API key validity
   - Check service availability
   - Adjust retry configuration

3. **Poor performance**
   - Reduce concurrent request limit
   - Increase rate limit cooldown
   - Monitor memory usage

### Debug Information

Enable debug logging to see:
- Request queue operations
- Rate limiting decisions
- Retry attempts and delays
- Error classifications

```typescript
// Enable debug logging
import { logger } from '@/services/logging/logger';
logger.setLevel('debug');
```

## Future Enhancements

Planned improvements include:
- **Adaptive rate limiting** based on service response times
- **Request deduplication** for identical messages
- **Persistent queue** across browser sessions
- **Advanced analytics** and performance metrics
- **Load balancing** across multiple AI providers