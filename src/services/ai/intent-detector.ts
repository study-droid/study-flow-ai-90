/**
 * Intent Detection for Educational AI Interactions
 */

export interface MessageIntent {
  primary: "explanation" | "study_plan" | "practice" | "concept_analysis" | "chat" | "help" | "clarification";
  confidence: number;
  context: {
    subject?: string;
    difficulty?: "beginner" | "intermediate" | "advanced";
    urgency?: "low" | "medium" | "high";
    responseLength?: "brief" | "detailed" | "comprehensive";
  };
  keywords: string[];
  suggestions?: string[];
}

export class IntentDetector {
  static analyzeIntent(message: string): MessageIntent {
    return {
      primary: "chat",
      confidence: 0.8,
      context: { responseLength: "detailed" },
      keywords: [],
      suggestions: []
    };
  }

  static prefersStructuredResponse(intent: MessageIntent): boolean {
    return ["study_plan", "practice", "concept_analysis"].includes(intent.primary) && intent.confidence > 0.6;
  }

  static getStructuredResponseType(intent: MessageIntent): string {
    const mapping: Record<string, string> = {
      explanation: "explanation",
      study_plan: "study_plan", 
      practice: "practice",
      concept_analysis: "concept_analysis"
    };
    return mapping[intent.primary] || "chat";
  }
}
