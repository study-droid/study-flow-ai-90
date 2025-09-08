# Backend Go Lang Migration Design Document

## Overview

This design document outlines the architecture for migrating StudyFlow AI's backend from Supabase Edge Functions (TypeScript/Deno) to a comprehensive Go Lang backend system. The new architecture will provide improved performance, better concurrency handling, type safety, and easier deployment while maintaining 100% API compatibility with the existing frontend.

## Architecture

### High-Level Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Load Balancer │    │   Go Backend    │
│   (React/TS)    │◄──►│   (Nginx/Traefik)│◄──►│   (Gin/Fiber)   │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                                        │
                       ┌─────────────────┐             │
                       │   PostgreSQL    │◄────────────┤
                       │   Database      │             │
                       └─────────────────┘             │
                                                        │
                       ┌─────────────────┐             │
                       │   Redis Cache   │◄────────────┤
                       │   & Sessions    │             │
                       └─────────────────┘             │
                                                        │
                       ┌─────────────────┐             │
                       │   AI Providers  │◄────────────┘
                       │ OpenAI/Gemini/  │
                       │ Claude/DeepSeek │
                       └─────────────────┘
```

### Microservices Architecture

The Go backend will be structured as a modular monolith with clear service boundaries that can be easily extracted into microservices later:

```
go-backend/
├── cmd/
│   ├── server/           # Main application entry point
│   └── migrate/          # Database migration tool
├── internal/
│   ├── api/              # HTTP handlers and routing
│   ├── auth/             # Authentication & authorization
│   ├── ai/               # AI service integrations
│   ├── database/         # Database layer & models
│   ├── cache/            # Redis caching layer
│   ├── websocket/        # Real-time WebSocket handling
│   ├── security/         # Security utilities & encryption
│   ├── monitoring/       # Metrics, logging, health checks
│   └── config/           # Configuration management
├── pkg/
│   ├── middleware/       # Reusable HTTP middleware
│   ├── utils/            # Utility functions
│   └── types/            # Shared type definitions
├── migrations/           # Database migration files
├── docs/                 # API documentation
└── scripts/              # Build and deployment scripts
```

## Components and Interfaces

### 1. HTTP Server Layer (Gin Framework)

**Purpose:** Handle HTTP requests, routing, and middleware

**Key Components:**
- Router configuration with middleware chain
- Request/response handling with proper serialization
- CORS support for frontend compatibility
- Rate limiting and request validation
- Graceful shutdown handling

**Interface:**
```go
type Server interface {
    Start(addr string) error
    Stop(ctx context.Context) error
    RegisterRoutes(routes []Route)
}

type Handler interface {
    Handle(c *gin.Context)
}
```

### 2. Authentication Service

**Purpose:** JWT validation, user session management, and authorization

**Key Components:**
- JWT token validation compatible with Supabase Auth
- User permission checking
- Session management with Redis
- Rate limiting per user
- Security event logging

**Interface:**
```go
type AuthService interface {
    ValidateToken(token string) (*User, error)
    CheckPermission(userID string, resource string, action string) error
    CreateSession(userID string) (*Session, error)
    InvalidateSession(sessionID string) error
}
```

### 3. Database Layer (GORM + PostgreSQL)

**Purpose:** Type-safe database operations with connection pooling

**Key Components:**
- GORM models matching Supabase schema
- Connection pooling with configurable limits
- Transaction management
- Migration system
- Query optimization and caching

**Interface:**
```go
type Repository interface {
    Create(ctx context.Context, entity interface{}) error
    GetByID(ctx context.Context, id string, entity interface{}) error
    Update(ctx context.Context, entity interface{}) error
    Delete(ctx context.Context, id string, entityType interface{}) error
    List(ctx context.Context, filter Filter, entities interface{}) error
}
```

### 4. AI Service Integration Layer

**Purpose:** Multi-provider AI integration with fallback and streaming support

**Key Components:**
- Provider abstraction layer
- Automatic fallback between providers
- Streaming response handling
- Rate limiting and circuit breakers
- Response validation and filtering

**Interface:**
```go
type AIProvider interface {
    GenerateResponse(ctx context.Context, req AIRequest) (*AIResponse, error)
    StreamResponse(ctx context.Context, req AIRequest) (<-chan AIChunk, error)
    GetModels() []string
    IsAvailable() bool
}

type AIService interface {
    ProcessRequest(ctx context.Context, req AIRequest) (*AIResponse, error)
    StreamRequest(ctx context.Context, req AIRequest) (<-chan AIChunk, error)
    GetAvailableProviders() []string
}
```

### 5. Caching Layer (Redis)

**Purpose:** High-performance caching and session storage

**Key Components:**
- Redis connection management
- Cache key strategies
- TTL management
- Session storage
- Distributed locking for concurrent operations

**Interface:**
```go
type CacheService interface {
    Set(ctx context.Context, key string, value interface{}, ttl time.Duration) error
    Get(ctx context.Context, key string, dest interface{}) error
    Delete(ctx context.Context, key string) error
    Exists(ctx context.Context, key string) (bool, error)
}
```

### 6. WebSocket Service

**Purpose:** Real-time communication for study sessions and notifications

**Key Components:**
- WebSocket connection management
- Room-based messaging for study sessions
- Authentication for WebSocket connections
- Message broadcasting and routing
- Connection cleanup and recovery

**Interface:**
```go
type WebSocketService interface {
    HandleConnection(w http.ResponseWriter, r *http.Request)
    BroadcastToRoom(roomID string, message interface{}) error
    SendToUser(userID string, message interface{}) error
    JoinRoom(connectionID, roomID string) error
    LeaveRoom(connectionID, roomID string) error
}
```

### 7. Security Service

**Purpose:** Encryption, API key management, and security monitoring

**Key Components:**
- AES-256 encryption for sensitive data
- API key vault management with rotation
- Security event logging
- Input validation and sanitization
- CSRF protection

**Interface:**
```go
type SecurityService interface {
    Encrypt(data []byte) ([]byte, error)
    Decrypt(encryptedData []byte) ([]byte, error)
    StoreAPIKey(provider string, key string) error
    GetAPIKey(provider string) (string, error)
    LogSecurityEvent(event SecurityEvent) error
}
```

### 8. Monitoring Service

**Purpose:** Metrics collection, logging, and health monitoring

**Key Components:**
- Prometheus metrics integration
- Structured logging with levels
- Health check endpoints
- Performance monitoring
- Error tracking and alerting

**Interface:**
```go
type MonitoringService interface {
    RecordMetric(name string, value float64, labels map[string]string)
    LogError(err error, context map[string]interface{})
    LogInfo(message string, context map[string]interface{})
    HealthCheck() HealthStatus
}
```

## Data Models

### Core Entities

The Go backend will use GORM models that exactly match the current Supabase schema:

```go
type User struct {
    ID        string    `gorm:"primaryKey" json:"id"`
    Email     string    `gorm:"unique;not null" json:"email"`
    CreatedAt time.Time `json:"created_at"`
    UpdatedAt time.Time `json:"updated_at"`
    Profile   Profile   `gorm:"foreignKey:UserID" json:"profile,omitempty"`
}

type Profile struct {
    ID       string `gorm:"primaryKey" json:"id"`
    UserID   string `gorm:"not null" json:"user_id"`
    FullName string `json:"full_name"`
    Avatar   string `json:"avatar_url"`
}

type Task struct {
    ID          string    `gorm:"primaryKey" json:"id"`
    UserID      string    `gorm:"not null;index" json:"user_id"`
    Title       string    `gorm:"not null" json:"title"`
    Description string    `json:"description"`
    Priority    string    `json:"priority"`
    Status      string    `json:"status"`
    DueDate     time.Time `json:"due_date"`
    CreatedAt   time.Time `json:"created_at"`
    UpdatedAt   time.Time `json:"updated_at"`
}

type StudySession struct {
    ID        string    `gorm:"primaryKey" json:"id"`
    UserID    string    `gorm:"not null;index" json:"user_id"`
    Duration  int       `json:"duration"`
    Subject   string    `json:"subject"`
    StartTime time.Time `json:"start_time"`
    EndTime   time.Time `json:"end_time"`
    CreatedAt time.Time `json:"created_at"`
}
```

### AI Integration Models

```go
type AIRequest struct {
    Provider    string                 `json:"provider"`
    Model       string                 `json:"model"`
    Messages    []AIMessage            `json:"messages"`
    Temperature float64                `json:"temperature"`
    MaxTokens   int                    `json:"max_tokens"`
    Stream      bool                   `json:"stream"`
    Metadata    map[string]interface{} `json:"metadata"`
}

type AIResponse struct {
    Provider string    `json:"provider"`
    Model    string    `json:"model"`
    Content  string    `json:"content"`
    Usage    AIUsage   `json:"usage"`
    Metadata AIMetadata `json:"metadata"`
}

type AIMessage struct {
    Role    string `json:"role"`
    Content string `json:"content"`
}
```

## Error Handling

### Error Types and Strategies

```go
type AppError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Details string `json:"details,omitempty"`
    Status  int    `json:"-"`
}

// Error categories
const (
    ErrCodeValidation    = "VALIDATION_ERROR"
    ErrCodeAuthentication = "AUTH_ERROR"
    ErrCodeAuthorization = "AUTHZ_ERROR"
    ErrCodeNotFound      = "NOT_FOUND"
    ErrCodeInternal      = "INTERNAL_ERROR"
    ErrCodeRateLimit     = "RATE_LIMIT"
    ErrCodeAIProvider    = "AI_PROVIDER_ERROR"
)
```

### Error Handling Middleware

- Global error handler for consistent error responses
- Error logging with context and stack traces
- Circuit breaker for external service failures
- Retry logic with exponential backoff
- Graceful degradation for non-critical services

## Testing Strategy

### Unit Testing
- Test coverage target: 90%+
- Mock external dependencies (database, AI providers, cache)
- Table-driven tests for business logic
- Benchmark tests for performance-critical code

### Integration Testing
- Database integration tests with test containers
- AI provider integration tests with mock servers
- WebSocket connection testing
- End-to-end API testing

### Performance Testing
- Load testing with realistic traffic patterns
- Memory leak detection
- Database query performance testing
- Concurrent request handling validation

### Security Testing
- Authentication and authorization testing
- Input validation and SQL injection prevention
- Rate limiting effectiveness
- Encryption/decryption validation

## Deployment Architecture

### Container Strategy
```dockerfile
# Multi-stage build for minimal production image
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o main cmd/server/main.go

FROM alpine:latest
RUN apk --no-cache add ca-certificates
WORKDIR /root/
COPY --from=builder /app/main .
COPY --from=builder /app/migrations ./migrations
CMD ["./main"]
```

### Infrastructure Components

1. **Application Servers:** Multiple Go backend instances behind load balancer
2. **Database:** PostgreSQL with read replicas for scaling
3. **Cache:** Redis cluster for high availability
4. **Load Balancer:** Nginx or Traefik for request distribution
5. **Monitoring:** Prometheus + Grafana for metrics and alerting

### Configuration Management

```go
type Config struct {
    Server   ServerConfig   `yaml:"server"`
    Database DatabaseConfig `yaml:"database"`
    Redis    RedisConfig    `yaml:"redis"`
    AI       AIConfig       `yaml:"ai"`
    Security SecurityConfig `yaml:"security"`
}
```

Environment-based configuration with validation:
- Development: Local PostgreSQL + Redis
- Staging: Managed services with reduced resources
- Production: High-availability setup with monitoring

### Migration Strategy

1. **Phase 1:** Deploy Go backend alongside existing Supabase system
2. **Phase 2:** Gradual traffic migration using feature flags
3. **Phase 3:** Full cutover with rollback capability
4. **Phase 4:** Decommission Supabase Edge Functions

The design ensures zero-downtime migration with the ability to rollback at any stage.