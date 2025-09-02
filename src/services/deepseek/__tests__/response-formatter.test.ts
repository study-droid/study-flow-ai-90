/**
 * Professional Response Formatter Tests
 * Comprehensive test suite for the ResponseFormatter module
 */

import { ResponseFormatter, FormattedResponse } from '../response-formatter';

describe('ResponseFormatter', () => {
  const mockStudyPlanResponse = `# Mathematics Study Plan

## Overview
A comprehensive 4-week plan to master algebra fundamentals.

## Week 1: Variables and Expressions
🎯 **Learning Goals:**
- Understand variables and constants
- Learn to write and evaluate expressions

⏱️ **Time Estimate:** 8 hours

📚 **Resources:**
- Khan Academy Algebra Basics
- Textbook Chapter 1-2

**Daily Breakdown:**
- **Day 1-2**: Introduction to variables
  - [ ] Complete variable practice set
  - [ ] Review basic terminology
- **Day 3-4**: Expression evaluation
  - [ ] Practice evaluating expressions
  - [ ] Complete homework assignments

## Progress Tracking
- [ ] Week 1 Complete
- [ ] Week 2 Complete`;

  const mockExplanationResponse = `# Understanding Photosynthesis

## Overview
Photosynthesis is the process by which plants convert light energy into chemical energy.

## Core Concepts

### Light-Dependent Reactions
The first stage occurs in the thylakoids where chlorophyll captures light energy.

**Example:** Chloroplasts in leaf cells contain chlorophyll that absorbs red and blue light.

### Calvin Cycle
The second stage uses CO2 to produce glucose.

**Example:** Plants take in CO2 through stomata and convert it to sugar.

## Key Takeaways
- Photosynthesis produces oxygen as a byproduct
- Plants are primary producers in food chains
- The process requires light, water, and carbon dioxide`;

  const mockPracticeResponse = `# Algebra Practice Exercises

## Instructions
Complete each exercise before checking answers.

## Exercise 1: Solve for x (⏱️ 5 minutes)
2x + 5 = 13

**Your Answer:**
[Space for response]

## Exercise 2: Multiple Choice (⏱️ 3 minutes)
What is the value of 3x when x = 4?

**Options:**
A) 7
B) 12
C) 16
D) 24

## Answer Key & Explanations

### Exercise 1
**Answer:** x = 4
**Explanation:** Subtract 5 from both sides: 2x = 8, then divide by 2.

### Exercise 2
**Answer:** B) 12
**Explanation:** Substitute x = 4 into 3x: 3(4) = 12.

## Self-Assessment Rubric
- **Excellent (90-100%)**: All problems correct with clear work shown
- **Good (80-89%)**: Most problems correct with minor errors
- **Satisfactory (70-79%)**: Some problems correct, needs more practice`;

  describe('formatStudyPlan', () => {
    it('should format study plan with proper structure', () => {
      const result = ResponseFormatter.formatStudyPlan(mockStudyPlanResponse);
      
      expect(result.content).toContain('# Mathematics Study Plan');
      expect(result.content).toContain('🎯 **Learning Goals:**');
      expect(result.content).toContain('⏱️ **Time Estimate:**');
      expect(result.content).toContain('📚 **Resources:**');
      expect(result.structure.sections.length).toBeGreaterThan(0);
      expect(result.metadata.responseType).toBe('study_plan');
      expect(result.metadata.timeEstimate).toBeDefined();
    });

    it('should extract time estimates correctly', () => {
      const result = ResponseFormatter.formatStudyPlan(mockStudyPlanResponse);
      expect(result.metadata.timeEstimate).toMatch(/\d+\s*hours?/i);
    });

    it('should identify progress tracking elements', () => {
      const result = ResponseFormatter.formatStudyPlan(mockStudyPlanResponse);
      expect(result.content).toContain('- [ ]');
      expect(result.structure.hasProgressTracking).toBe(true);
    });

    it('should handle malformed study plans gracefully', () => {
      const malformedPlan = 'Just some text without proper structure';
      const result = ResponseFormatter.formatStudyPlan(malformedPlan);
      
      expect(result.content).toBeDefined();
      expect(result.structure).toBeDefined();
      expect(result.metadata.responseType).toBe('study_plan');
    });
  });

  describe('formatExplanation', () => {
    it('should format explanation with proper structure', () => {
      const result = ResponseFormatter.formatExplanation(mockExplanationResponse);
      
      expect(result.content).toContain('# Understanding Photosynthesis');
      expect(result.content).toContain('## Overview');
      expect(result.content).toContain('## Key Takeaways');
      expect(result.structure.sections).toContain('Overview');
      expect(result.structure.sections).toContain('Key Takeaways');
      expect(result.metadata.responseType).toBe('explanation');
    });

    it('should extract examples correctly', () => {
      const result = ResponseFormatter.formatExplanation(mockExplanationResponse);
      expect(result.structure.hasExamples).toBe(true);
      expect(result.content).toContain('**Example:**');
    });

    it('should identify core concepts', () => {
      const result = ResponseFormatter.formatExplanation(mockExplanationResponse);
      expect(result.structure.sections).toContain('Core Concepts');
    });
  });

  describe('formatPractice', () => {
    it('should format practice exercises with proper structure', () => {
      const result = ResponseFormatter.formatPractice(mockPracticeResponse);
      
      expect(result.content).toContain('# Algebra Practice Exercises');
      expect(result.content).toContain('## Exercise 1:');
      expect(result.content).toContain('## Answer Key & Explanations');
      expect(result.structure.sections).toContain('Answer Key & Explanations');
      expect(result.metadata.responseType).toBe('practice');
    });

    it('should extract time estimates for exercises', () => {
      const result = ResponseFormatter.formatPractice(mockPracticeResponse);
      expect(result.content).toContain('⏱️');
      expect(result.metadata.timeEstimate).toBeDefined();
    });

    it('should identify self-assessment rubrics', () => {
      const result = ResponseFormatter.formatPractice(mockPracticeResponse);
      expect(result.content).toContain('Self-Assessment Rubric');
      expect(result.structure.sections).toContain('Self-Assessment Rubric');
    });
  });

  describe('formatConcept', () => {
    const mockConceptResponse = `# Deep Dive: Machine Learning

## Formal Definition
Machine learning is a subset of artificial intelligence that enables systems to learn and improve from experience.

## Historical Context
Developed from the study of pattern recognition and computational learning theory.

## Case Studies & Examples
Netflix recommendation system uses collaborative filtering algorithms.

## Further Exploration
- Advanced neural networks
- Deep learning applications`;

    it('should format concept analysis with academic structure', () => {
      const result = ResponseFormatter.formatConcept(mockConceptResponse);
      
      expect(result.content).toContain('# Deep Dive: Machine Learning');
      expect(result.content).toContain('## Formal Definition');
      expect(result.structure.sections).toContain('Formal Definition');
      expect(result.structure.sections).toContain('Historical Context');
      expect(result.metadata.responseType).toBe('concept');
    });

    it('should identify case studies', () => {
      const result = ResponseFormatter.formatConcept(mockConceptResponse);
      expect(result.structure.sections).toContain('Case Studies & Examples');
    });
  });

  describe('cleanMarkdown', () => {
    it('should fix header spacing', () => {
      const messy = '#Header1\n##Header2\n###Header3';
      const cleaned = ResponseFormatter.cleanMarkdown(messy);
      
      expect(cleaned).toContain('# Header1');
      expect(cleaned).toContain('## Header2');
      expect(cleaned).toContain('### Header3');
    });

    it('should normalize list formatting', () => {
      const messy = '*Item 1\n+Item 2\n-Item 3';
      const cleaned = ResponseFormatter.cleanMarkdown(messy);
      
      expect(cleaned).toMatch(/^- Item 1/m);
      expect(cleaned).toMatch(/^- Item 2/m);
      expect(cleaned).toMatch(/^- Item 3/m);
    });

    it('should fix bold and italic formatting', () => {
      const messy = '**bold text** and *italic text*';
      const cleaned = ResponseFormatter.cleanMarkdown(messy);
      
      expect(cleaned).toBe('**bold text** and *italic text*');
    });

    it('should preserve code blocks', () => {
      const withCode = '```javascript\nconst x = 1;\n```';
      const cleaned = ResponseFormatter.cleanMarkdown(withCode);
      
      expect(cleaned).toContain('```javascript');
      expect(cleaned).toContain('const x = 1;');
      expect(cleaned).toContain('```');
    });
  });

  describe('parseStructure', () => {
    it('should identify all sections correctly', () => {
      const structure = ResponseFormatter.parseStructure(mockExplanationResponse);
      
      expect(structure.sections).toContain('Overview');
      expect(structure.sections).toContain('Core Concepts');
      expect(structure.sections).toContain('Key Takeaways');
      expect(structure.headings.length).toBeGreaterThan(0);
    });

    it('should detect progress tracking', () => {
      const structure = ResponseFormatter.parseStructure(mockStudyPlanResponse);
      expect(structure.hasProgressTracking).toBe(true);
    });

    it('should detect examples', () => {
      const structure = ResponseFormatter.parseStructure(mockExplanationResponse);
      expect(structure.hasExamples).toBe(true);
    });

    it('should count words accurately', () => {
      const structure = ResponseFormatter.parseStructure('Hello world test');
      expect(structure.wordCount).toBe(3);
    });
  });

  describe('extractMetadata', () => {
    it('should extract study plan metadata', () => {
      const metadata = ResponseFormatter.extractMetadata(mockStudyPlanResponse, 'study_plan');
      
      expect(metadata.responseType).toBe('study_plan');
      expect(metadata.timeEstimate).toBeDefined();
      expect(metadata.difficulty).toBeDefined();
    });

    it('should extract practice metadata', () => {
      const metadata = ResponseFormatter.extractMetadata(mockPracticeResponse, 'practice');
      
      expect(metadata.responseType).toBe('practice');
      expect(metadata.timeEstimate).toBeDefined();
    });

    it('should determine difficulty levels', () => {
      const easyContent = 'Simple basic introduction to concepts';
      const hardContent = 'Advanced quantum mechanics differential equations complex analysis';
      
      const easyMetadata = ResponseFormatter.extractMetadata(easyContent, 'explanation');
      const hardMetadata = ResponseFormatter.extractMetadata(hardContent, 'explanation');
      
      expect(['easy', 'medium', 'hard']).toContain(easyMetadata.difficulty);
      expect(['easy', 'medium', 'hard']).toContain(hardMetadata.difficulty);
    });
  });

  describe('Quality Assessment', () => {
    it('should assess structure quality correctly', () => {
      const wellStructured = mockExplanationResponse;
      const poorlyStructured = 'Just some text without headers or structure.';
      
      const goodResult = ResponseFormatter.formatExplanation(wellStructured);
      const poorResult = ResponseFormatter.formatExplanation(poorlyStructured);
      
      expect(goodResult.qualityMetrics.structure).toBeGreaterThan(poorResult.qualityMetrics.structure);
    });

    it('should assess completeness correctly', () => {
      const complete = mockStudyPlanResponse;
      const incomplete = '# Brief Plan\nJust basics.';
      
      const completeResult = ResponseFormatter.formatStudyPlan(complete);
      const incompleteResult = ResponseFormatter.formatStudyPlan(incomplete);
      
      expect(completeResult.qualityMetrics.completeness).toBeGreaterThan(incompleteResult.qualityMetrics.completeness);
    });

    it('should calculate overall scores within valid range', () => {
      const result = ResponseFormatter.formatExplanation(mockExplanationResponse);
      
      expect(result.qualityMetrics.overall).toBeGreaterThanOrEqual(0);
      expect(result.qualityMetrics.overall).toBeLessThanOrEqual(100);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty input gracefully', () => {
      const result = ResponseFormatter.formatExplanation('');
      
      expect(result.content).toBeDefined();
      expect(result.structure).toBeDefined();
      expect(result.metadata).toBeDefined();
    });

    it('should handle very long content', () => {
      const longContent = 'A'.repeat(10000);
      const result = ResponseFormatter.formatExplanation(longContent);
      
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.structure.wordCount).toBeGreaterThan(1000);
    });

    it('should handle special characters correctly', () => {
      const specialContent = '# Title with émojis 🎯 and spëcial chars';
      const result = ResponseFormatter.formatExplanation(specialContent);
      
      expect(result.content).toContain('émojis 🎯');
      expect(result.content).toContain('spëcial');
    });

    it('should preserve important formatting in mixed content', () => {
      const mixedContent = `# Title
      
**Bold text** and *italic text*

\`\`\`code
const x = 1;
\`\`\`

- List item 1
- [ ] Checkbox item`;
      
      const result = ResponseFormatter.formatExplanation(mixedContent);
      
      expect(result.content).toContain('**Bold text**');
      expect(result.content).toContain('*italic text*');
      expect(result.content).toContain('```code');
      expect(result.content).toContain('- [ ] Checkbox item');
    });
  });
});