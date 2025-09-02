/**
 * Professional Prompt Templates Tests
 * Comprehensive test suite for the PromptTemplates module
 */

import { PromptTemplates, PromptContext } from '../prompt-templates';

describe('PromptTemplates', () => {
  const mockContext: PromptContext = {
    subject: 'Mathematics',
    topic: 'Algebra',
    userLevel: 'intermediate',
    responseType: 'explanation',
    learningObjectives: ['Understand variables', 'Solve equations'],
    timeConstraint: '2 weeks'
  };

  describe('buildStudyPlanTemplate', () => {
    it('should generate study plan template with proper structure', () => {
      const template = PromptTemplates.buildStudyPlanTemplate({
        ...mockContext,
        responseType: 'study_plan'
      });

      expect(template.systemPrompt).toContain('Study Plan Creator');
      expect(template.systemPrompt).toContain('## Week [number]: [Clear Theme]');
      expect(template.systemPrompt).toContain('🎯 Learning Goals');
      expect(template.systemPrompt).toContain('⏱️ Time Estimate');
      expect(template.systemPrompt).toContain('📚 Resources');

      expect(template.formatInstructions).toContain('FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS');
      expect(template.formatInstructions).toContain('Mathematics Study Plan');
      expect(template.formatInstructions).toContain('*Focus: Algebra*');

      expect(template.validationRules).toContain('Must include ## Week [number]: [Theme] headers');
      expect(template.validationRules).toContain('Each week must have 🎯, ⏱️, and 📚 sections');
      expect(template.validationRules).toContain('Must include checkbox progress tracking');

      expect(template.parameters.temperature).toBe(0.3);
      expect(template.parameters.max_tokens).toBe(3000);
    });

    it('should adapt to different user levels', () => {
      const beginnerTemplate = PromptTemplates.buildStudyPlanTemplate({
        ...mockContext,
        responseType: 'study_plan',
        userLevel: 'beginner'
      });

      const advancedTemplate = PromptTemplates.buildStudyPlanTemplate({
        ...mockContext,
        responseType: 'study_plan',
        userLevel: 'advanced'
      });

      expect(beginnerTemplate.userPrompt).toContain('foundational concepts');
      expect(beginnerTemplate.userPrompt).toContain('simple examples');
      
      expect(advancedTemplate.userPrompt).toContain('in-depth analysis');
      expect(advancedTemplate.userPrompt).toContain('advanced applications');
    });

    it('should include learning objectives when provided', () => {
      const template = PromptTemplates.buildStudyPlanTemplate({
        ...mockContext,
        responseType: 'study_plan',
        learningObjectives: ['Master quadratic equations', 'Understand factoring']
      });

      expect(template.userPrompt).toContain('Learning Objectives:');
      expect(template.userPrompt).toContain('Master quadratic equations');
      expect(template.userPrompt).toContain('Understand factoring');
    });

    it('should handle time constraints', () => {
      const template = PromptTemplates.buildStudyPlanTemplate({
        ...mockContext,
        responseType: 'study_plan',
        timeConstraint: '4 weeks'
      });

      expect(template.userPrompt).toContain('Time Constraint: 4 weeks');
    });
  });

  describe('buildExplanationTemplate', () => {
    it('should generate explanation template with proper structure', () => {
      const template = PromptTemplates.buildExplanationTemplate(mockContext);

      expect(template.systemPrompt).toContain('Concept Explainer');
      expect(template.systemPrompt).toContain('hierarchical headings');
      expect(template.systemPrompt).toContain('practical examples');

      expect(template.formatInstructions).toContain('# Algebra');
      expect(template.formatInstructions).toContain('## Overview');
      expect(template.formatInstructions).toContain('## Core Concepts');
      expect(template.formatInstructions).toContain('## Key Takeaways');

      expect(template.validationRules).toContain('Must start with Overview section');
      expect(template.validationRules).toContain('Must include at least 2 practical examples');
      expect(template.validationRules).toContain('Key Takeaways section is required');

      expect(template.parameters.temperature).toBe(0.4);
      expect(template.parameters.max_tokens).toBe(2500);
    });

    it('should adapt explanations to user level', () => {
      const beginnerTemplate = PromptTemplates.buildExplanationTemplate({
        ...mockContext,
        userLevel: 'beginner'
      });

      const advancedTemplate = PromptTemplates.buildExplanationTemplate({
        ...mockContext,
        userLevel: 'advanced'
      });

      expect(beginnerTemplate.userPrompt).toContain('simple language');
      expect(beginnerTemplate.userPrompt).toContain('step-by-step');
      
      expect(advancedTemplate.userPrompt).toContain('comprehensive analysis');
      expect(advancedTemplate.userPrompt).toContain('theoretical depth');
    });
  });

  describe('buildPracticeTemplate', () => {
    it('should generate practice template with proper structure', () => {
      const template = PromptTemplates.buildPracticeTemplate({
        ...mockContext,
        responseType: 'practice',
        difficulty: 'medium'
      });

      expect(template.systemPrompt).toContain('Practice Exercise Creator');
      expect(template.systemPrompt).toContain('varied question types');
      expect(template.systemPrompt).toContain('detailed explanations');

      expect(template.formatInstructions).toContain('# Mathematics Practice Exercises');
      expect(template.formatInstructions).toContain('## Exercise 1:');
      expect(template.formatInstructions).toContain('## Answer Key & Explanations');
      expect(template.formatInstructions).toContain('## Self-Assessment Rubric');

      expect(template.validationRules).toContain('Must include 5-8 varied exercises');
      expect(template.validationRules).toContain('Each exercise needs time estimate');
      expect(template.validationRules).toContain('Must include self-assessment rubric');

      expect(template.parameters.temperature).toBe(0.5);
      expect(template.parameters.max_tokens).toBe(3500);
    });

    it('should adapt to different difficulty levels', () => {
      const easyTemplate = PromptTemplates.buildPracticeTemplate({
        ...mockContext,
        responseType: 'practice',
        difficulty: 'easy'
      });

      const hardTemplate = PromptTemplates.buildPracticeTemplate({
        ...mockContext,
        responseType: 'practice',
        difficulty: 'hard'
      });

      expect(easyTemplate.userPrompt).toContain('Simple problems');
      expect(easyTemplate.userPrompt).toContain('step-by-step solutions');
      
      expect(hardTemplate.userPrompt).toContain('Challenging problems');
      expect(hardTemplate.userPrompt).toContain('critical thinking');
    });
  });

  describe('buildConceptTemplate', () => {
    it('should generate concept template with academic structure', () => {
      const template = PromptTemplates.buildConceptTemplate({
        ...mockContext,
        responseType: 'concept'
      });

      expect(template.systemPrompt).toContain('Concept Deep-Dive Expert');
      expect(template.systemPrompt).toContain('academic rigor');
      expect(template.systemPrompt).toContain('multiple perspectives');

      expect(template.formatInstructions).toContain('# Deep Dive: Algebra');
      expect(template.formatInstructions).toContain('## Formal Definition');
      expect(template.formatInstructions).toContain('## Historical Context');
      expect(template.formatInstructions).toContain('## Case Studies & Examples');

      expect(template.validationRules).toContain('Must include formal definition');
      expect(template.validationRules).toContain('Historical context required');
      expect(template.validationRules).toContain('Case studies and examples essential');

      expect(template.parameters.temperature).toBe(0.2);
      expect(template.parameters.max_tokens).toBe(4000);
    });
  });

  describe('buildPrompt', () => {
    it('should build complete prompt for study plan', () => {
      const prompt = PromptTemplates.buildPrompt(
        'Create a study plan for algebra',
        { ...mockContext, responseType: 'study_plan' }
      );

      expect(prompt.systemPrompt).toContain('Study Plan Creator');
      expect(prompt.userPrompt).toContain('Create a comprehensive study plan');
      expect(prompt.userPrompt).toContain('Student Question/Request: "Create a study plan for algebra"');
      expect(prompt.formatInstructions).toContain('FORMAT YOUR RESPONSE EXACTLY');
      expect(prompt.validationRules.length).toBeGreaterThan(0);
      expect(prompt.parameters.temperature).toBeDefined();
    });

    it('should build complete prompt for explanation', () => {
      const prompt = PromptTemplates.buildPrompt(
        'Explain quadratic equations',
        { ...mockContext, responseType: 'explanation' }
      );

      expect(prompt.systemPrompt).toContain('Concept Explainer');
      expect(prompt.userPrompt).toContain('Student Question/Request: "Explain quadratic equations"');
      expect(prompt.formatInstructions).toContain('# Algebra');
    });

    it('should default to explanation template when no type specified', () => {
      const prompt = PromptTemplates.buildPrompt(
        'Help with math',
        { subject: 'Mathematics' }
      );

      expect(prompt.systemPrompt).toContain('Concept Explainer');
    });

    it('should include critical formatting instructions', () => {
      const prompt = PromptTemplates.buildPrompt(
        'Test message',
        mockContext
      );

      expect(prompt.userPrompt).toContain('CRITICAL: Follow the formatting instructions exactly');
      expect(prompt.userPrompt).toContain('automated systems that expect this exact structure');
    });
  });

  describe('validateResponse', () => {
    describe('study plan validation', () => {
      it('should validate proper study plan format', () => {
        const validStudyPlan = `# Mathematics Study Plan

## Week 1: Introduction
🎯 **Learning Goals:**
- Learn basics

⏱️ **Time Estimate:** 5 hours

📚 **Resources:**
- Textbook

- [ ] Complete exercises
- [ ] Review notes`;

        const result = PromptTemplates.validateResponse(validStudyPlan, 'study_plan');

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
        expect(result.score).toBe(100);
      });

      it('should catch missing week structure', () => {
        const invalidStudyPlan = `# Study Plan
Some content without proper week structure.`;

        const result = PromptTemplates.validateResponse(invalidStudyPlan, 'study_plan');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing week structure (## Week [number]:)');
        expect(result.score).toBeLessThan(100);
      });

      it('should catch missing emoji indicators', () => {
        const missingEmojis = `# Study Plan
## Week 1: Test
Learning Goals: Something
Time Estimate: 5 hours
Resources: Books`;

        const result = PromptTemplates.validateResponse(missingEmojis, 'study_plan');

        expect(result.isValid).toBe(false);
        expect(result.errors.some(e => e.includes('emoji indicator'))).toBe(true);
        expect(result.score).toBeLessThan(100);
      });

      it('should catch missing progress tracking', () => {
        const missingTracking = `# Study Plan
## Week 1: Test
🎯 Goals
⏱️ Time
📚 Resources
No checkboxes here`;

        const result = PromptTemplates.validateResponse(missingTracking, 'study_plan');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing progress tracking checkboxes');
      });
    });

    describe('explanation validation', () => {
      it('should validate proper explanation format', () => {
        const validExplanation = `# Concept
        
## Overview
Brief introduction

## Core Concepts
Main content with **Example:** demonstration

## Key Takeaways
- Point 1
- Point 2`;

        const result = PromptTemplates.validateResponse(validExplanation, 'explanation');

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
        expect(result.score).toBe(100);
      });

      it('should catch missing required sections', () => {
        const missingOverview = `# Concept
Content without overview or takeaways`;

        const result = PromptTemplates.validateResponse(missingOverview, 'explanation');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing Overview section');
        expect(result.errors).toContain('Missing Key Takeaways section');
      });

      it('should catch missing examples', () => {
        const noExamples = `# Concept
## Overview
Intro
## Key Takeaways
Summary`;

        const result = PromptTemplates.validateResponse(noExamples, 'explanation');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing practical examples');
      });
    });

    describe('practice validation', () => {
      it('should validate proper practice format', () => {
        const validPractice = `# Practice
Exercise 1: Test
## Answer Key & Explanations
Solutions here
## Self-Assessment Rubric
Grading criteria`;

        const result = PromptTemplates.validateResponse(validPractice, 'practice');

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should catch missing components', () => {
        const incompletePractice = `# Practice
Just some content`;

        const result = PromptTemplates.validateResponse(incompletePractice, 'practice');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing numbered exercises');
        expect(result.errors).toContain('Missing answer key section');
        expect(result.errors).toContain('Missing self-assessment rubric');
      });
    });

    describe('concept validation', () => {
      it('should validate proper concept format', () => {
        const validConcept = `# Deep Dive
## Formal Definition
Definition here
## Historical Context
History here
## Case Studies & Examples
Examples here`;

        const result = PromptTemplates.validateResponse(validConcept, 'concept');

        expect(result.isValid).toBe(true);
        expect(result.errors.length).toBe(0);
      });

      it('should catch missing academic sections', () => {
        const incompleteConcept = `# Concept
Just basic content`;

        const result = PromptTemplates.validateResponse(incompleteConcept, 'concept');

        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Missing formal definition section');
        expect(result.errors).toContain('Missing historical context section');
        expect(result.errors).toContain('Missing case studies section');
      });
    });

    it('should check general formatting requirements', () => {
      const noHeaders = 'Content without any headers';
      const result = PromptTemplates.validateResponse(noHeaders, 'explanation');

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Missing proper heading structure');
      expect(result.score).toBeLessThan(100);
    });
  });

  describe('getTemplateInfo', () => {
    it('should return correct info for each template type', () => {
      const studyPlanInfo = PromptTemplates.getTemplateInfo('study_plan');
      expect(studyPlanInfo.name).toBe('Study Plan Template');
      expect(studyPlanInfo.estimatedTokens).toBe(3000);
      expect(studyPlanInfo.difficulty).toBe('Complex');

      const explanationInfo = PromptTemplates.getTemplateInfo('explanation');
      expect(explanationInfo.name).toBe('Concept Explanation Template');
      expect(explanationInfo.estimatedTokens).toBe(2500);
      expect(explanationInfo.difficulty).toBe('Moderate');

      const practiceInfo = PromptTemplates.getTemplateInfo('practice');
      expect(practiceInfo.name).toBe('Practice Exercise Template');
      expect(practiceInfo.estimatedTokens).toBe(3500);
      expect(practiceInfo.difficulty).toBe('Complex');

      const conceptInfo = PromptTemplates.getTemplateInfo('concept');
      expect(conceptInfo.name).toBe('Deep Concept Analysis Template');
      expect(conceptInfo.estimatedTokens).toBe(4000);
      expect(conceptInfo.difficulty).toBe('Advanced');
    });

    it('should default to explanation template for unknown types', () => {
      const unknownInfo = PromptTemplates.getTemplateInfo('unknown');
      expect(unknownInfo.name).toBe('Concept Explanation Template');
    });
  });

  describe('Edge Cases', () => {
    it('should handle minimal context', () => {
      const minimalContext: PromptContext = {
        subject: 'Test'
      };

      const template = PromptTemplates.buildExplanationTemplate(minimalContext);
      expect(template.systemPrompt).toBeDefined();
      expect(template.userPrompt).toBeDefined();
      expect(template.formatInstructions).toBeDefined();
    });

    it('should handle missing optional fields gracefully', () => {
      const contextWithoutOptionals: PromptContext = {
        subject: 'Mathematics',
        responseType: 'study_plan'
      };

      const template = PromptTemplates.buildStudyPlanTemplate(contextWithoutOptionals);
      expect(template.systemPrompt).toBeDefined();
      expect(template.userPrompt).not.toContain('undefined');
      expect(template.userPrompt).not.toContain('null');
    });

    it('should handle empty learning objectives array', () => {
      const contextWithEmptyObjectives: PromptContext = {
        subject: 'Math',
        responseType: 'study_plan',
        learningObjectives: []
      };

      const template = PromptTemplates.buildStudyPlanTemplate(contextWithEmptyObjectives);
      expect(template.userPrompt).toBeDefined();
    });
  });
});