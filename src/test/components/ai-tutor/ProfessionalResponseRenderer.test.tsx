/**
 * Tests for Professional Response Renderer
 * Component tests for error boundaries and performance optimizations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ProfessionalResponseRenderer, ResponseErrorBoundary } from '../../../components/ai-tutor/ProfessionalResponseRenderer';
import type { RequiredResponseStructure } from '../../../types/ai-tutor-schemas';

// Mock react-markdown
vi.mock('react-markdown', () => ({
  default: ({ children }: { children: string }) => <div data-testid="markdown">{children}</div>
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  RefreshCw: () => <div data-testid="refresh-icon" />,
  Clock: () => <div data-testid="clock-icon" />,
  Target: () => <div data-testid="target-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  Activity: () => <div data-testid="activity-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />
}));

// Mock UI components
vi.mock('../../../components/ui/button', () => ({
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  )
}));

vi.mock('../../../components/ui/card', () => ({
  Card: ({ children, className, ...props }: any) => (
    <div className={className} {...props}>{children}</div>
  ),
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>
}));

vi.mock('../../../components/ui/badge', () => ({
  Badge: ({ children, variant, className, ...props }: any) => (
    <span className={`badge ${variant} ${className}`} {...props}>{children}</span>
  )
}));

vi.mock('../../../lib/utils', () => ({
  cn: (...classes: (string | undefined)[]) => classes.filter(Boolean).join(' ')
}));

describe('ProfessionalResponseRenderer', () => {
  const mockStructuredResponse: RequiredResponseStructure = {
    formattedResponse: {
      content: '# Photosynthesis\n\nPhotosynthesis is the process by which plants convert sunlight into energy.',
      structure: {
        sections: [
          {
            title: 'Introduction',
            content: 'Basic introduction to photosynthesis',
            subsections: []
          }
        ],
        keyPoints: ['Plants use sunlight', 'Creates oxygen', 'Produces glucose'],
        examples: ['Trees in forest', 'Algae in water'],
        codeBlocks: [],
        conclusion: 'Photosynthesis is essential for life'
      }
    },
    qualityAssessment: {
      overall: 0.85,
      accuracy: 0.9,
      completeness: 0.8,
      clarity: 0.85,
      educational: 0.9,
      structure: 0.8,
      engagement: 0.75
    },
    processingMetadata: {
      processingTime: 1250,
      stepsCompleted: ['validation', 'processing', 'formatting'],
      warnings: [],
      optimizations: ['cached_retrieval', 'fast_path']
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Main Renderer', () => {
    it('should render structured response successfully', () => {
      render(
        <ProfessionalResponseRenderer 
          structured={mockStructuredResponse}
          responseType="explanation"
        />
      );

      expect(screen.getByText('Photosynthesis is the process by which plants convert sunlight into energy.')).toBeInTheDocument();
      expect(screen.getByText('Introduction')).toBeInTheDocument();
      expect(screen.getByText('Plants use sunlight')).toBeInTheDocument();
    });

    it('should display quality metrics', () => {
      render(
        <ProfessionalResponseRenderer 
          structured={mockStructuredResponse}
          responseType="explanation"
        />
      );

      expect(screen.getByText('85%')).toBeInTheDocument(); // Overall quality
      expect(screen.getByText('90%')).toBeInTheDocument(); // Accuracy
      expect(screen.getByText('1.3s')).toBeInTheDocument(); // Processing time
    });

    it('should show processing metadata', () => {
      render(
        <ProfessionalResponseRenderer 
          structured={mockStructuredResponse}
          responseType="explanation"
        />
      );

      expect(screen.getByText('cached_retrieval')).toBeInTheDocument();
      expect(screen.getByText('fast_path')).toBeInTheDocument();
      expect(screen.getByText('3 steps completed')).toBeInTheDocument();
    });

    it('should handle different response types', () => {
      const studyPlanResponse = {
        ...mockStructuredResponse,
        formattedResponse: {
          ...mockStructuredResponse.formattedResponse,
          content: '# Study Plan\n\nWeek 1: Basic concepts'
        }
      };

      render(
        <ProfessionalResponseRenderer 
          structured={studyPlanResponse}
          responseType="study_plan"
        />
      );

      expect(screen.getByText('Study Plan')).toBeInTheDocument();
    });

    it('should toggle between structured and raw view', async () => {
      render(
        <ProfessionalResponseRenderer 
          structured={mockStructuredResponse}
          responseType="explanation"
        />
      );

      const toggleButton = screen.getByText('Show Raw Data');
      expect(toggleButton).toBeInTheDocument();

      fireEvent.click(toggleButton);
      
      await waitFor(() => {
        expect(screen.getByText('Hide Raw Data')).toBeInTheDocument();
      });
    });

    it('should apply custom className', () => {
      render(
        <ProfessionalResponseRenderer 
          structured={mockStructuredResponse}
          responseType="explanation"
          className="custom-class"
        />
      );

      const container = screen.getByTestId('professional-response-renderer') || 
                       document.querySelector('.custom-class');
      expect(container).toBeInTheDocument();
    });

    it('should handle missing optional data gracefully', () => {
      const minimalResponse: RequiredResponseStructure = {
        formattedResponse: {
          content: 'Simple content',
          structure: {
            sections: [],
            keyPoints: [],
            examples: [],
            codeBlocks: [],
            conclusion: ''
          }
        },
        qualityAssessment: {
          overall: 0.7,
          accuracy: 0.7,
          completeness: 0.7,
          clarity: 0.7,
          educational: 0.7,
          structure: 0.7,
          engagement: 0.7
        },
        processingMetadata: {
          processingTime: 500,
          stepsCompleted: ['basic'],
          warnings: [],
          optimizations: []
        }
      };

      render(
        <ProfessionalResponseRenderer 
          structured={minimalResponse}
          responseType="explanation"
        />
      );

      expect(screen.getByText('Simple content')).toBeInTheDocument();
      expect(screen.getByText('70%')).toBeInTheDocument();
    });
  });

  describe('Performance Metrics Display', () => {
    it('should format processing time correctly', () => {
      const fastResponse = {
        ...mockStructuredResponse,
        processingMetadata: {
          ...mockStructuredResponse.processingMetadata,
          processingTime: 500
        }
      };

      render(
        <ProfessionalResponseRenderer 
          structured={fastResponse}
          responseType="explanation"
        />
      );

      expect(screen.getByText('0.5s')).toBeInTheDocument();
    });

    it('should show optimization indicators', () => {
      const optimizedResponse = {
        ...mockStructuredResponse,
        processingMetadata: {
          ...mockStructuredResponse.processingMetadata,
          optimizations: ['cache_hit', 'early_exit', 'compression']
        }
      };

      render(
        <ProfessionalResponseRenderer 
          structured={optimizedResponse}
          responseType="explanation"
        />
      );

      expect(screen.getByText('cache_hit')).toBeInTheDocument();
      expect(screen.getByText('early_exit')).toBeInTheDocument();
      expect(screen.getByText('compression')).toBeInTheDocument();
    });

    it('should display warnings when present', () => {
      const responseWithWarnings = {
        ...mockStructuredResponse,
        processingMetadata: {
          ...mockStructuredResponse.processingMetadata,
          warnings: ['Rate limit approaching', 'Cache miss']
        }
      };

      render(
        <ProfessionalResponseRenderer 
          structured={responseWithWarnings}
          responseType="explanation"
        />
      );

      expect(screen.getByText('Rate limit approaching')).toBeInTheDocument();
      expect(screen.getByText('Cache miss')).toBeInTheDocument();
    });
  });

  describe('Quality Visualization', () => {
    it('should color-code quality scores', () => {
      const highQualityResponse = {
        ...mockStructuredResponse,
        qualityAssessment: {
          ...mockStructuredResponse.qualityAssessment,
          overall: 0.95,
          accuracy: 0.98
        }
      };

      render(
        <ProfessionalResponseRenderer 
          structured={highQualityResponse}
          responseType="explanation"
        />
      );

      const qualityBadges = screen.getAllByText(/9[5-8]%/);
      expect(qualityBadges.length).toBeGreaterThan(0);
    });

    it('should show quality breakdown', () => {
      render(
        <ProfessionalResponseRenderer 
          structured={mockStructuredResponse}
          responseType="explanation"
        />
      );

      // Check for individual quality metrics
      expect(screen.getByText('90%')).toBeInTheDocument(); // Accuracy
      expect(screen.getByText('80%')).toBeInTheDocument(); // Completeness
      expect(screen.getByText('85%')).toBeInTheDocument(); // Clarity/Overall
    });
  });

  describe('Content Structure Display', () => {
    it('should render sections with proper hierarchy', () => {
      const multiSectionResponse = {
        ...mockStructuredResponse,
        formattedResponse: {
          content: '# Main Title\n## Section 1\nContent 1\n## Section 2\nContent 2',
          structure: {
            sections: [
              { title: 'Section 1', content: 'Content 1', subsections: [] },
              { title: 'Section 2', content: 'Content 2', subsections: [] }
            ],
            keyPoints: ['Point 1', 'Point 2'],
            examples: [],
            codeBlocks: [],
            conclusion: 'Summary'
          }
        }
      };

      render(
        <ProfessionalResponseRenderer 
          structured={multiSectionResponse}
          responseType="explanation"
        />
      );

      expect(screen.getByText('Section 1')).toBeInTheDocument();
      expect(screen.getByText('Section 2')).toBeInTheDocument();
      expect(screen.getByText('Point 1')).toBeInTheDocument();
      expect(screen.getByText('Point 2')).toBeInTheDocument();
    });

    it('should display code blocks when present', () => {
      const responseWithCode = {
        ...mockStructuredResponse,
        formattedResponse: {
          ...mockStructuredResponse.formattedResponse,
          structure: {
            ...mockStructuredResponse.formattedResponse.structure,
            codeBlocks: [
              { language: 'javascript', code: 'console.log("Hello");' },
              { language: 'python', code: 'print("World")' }
            ]
          }
        }
      };

      render(
        <ProfessionalResponseRenderer 
          structured={responseWithCode}
          responseType="explanation"
        />
      );

      expect(screen.getByText('console.log("Hello");')).toBeInTheDocument();
      expect(screen.getByText('print("World")')).toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should apply responsive classes', () => {
      render(
        <ProfessionalResponseRenderer 
          structured={mockStructuredResponse}
          responseType="explanation"
        />
      );

      const container = document.querySelector('.space-y-6');
      expect(container).toBeInTheDocument();
    });

    it('should handle mobile layout', () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', { value: 375 });
      
      render(
        <ProfessionalResponseRenderer 
          structured={mockStructuredResponse}
          responseType="explanation"
        />
      );

      // Should still render all content
      expect(screen.getByText('Introduction')).toBeInTheDocument();
    });
  });
});

describe('ResponseErrorBoundary', () => {
  const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Working component</div>;
  };

  it('should render children when no error occurs', () => {
    render(
      <ResponseErrorBoundary>
        <ThrowingComponent shouldThrow={false} />
      </ResponseErrorBoundary>
    );

    expect(screen.getByText('Working component')).toBeInTheDocument();
  });

  it('should catch errors and show error boundary UI', () => {
    // Suppress console.error for this test
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ResponseErrorBoundary>
        <ThrowingComponent shouldThrow={true} />
      </ResponseErrorBoundary>
    );

    expect(screen.getByText('Response Display Error')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong while displaying the AI response.')).toBeInTheDocument();
    expect(screen.getByTestId('alert-triangle-icon')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should have retry functionality', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let shouldThrow = true;

    const RetryComponent = () => {
      if (shouldThrow) {
        throw new Error('Retry test error');
      }
      return <div>Retry successful</div>;
    };

    render(
      <ResponseErrorBoundary>
        <RetryComponent />
      </ResponseErrorBoundary>
    );

    expect(screen.getByText('Response Display Error')).toBeInTheDocument();
    
    const retryButton = screen.getByText('Try Again');
    expect(retryButton).toBeInTheDocument();

    // Simulate successful retry
    shouldThrow = false;
    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(screen.getByText('Retry successful')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });

  it('should show fallback content option', () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ResponseErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowingComponent shouldThrow={true} />
      </ResponseErrorBoundary>
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it('should reset error state when children change', async () => {
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let componentKey = 1;

    const { rerender } = render(
      <ResponseErrorBoundary>
        <ThrowingComponent key={componentKey} shouldThrow={true} />
      </ResponseErrorBoundary>
    );

    expect(screen.getByText('Response Display Error')).toBeInTheDocument();

    // Change children (new key)
    componentKey = 2;
    rerender(
      <ResponseErrorBoundary>
        <ThrowingComponent key={componentKey} shouldThrow={false} />
      </ResponseErrorBoundary>
    );

    await waitFor(() => {
      expect(screen.getByText('Working component')).toBeInTheDocument();
    });

    consoleSpy.mockRestore();
  });
});