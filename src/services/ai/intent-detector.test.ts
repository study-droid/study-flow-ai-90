import { IntentDetector } from './intent-detector';

// Simple test function to verify intent detection
function testIntentDetection() {
  const testCases = [
    // Greeting cases
    { input: 'hi', expectedType: 'greeting', expectedMode: 'casual' },
    { input: 'Hello', expectedType: 'greeting', expectedMode: 'casual' },
    { input: 'Hey there!', expectedType: 'greeting', expectedMode: 'casual' },
    { input: 'Good morning', expectedType: 'greeting', expectedMode: 'casual' },
    
    // Casual cases
    { input: 'thanks', expectedType: 'casual', expectedMode: 'casual' },
    { input: 'ok', expectedType: 'casual', expectedMode: 'casual' },
    { input: 'yes', expectedType: 'casual', expectedMode: 'casual' },
    
    // Educational questions
    { input: 'What is photosynthesis?', expectedType: 'question', expectedMode: 'educational' },
    { input: 'How do I solve quadratic equations?', expectedType: 'question', expectedMode: 'educational' },
    { input: 'Explain the theory of relativity', expectedType: 'request', expectedMode: 'educational' },
    
    // Simple questions
    { input: 'What is 2+2?', expectedType: 'question', expectedMode: 'educational' },
    { input: 'How are you?', expectedType: 'casual', expectedMode: 'casual' },
    
    // Complex educational requests
    { input: 'Can you help me understand the concept of machine learning algorithms and their applications in modern technology?', expectedType: 'request', expectedMode: 'educational' }
  ];

  console.log('Testing Intent Detection:');
  console.log('========================');

  let passed = 0;
  const total = testCases.length;

  testCases.forEach((testCase, index) => {
    const result = IntentDetector.detectIntent(testCase.input);
    const typeMatch = result.type === testCase.expectedType;
    const modeMatch = result.responseMode === testCase.expectedMode;
    const success = typeMatch && modeMatch;
    
    if (success) passed++;
    
    console.log(`Test ${index + 1}: ${success ? '✅' : '❌'}`);
    console.log(`  Input: "${testCase.input}"`);
    console.log(`  Expected: ${testCase.expectedType} (${testCase.expectedMode})`);
    console.log(`  Actual: ${result.type} (${result.responseMode}) - Confidence: ${result.confidence}`);
    console.log('');
  });

  console.log(`Results: ${passed}/${total} tests passed (${Math.round((passed/total) * 100)}%)`);
  
  return { passed, total, percentage: Math.round((passed/total) * 100) };
}

// Export for testing
export { testIntentDetection };