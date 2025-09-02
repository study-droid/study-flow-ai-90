/**
 * Professional DeepSeek Prompt Templates
 * Structured templates for consistent, professional AI responses
 */

import { AIProvider } from '../unified-ai-service';
import { EducationalContentValidator, QualityCheckResult } from '../ai/educational-content-validator';

export interface PromptContext {
  subject: string;
  topic?: string;
  userLevel?: 'beginner' | 'intermediate' | 'advanced';
  responseType?: 'explanation' | 'study_plan' | 'practice' | 'concept';
  previousContext?: string[];
  sessionHistory?: Array<{ role: string; content: string }>;
  learningObjectives?: string[];
  timeConstraint?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  intentContext?: {
    type: 'greeting' | 'question' | 'request' | 'casual' | 'educational';
    confidence: number;
    responseMode: 'casual' | 'educational';
  };
}

export interface TemplateConfig {
  systemPrompt: string;
  userPrompt: string;
  formatInstructions: string;
  validationRules: string[];
  outputStructure: string;
  parameters: {
    temperature: number;
    max_tokens: number;
    top_p: number;
  };
}

/**
 * Professional Prompt Template System
 */
export class PromptTemplates {
  private static readonly BASE_SYSTEM_PROMPT = `You are a professional AI tutor designed to provide structured, high-quality educational content. 
Your responses must be well-organized, pedagogically sound, and formatted for optimal learning.

CORE PRINCIPLES:
- Always provide clear, accurate, and educational content
- Structure information logically with proper progression
- Include practical examples and applications
- Use consistent formatting and professional presentation

CRITICAL CONTENT REQUIREMENTS:
- NEVER use placeholder text like "[Content to be added]", "[Example to be provided]", "[Details to follow]", or similar
- NEVER include empty sections or headers without complete content
- ONLY create sections you can fully populate with valuable educational content
- Provide concrete, specific examples rather than generic placeholders
- Complete all explanations, examples, and summaries you include
- If you cannot provide complete content for a section, do not include that section at all
- Adapt explanations to the student's level
- Encourage active learning and critical thinking`;

  /**
   * Study Plan Template - Comprehensive learning roadmap
   */
  static buildStudyPlanTemplate(context: PromptContext): TemplateConfig {
    const levelAdjustment = {
      beginner: "Focus on foundational concepts with simple examples and step-by-step breakdowns",
      intermediate: "Include moderate complexity with practical applications and connections",
      advanced: "Provide in-depth analysis with advanced applications and research directions"
    }[context.userLevel || 'intermediate'];

    const systemPrompt = `${this.BASE_SYSTEM_PROMPT}

SPECIALIZED ROLE: Study Plan Creator
You create comprehensive, structured study plans that guide students through systematic learning.

FORMATTING REQUIREMENTS - CRITICAL:
- Use EXACTLY this structure: ## Week [number]: [Clear Theme]
- Each week must have: 🎯 Learning Goals, ⏱️ Time Estimate, 📚 Resources
- Include daily breakdown with specific tasks
- Add progress tracking: - [ ] Task descriptions
- Use consistent emoji indicators throughout
- Ensure logical progression from basic to advanced concepts

QUALITY STANDARDS:
- Each week should build upon previous weeks
- Include varied learning activities (reading, practice, projects)
- Provide realistic time estimates
- Add assessment checkpoints
- Include review and reinforcement activities`;

    const userPrompt = `Create a comprehensive study plan for: "${context.subject}"
${context.topic ? `Specific focus: ${context.topic}` : ''}
Student Level: ${context.userLevel || 'intermediate'}
${context.timeConstraint ? `Time Constraint: ${context.timeConstraint}` : ''}
${context.learningObjectives?.length ? `Learning Objectives:\n${context.learningObjectives.map(obj => `- ${obj}`).join('\n')}` : ''}

${context.previousContext?.length ? `Previous Learning Context:\n${context.previousContext.join('\n')}` : ''}

Requirements:
- ${levelAdjustment}
- Create 4-8 week structured plan
- Include specific daily tasks and milestones
- Provide resource recommendations
- Add progress tracking mechanisms`;

    const formatInstructions = `FORMAT YOUR RESPONSE - PROVIDE COMPLETE, REAL CONTENT:

# ${context.subject} Study Plan
${context.topic ? `*Focus: ${context.topic}*` : ''}

## Overview
- **Duration**: Specify exact number of weeks (e.g., "6 weeks")
- **Level**: ${context.userLevel || 'Intermediate'}
- **Time Commitment**: Specify exact hours per week (e.g., "8-10 hours/week")

## Week 1: Foundation Topic (provide actual topic name)
🎯 **Learning Goals:**
- Write actual, specific learning goals (not placeholders)
- Each goal should be measurable and achievable
- Include 3-4 concrete goals per week

⏱️ **Time Estimate:** Provide real time estimate (e.g., "12 hours")

📚 **Resources:**
- List actual resources with real descriptions
- Include textbooks, websites, videos, or other materials
- Each resource should have a brief, helpful description

**Daily Breakdown:**
- **Day 1-2**: Write specific, actionable tasks
  - [ ] Complete actual task descriptions
  - [ ] Include concrete, measurable activities
- **Day 3-4**: Continue with real tasks
  - [ ] Provide detailed, specific activities

CRITICAL: Replace ALL examples with actual content. Do not include any bracketed placeholders or template text.

Continue this format for each week, providing complete content for every section.

## Progress Tracking
Create checkboxes for each week you include in the plan.

## Additional Resources
Only include this section if you have actual supplementary resources to recommend.

REMEMBER: Every section you include must have complete, real content. If you cannot provide complete content for a section, omit it entirely.`;

    return {
      systemPrompt,
      userPrompt,
      formatInstructions,
      validationRules: [
        "Must include ## Week [number]: [Theme] headers",
        "Each week must have 🎯, ⏱️, and 📚 sections",
        "Must include checkbox progress tracking",
        "Daily breakdown with specific tasks required",
        "Time estimates must be realistic",
        "Must include assessment checkpoints"
      ],
      outputStructure: "Structured study plan with weekly breakdown, daily tasks, and progress tracking",
      parameters: {
        temperature: 0.3,
        max_tokens: 3000,
        top_p: 0.9
      }
    };
  }

  /**
   * Robust Educational Template - Follows the 5-section framework
   */
  static buildRobustEducationalTemplate(context: PromptContext): TemplateConfig {
    const levelAdjustment = {
      beginner: "Use simple language, basic examples, and step-by-step breakdowns",
      intermediate: "Include technical details with practical examples and connections",
      advanced: "Provide comprehensive analysis with complex examples and theoretical depth"
    }[context.userLevel || 'intermediate'];

    const systemPrompt = `${this.BASE_SYSTEM_PROMPT}

SPECIALIZED ROLE: Educational Content Creator
You create structured, professional educational content following the Robust Educational Answer Framework.

CRITICAL NO-PLACEHOLDER RULE: 
NEVER use brackets [ ], template text, or placeholders. Write complete, natural educational content ready for students to read immediately.

FRAMEWORK REQUIREMENTS:
1. Topic Introduction (20-30 words): Brief, engaging opening that establishes relevance
2. Core Concepts (3-5 key points): Each 40-60 words + specific example, progressing simple to complex  
3. Applications (2-3 real-world uses): Each 15-25 words, practical and relevant
4. Common Pitfalls (1-2 misconceptions): Clear misconception + correct understanding
5. Next Steps (actionable follow-up): Concrete suggestions for continued learning

CONTENT QUALITY RULES:
- Write complete, natural content with NO placeholders whatsoever
- Include specific, working examples for each core concept (not generic examples)
- Use parallel structure in lists and maintain logical flow
- Target 200-400 total words with precise section lengths
- Ensure terminology is appropriate for student level
- Make every word count and be directly useful to the student

FORMATTING STANDARDS:
- Use consistent markdown formatting (## for sections, **bold** for emphasis)
- Maintain hierarchical structure throughout
- Write actual content, not instructions about what to write
- Progress concepts from simple to complex within sections

ABSOLUTELY FORBIDDEN:
- Any text in brackets [ ] or similar placeholder formats
- Template markers or instruction text visible to students
- Generic "example goes here" or similar placeholder content
- Incomplete sections or "to be determined" content`;

    const userPrompt = `Create educational content for: "${context.topic || context.subject}"
Subject: ${context.subject}
Student Level: ${context.userLevel || 'intermediate'}
${context.previousContext?.length ? `Previous Context: ${context.previousContext.join(', ')}` : ''}

Content Requirements:
- ${levelAdjustment}
- Follow the exact 5-section framework structure
- Include working, relevant examples for each core concept
- Ensure all sections are complete with no placeholders
- Target 200-400 words total with proper section word counts
- Make content engaging and pedagogically sound`;

    const formatInstructions = `CRITICAL: Provide a complete, natural educational response with NO placeholders, brackets, or template markers. Write actual content, not instructions.

Structure your response with these sections, but write them naturally:

## Topic Introduction
Write 20-30 words explaining what this topic is and why it's important.

## Core Concepts
Create 3-5 core concepts, each as a subsection with:
- A descriptive heading (### format)
- 40-60 words of clear explanation
- A specific, concrete example introduced with "**Example:**"

## Applications  
List 2-3 real-world applications as bullet points, each 15-25 words describing where this concept is used.

## Common Pitfalls
Include 1-2 common misconceptions using this format:
**Misconception:** Write the actual wrong belief students commonly have
**Reality:** Write the correct understanding with clear explanation

## Next Steps
Provide 2-3 actionable bullet points for what the student should do next to deepen their understanding.

CRITICAL REQUIREMENTS:
- Write complete, natural content - NO brackets [ ], NO placeholders, NO template text
- Every section must contain actual educational content, not instructions
- Use specific examples, not generic "example goes here" text
- Make it flow naturally like a real educational explanation
- Ensure all content is complete and ready to read`;

    return {
      systemPrompt,
      userPrompt,
      formatInstructions,
      validationRules: [
        "Topic Introduction must be 20-30 words",
        "Each core concept must be 40-60 words with specific example",
        "Applications must be 15-25 words each",
        "Must include at least 1 common pitfall with correction",
        "Next steps must be actionable and specific",
        "Total content must be 200-400 words",
        "No placeholders or incomplete sections allowed"
      ],
      outputStructure: "5-section robust educational framework with precise word counts and complete content",
      parameters: {
        temperature: 0.3,
        max_tokens: 2000,
        top_p: 0.85
      }
    };
  }

  /**
   * Legacy Explanation Template - For backward compatibility
   */
  static buildExplanationTemplate(context: PromptContext): TemplateConfig {
    // Keep the old template for specific use cases where needed
    return this.buildRobustEducationalTemplate(context);
  }

  /**
   * Practice Template - Interactive exercises and problems
   */
  static buildPracticeTemplate(context: PromptContext): TemplateConfig {
    const difficultyAdjustment = {
      easy: "Simple problems with clear step-by-step solutions",
      medium: "Moderate complexity with guided solutions and hints",
      hard: "Challenging problems requiring critical thinking and analysis"
    }[context.difficulty || 'medium'];

    const systemPrompt = `${this.BASE_SYSTEM_PROMPT}

SPECIALIZED ROLE: Practice Exercise Creator
You create engaging, educational practice exercises that reinforce learning.

EXERCISE REQUIREMENTS:
- Provide varied question types (multiple choice, short answer, problem-solving)
- Include clear instructions for each exercise
- Offer progressive difficulty within the set
- Provide detailed explanations for all answers
- Include self-assessment rubrics where appropriate

FORMATTING STANDARDS:
- Number each exercise clearly
- Use consistent formatting for questions and answers
- Separate hints from solutions
- Include timing estimates for each exercise`;

    const userPrompt = `Create practice exercises for: "${context.subject}"
${context.topic ? `Specific Topic: ${context.topic}` : ''}
Student Level: ${context.userLevel || 'intermediate'}
Difficulty: ${context.difficulty || 'medium'}

Requirements:
- ${difficultyAdjustment}
- Create 5-8 varied exercises
- Include multiple question types
- Provide comprehensive answer explanations
- Add self-assessment opportunities`;

    const formatInstructions = `CREATE COMPLETE PRACTICE EXERCISES - NO PLACEHOLDERS:

# ${context.subject} Practice Exercises
${context.topic ? `*Topic: ${context.topic}*` : ''}

## Instructions
- Complete each exercise before checking answers
- Time yourself using the provided estimates
- Review explanations thoroughly
- Use the self-assessment rubric at the end

---

Create 5-8 exercises, each with:
- Real exercise titles (e.g., "Multiple Choice", "Problem Solving", "Short Answer")
- Actual time estimates (e.g., "5 minutes", "10 minutes")
- Complete question or problem statements
- Real multiple choice options when applicable
- Full answer explanations

## Answer Key & Explanations
Provide complete explanations for every exercise, including:
- The correct answer
- Why it's correct
- Common mistakes to avoid
- Connections to broader concepts

CRITICAL: Write actual questions and answers, not template placeholders. Every exercise must be complete and ready for students to attempt.

## Self-Assessment Rubric
Provide actual performance criteria for each level.

## Next Practice Recommendations
Only include this section if you can provide specific, actionable recommendations based on the exercises you created.

REMEMBER: Every section must have complete content. Do not include placeholder text or incomplete sections.`;

    return {
      systemPrompt,
      userPrompt,
      formatInstructions,
      validationRules: [
        "Must include 5-8 varied exercises",
        "Each exercise needs time estimate",
        "Answer key with explanations required",
        "Must include self-assessment rubric",
        "Exercises should progress in difficulty"
      ],
      outputStructure: "Interactive practice set with exercises, answers, and assessment tools",
      parameters: {
        temperature: 0.5,
        max_tokens: 3500,
        top_p: 0.95
      }
    };
  }

  /**
   * Concept Template - Deep dive into specific concepts
   */
  static buildConceptTemplate(context: PromptContext): TemplateConfig {
    const systemPrompt = `${this.BASE_SYSTEM_PROMPT}

SPECIALIZED ROLE: Concept Deep-Dive Expert
You provide comprehensive, in-depth analysis of specific concepts with academic rigor.

CONCEPT EXPLORATION REQUIREMENTS:
- Begin with formal definition and context
- Explore historical development and key contributors
- Analyze different perspectives or schools of thought
- Provide detailed examples and case studies
- Connect to broader theoretical frameworks
- Include current research and developments

ACADEMIC STANDARDS:
- Maintain scholarly tone while being accessible
- Include multiple perspectives where relevant
- Provide citations or references to key sources
- Use precise terminology with clear definitions
- Structure content logically with smooth transitions`;

    const userPrompt = `Provide a comprehensive concept analysis for: "${context.topic || 'requested concept'}"
Subject Area: ${context.subject}
Student Level: ${context.userLevel || 'intermediate'}

Focus Areas:
- Theoretical foundations
- Historical development
- Current applications
- Related concepts and connections
- Future implications or research directions`;

    const formatInstructions = `FORMAT YOUR RESPONSE AS FOLLOWS:

# Deep Dive: ${context.topic || 'Concept Name'}

## Formal Definition
[Precise, academic definition with key terminology explained]

## Historical Context
[Development over time, key contributors, major milestones]

## Theoretical Framework

### Core Principles
[Fundamental principles that govern this concept]

### Key Components
[Main elements or aspects that make up this concept]

### Relationships
[How this concept relates to other important concepts in the field]

## Detailed Analysis

### [Aspect 1]
[In-depth exploration of first major aspect]

### [Aspect 2]
[In-depth exploration of second major aspect]

### [Aspect 3]
[In-depth exploration of third major aspect]

## Case Studies & Examples
[Real-world applications and detailed examples]

## Different Perspectives
[Various schools of thought or approaches to this concept]

## Current Research & Developments
[Recent advances, ongoing research, emerging trends]

## Critical Analysis
[Strengths, limitations, controversies, or debates]

## Connections & Applications
[How this concept connects to other areas and practical applications]

## Further Exploration
- [Advanced topics to explore next]
- [Recommended readings or resources]
- [Related concepts worth investigating]`;

    return {
      systemPrompt,
      userPrompt,
      formatInstructions,
      validationRules: [
        "Must include formal definition",
        "Historical context required",
        "Multiple perspectives should be presented",
        "Case studies and examples essential",
        "Current research section needed",
        "Further exploration suggestions required"
      ],
      outputStructure: "Comprehensive concept analysis with academic depth and practical connections",
      parameters: {
        temperature: 0.2,
        max_tokens: 4000,
        top_p: 0.85
      }
    };
  }

  /**
   * Simple Response Template - For quick educational questions
   */
  static buildSimpleResponseTemplate(context: PromptContext): TemplateConfig {
    const systemPrompt = `You are a helpful AI tutor providing concise, accurate responses to student questions.

RESPONSE GUIDELINES:
- Keep responses focused and to the point
- Provide clear, direct answers with complete information
- Include brief examples when helpful (real examples, not placeholders)
- Use simple formatting (bullets, basic structure)
- Maintain an encouraging, educational tone
- Avoid overly complex structures for simple questions
- NEVER use brackets [ ], placeholders, or template markers
- Write complete, natural responses ready for students to read`;

    const userPrompt = `Student Subject: ${context.subject}
${context.topic ? `Topic: ${context.topic}` : ''}
Student Level: ${context.userLevel || 'intermediate'}

Provide a clear, helpful response that directly addresses the student's question.`;

    return {
      systemPrompt,
      userPrompt,
      formatInstructions: `Provide a direct, well-structured response. Use basic formatting like bullets or simple sections if needed, but avoid complex templates for simple questions.`,
      validationRules: [
        "Response should be direct and focused",
        "Include examples when helpful",
        "Maintain educational value",
        "Use appropriate formatting for content complexity"
      ],
      outputStructure: "Direct, focused response with simple formatting",
      parameters: {
        temperature: 0.6,
        max_tokens: 1500,
        top_p: 0.9
      }
    };
  }

  /**
   * Build complete prompt for any response type
   */
  static buildPrompt(
    userMessage: string,
    context: PromptContext
  ): { 
    systemPrompt: string; 
    userPrompt: string; 
    parameters: { temperature: number; max_tokens: number; top_p: number };
    formatInstructions: string;
    validationRules: string[];
  } {
    const responseType = context.responseType || 'explanation';
    
    let template: TemplateConfig;
    
    // Enhanced template selection logic
    const isSimpleQuestion = context.intentContext?.type === 'question' && 
                             context.intentContext?.responseMode === 'educational' && 
                             userMessage.length < 50 && 
                             !context.responseType; // No specific response type requested

    const useRobustFramework = context.intentContext?.responseMode === 'educational' && 
                              !isSimpleQuestion &&
                              (responseType === 'explanation' || !context.responseType);
    
    if (isSimpleQuestion) {
      template = this.buildSimpleResponseTemplate(context);
    } else if (useRobustFramework) {
      // Use robust educational framework for substantive educational content
      template = this.buildRobustEducationalTemplate(context);
    } else {
      switch (responseType) {
        case 'study_plan':
          template = this.buildStudyPlanTemplate(context);
          break;
        case 'practice':
          template = this.buildPracticeTemplate(context);
          break;
        case 'concept':
          template = this.buildConceptTemplate(context);
          break;
        case 'explanation':
        default:
          // Legacy fallback - will redirect to robust template
          template = this.buildExplanationTemplate(context);
          break;
      }
    }

    // Enhance user prompt with the original message
    const enhancedUserPrompt = `${template.userPrompt}

Student Question/Request: "${userMessage}"

${template.formatInstructions}

CRITICAL: Follow the formatting instructions exactly. Your response will be processed by automated systems that expect this exact structure.`;

    return {
      systemPrompt: template.systemPrompt,
      userPrompt: enhancedUserPrompt,
      parameters: template.parameters,
      formatInstructions: template.formatInstructions,
      validationRules: template.validationRules
    };
  }

  /**
   * Validate educational content using the robust framework validator
   */
  static validateEducationalContent(response: string, context: { subject: string; topic?: string }): QualityCheckResult {
    return EducationalContentValidator.validateContent(response, context);
  }

  /**
   * Validate response against template rules (legacy method)
   */
  static validateResponse(response: string, responseType: string): {
    isValid: boolean;
    errors: string[];
    score: number;
  } {
    const errors: string[] = [];
    let score = 100;

    switch (responseType) {
      case 'study_plan':
        if (!response.includes('## Week')) {
          errors.push('Missing week structure (## Week [number]:)');
          score -= 30;
        }
        if (!response.includes('🎯')) {
          errors.push('Missing learning goals emoji indicator');
          score -= 10;
        }
        if (!response.includes('⏱️')) {
          errors.push('Missing time estimate emoji indicator');
          score -= 10;
        }
        if (!response.includes('📚')) {
          errors.push('Missing resources emoji indicator');
          score -= 10;
        }
        if (!response.includes('- [ ]')) {
          errors.push('Missing progress tracking checkboxes');
          score -= 20;
        }
        break;
        
      case 'explanation':
        if (!response.includes('## Overview')) {
          errors.push('Missing Overview section');
          score -= 20;
        }
        if (!response.includes('## Key Takeaways')) {
          errors.push('Missing Key Takeaways section');
          score -= 20;
        }
        if (!response.includes('**Example:**')) {
          errors.push('Missing practical examples');
          score -= 25;
        }
        break;
        
      case 'practice':
        if (!response.includes('Exercise')) {
          errors.push('Missing numbered exercises');
          score -= 30;
        }
        if (!response.includes('Answer Key')) {
          errors.push('Missing answer key section');
          score -= 25;
        }
        if (!response.includes('Self-Assessment')) {
          errors.push('Missing self-assessment rubric');
          score -= 20;
        }
        break;
        
      case 'concept':
        if (!response.includes('## Formal Definition')) {
          errors.push('Missing formal definition section');
          score -= 25;
        }
        if (!response.includes('## Historical Context')) {
          errors.push('Missing historical context section');
          score -= 20;
        }
        if (!response.includes('## Case Studies')) {
          errors.push('Missing case studies section');
          score -= 20;
        }
        break;
    }

    // General formatting checks
    if (!response.includes('#')) {
      errors.push('Missing proper heading structure');
      score -= 15;
    }

    return {
      isValid: errors.length === 0,
      errors,
      score: Math.max(0, score)
    };
  }

  /**
   * Get template metadata
   */
  static getTemplateInfo(responseType: string): {
    name: string;
    description: string;
    estimatedTokens: number;
    difficulty: string;
  } {
    const templates = {
      study_plan: {
        name: 'Study Plan Template',
        description: 'Comprehensive learning roadmap with weekly breakdown',
        estimatedTokens: 3000,
        difficulty: 'Complex'
      },
      explanation: {
        name: 'Concept Explanation Template',
        description: 'Clear, structured explanation with examples',
        estimatedTokens: 2500,
        difficulty: 'Moderate'
      },
      practice: {
        name: 'Practice Exercise Template',
        description: 'Interactive exercises with solutions and assessment',
        estimatedTokens: 3500,
        difficulty: 'Complex'
      },
      concept: {
        name: 'Deep Concept Analysis Template',
        description: 'Comprehensive academic analysis with multiple perspectives',
        estimatedTokens: 4000,
        difficulty: 'Advanced'
      }
    };

    return templates[responseType as keyof typeof templates] || templates.explanation;
  }
}

export default PromptTemplates;