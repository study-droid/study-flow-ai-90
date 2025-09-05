/**
 * Comprehensive Unit Tests for Card Components
 * Tests all Card component variants and their interactions
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@/test/test-utils';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from '../card';

describe('Card Components', () => {
  describe('Card', () => {
    it('should render with default styling', () => {
      render(<Card data-testid="card">Card content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toBeInTheDocument();
      expect(card).toHaveClass(
        'rounded-lg',
        'border',
        'bg-card',
        'text-card-foreground',
        'shadow-sm'
      );
    });

    it('should accept custom className', () => {
      render(<Card data-testid="card" className="custom-class">Card content</Card>);
      
      const card = screen.getByTestId('card');
      expect(card).toHaveClass('custom-class');
      expect(card).toHaveClass('rounded-lg'); // Should still have default classes
    });

    it('should forward ref correctly', () => {
      let cardRef: HTMLDivElement | null = null;
      
      render(
        <Card
          ref={(el) => { cardRef = el; }}
          data-testid="card"
        >
          Card content
        </Card>
      );
      
      expect(cardRef).toBeInstanceOf(HTMLDivElement);
      expect(cardRef).toBe(screen.getByTestId('card'));
    });

    it('should spread additional props', () => {
      render(
        <Card
          data-testid="card"
          data-custom="test-value"
          role="region"
          aria-label="Test card"
        >
          Card content
        </Card>
      );
      
      const card = screen.getByTestId('card');
      expect(card).toHaveAttribute('data-custom', 'test-value');
      expect(card).toHaveRole('region');
      expect(card).toHaveAttribute('aria-label', 'Test card');
    });

    it('should render children correctly', () => {
      render(
        <Card data-testid="card">
          <span>Child content</span>
        </Card>
      );
      
      expect(screen.getByText('Child content')).toBeInTheDocument();
    });
  });

  describe('CardHeader', () => {
    it('should render with correct styling', () => {
      render(<CardHeader data-testid="card-header">Header content</CardHeader>);
      
      const header = screen.getByTestId('card-header');
      expect(header).toBeInTheDocument();
      expect(header).toHaveClass('flex', 'flex-col', 'space-y-1.5', 'p-6');
    });

    it('should accept custom className', () => {
      render(
        <CardHeader data-testid="card-header" className="custom-header">
          Header content
        </CardHeader>
      );
      
      const header = screen.getByTestId('card-header');
      expect(header).toHaveClass('custom-header', 'flex', 'flex-col');
    });

    it('should forward ref correctly', () => {
      let headerRef: HTMLDivElement | null = null;
      
      render(
        <CardHeader
          ref={(el) => { headerRef = el; }}
          data-testid="card-header"
        >
          Header content
        </CardHeader>
      );
      
      expect(headerRef).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardTitle', () => {
    it('should render as h3 with correct styling', () => {
      render(<CardTitle data-testid="card-title">Test Title</CardTitle>);
      
      const title = screen.getByTestId('card-title');
      expect(title).toBeInTheDocument();
      expect(title.tagName).toBe('H3');
      expect(title).toHaveClass(
        'text-2xl',
        'font-semibold',
        'leading-none',
        'tracking-tight'
      );
    });

    it('should be accessible as a heading', () => {
      render(<CardTitle>Accessible Title</CardTitle>);
      
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveTextContent('Accessible Title');
    });

    it('should accept custom className', () => {
      render(<CardTitle className="custom-title" data-testid="card-title">Title</CardTitle>);
      
      const title = screen.getByTestId('card-title');
      expect(title).toHaveClass('custom-title', 'text-2xl');
    });

    it('should forward ref correctly', () => {
      let titleRef: HTMLHeadingElement | null = null;
      
      render(
        <CardTitle
          ref={(el) => { titleRef = el; }}
          data-testid="card-title"
        >
          Title
        </CardTitle>
      );
      
      expect(titleRef).toBeInstanceOf(HTMLHeadingElement);
    });
  });

  describe('CardDescription', () => {
    it('should render as paragraph with correct styling', () => {
      render(<CardDescription data-testid="card-description">Test description</CardDescription>);
      
      const description = screen.getByTestId('card-description');
      expect(description).toBeInTheDocument();
      expect(description.tagName).toBe('P');
      expect(description).toHaveClass('text-sm', 'text-muted-foreground');
    });

    it('should accept custom className', () => {
      render(
        <CardDescription className="custom-desc" data-testid="card-description">
          Description
        </CardDescription>
      );
      
      const description = screen.getByTestId('card-description');
      expect(description).toHaveClass('custom-desc', 'text-sm');
    });

    it('should forward ref correctly', () => {
      let descRef: HTMLParagraphElement | null = null;
      
      render(
        <CardDescription
          ref={(el) => { descRef = el; }}
          data-testid="card-description"
        >
          Description
        </CardDescription>
      );
      
      expect(descRef).toBeInstanceOf(HTMLParagraphElement);
    });
  });

  describe('CardContent', () => {
    it('should render with correct styling', () => {
      render(<CardContent data-testid="card-content">Content here</CardContent>);
      
      const content = screen.getByTestId('card-content');
      expect(content).toBeInTheDocument();
      expect(content).toHaveClass('p-6', 'pt-0');
    });

    it('should accept custom className', () => {
      render(
        <CardContent className="custom-content" data-testid="card-content">
          Content
        </CardContent>
      );
      
      const content = screen.getByTestId('card-content');
      expect(content).toHaveClass('custom-content', 'p-6', 'pt-0');
    });

    it('should forward ref correctly', () => {
      let contentRef: HTMLDivElement | null = null;
      
      render(
        <CardContent
          ref={(el) => { contentRef = el; }}
          data-testid="card-content"
        >
          Content
        </CardContent>
      );
      
      expect(contentRef).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('CardFooter', () => {
    it('should render with correct styling', () => {
      render(<CardFooter data-testid="card-footer">Footer content</CardFooter>);
      
      const footer = screen.getByTestId('card-footer');
      expect(footer).toBeInTheDocument();
      expect(footer).toHaveClass('flex', 'items-center', 'p-6', 'pt-0');
    });

    it('should accept custom className', () => {
      render(
        <CardFooter className="custom-footer" data-testid="card-footer">
          Footer
        </CardFooter>
      );
      
      const footer = screen.getByTestId('card-footer');
      expect(footer).toHaveClass('custom-footer', 'flex', 'items-center');
    });

    it('should forward ref correctly', () => {
      let footerRef: HTMLDivElement | null = null;
      
      render(
        <CardFooter
          ref={(el) => { footerRef = el; }}
          data-testid="card-footer"
        >
          Footer
        </CardFooter>
      );
      
      expect(footerRef).toBeInstanceOf(HTMLDivElement);
    });
  });

  describe('Card Composition', () => {
    it('should render complete card structure correctly', () => {
      render(
        <Card data-testid="complete-card">
          <CardHeader data-testid="header">
            <CardTitle data-testid="title">Card Title</CardTitle>
            <CardDescription data-testid="description">
              Card description text
            </CardDescription>
          </CardHeader>
          <CardContent data-testid="content">
            <p>Main card content goes here</p>
          </CardContent>
          <CardFooter data-testid="footer">
            <button>Action</button>
          </CardFooter>
        </Card>
      );

      // Check all parts are rendered
      expect(screen.getByTestId('complete-card')).toBeInTheDocument();
      expect(screen.getByTestId('header')).toBeInTheDocument();
      expect(screen.getByTestId('title')).toBeInTheDocument();
      expect(screen.getByTestId('description')).toBeInTheDocument();
      expect(screen.getByTestId('content')).toBeInTheDocument();
      expect(screen.getByTestId('footer')).toBeInTheDocument();

      // Check content
      expect(screen.getByText('Card Title')).toBeInTheDocument();
      expect(screen.getByText('Card description text')).toBeInTheDocument();
      expect(screen.getByText('Main card content goes here')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Action' })).toBeInTheDocument();
    });

    it('should work with partial card structure', () => {
      render(
        <Card data-testid="partial-card">
          <CardHeader>
            <CardTitle>Just Title and Content</CardTitle>
          </CardHeader>
          <CardContent>
            <p>No description or footer</p>
          </CardContent>
        </Card>
      );

      expect(screen.getByText('Just Title and Content')).toBeInTheDocument();
      expect(screen.getByText('No description or footer')).toBeInTheDocument();
      expect(screen.queryByRole('paragraph')).not.toBeInTheDocument(); // No CardDescription
    });

    it('should handle nested interactive elements', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Interactive Card</CardTitle>
          </CardHeader>
          <CardContent>
            <input data-testid="input" placeholder="Enter text" />
            <button data-testid="content-button">Click me</button>
          </CardContent>
          <CardFooter>
            <button data-testid="footer-button">Save</button>
            <button data-testid="cancel-button">Cancel</button>
          </CardFooter>
        </Card>
      );

      expect(screen.getByTestId('input')).toBeInTheDocument();
      expect(screen.getByTestId('content-button')).toBeInTheDocument();
      expect(screen.getByTestId('footer-button')).toBeInTheDocument();
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument();
    });

    it('should maintain proper semantic structure', () => {
      render(
        <Card role="article" aria-labelledby="card-title">
          <CardHeader>
            <CardTitle id="card-title">Semantic Card</CardTitle>
            <CardDescription>
              This card follows proper semantic structure
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p>Content follows the heading hierarchy</p>
          </CardContent>
        </Card>
      );

      const card = screen.getByRole('article');
      expect(card).toHaveAttribute('aria-labelledby', 'card-title');
      
      const title = screen.getByRole('heading', { level: 3 });
      expect(title).toHaveAttribute('id', 'card-title');
    });

    it('should handle empty card components gracefully', () => {
      render(
        <Card data-testid="empty-card">
          <CardHeader></CardHeader>
          <CardContent></CardContent>
          <CardFooter></CardFooter>
        </Card>
      );

      const card = screen.getByTestId('empty-card');
      expect(card).toBeInTheDocument();
      // Should still render with proper structure even when empty
    });

    it('should support conditional rendering of card parts', () => {
      const showDescription = false;
      const showFooter = true;

      render(
        <Card>
          <CardHeader>
            <CardTitle>Conditional Card</CardTitle>
            {showDescription && (
              <CardDescription>This won't show</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            <p>Always shown content</p>
          </CardContent>
          {showFooter && (
            <CardFooter>
              <button>This will show</button>
            </CardFooter>
          )}
        </Card>
      );

      expect(screen.getByText('Conditional Card')).toBeInTheDocument();
      expect(screen.getByText('Always shown content')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'This will show' })).toBeInTheDocument();
      expect(screen.queryByText("This won't show")).not.toBeInTheDocument();
    });
  });
});