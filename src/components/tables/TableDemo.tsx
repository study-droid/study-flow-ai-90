/**
 * Table Demo Component
 * Comprehensive demonstration of AI-powered table system
 */

import React, { useState } from 'react';
import { TableBuilder } from './TableBuilder';
import { AdvancedTable } from './AdvancedTable';
import { ExportPanel } from './ExportPanel';
import { PlayCircle, BookOpen, BarChart3, Users, DollarSign, Calendar } from 'lucide-react';
import type { TableConfig } from '@/types/table-types';
import type { ExportResult } from '@/services/tables/table-exporter';

interface DemoExample {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  prompt: string;
  category: 'educational' | 'business' | 'data' | 'personal';
}

const DEMO_EXAMPLES: DemoExample[] = [
  {
    id: 'study-schedule',
    title: 'Study Schedule',
    description: 'AI-generated weekly study plan with subjects and time allocation',
    icon: <BookOpen className="w-5 h-5" />,
    prompt: 'Create a weekly study schedule table for a computer science student with the following subjects: Data Structures, Algorithms, Database Systems, Web Development, and Machine Learning. Include columns for day, time slot, subject, topic, duration, and priority level.',
    category: 'educational'
  },
  {
    id: 'grade-tracker',
    title: 'Grade Tracker',
    description: 'Track academic performance across multiple courses',
    icon: <BarChart3 className="w-5 h-5" />,
    prompt: 'Generate a student grade tracking table with columns for course name, assignment type, assignment name, points earned, total points, percentage, letter grade, and date submitted. Include sample data for 5 courses.',
    category: 'educational'
  },
  {
    id: 'budget-planner',
    title: 'Budget Planner',
    description: 'Personal budget management with income and expense tracking',
    icon: <DollarSign className="w-5 h-5" />,
    prompt: 'Create a monthly budget planning table with categories for income sources, fixed expenses, variable expenses, savings goals, and remaining balance. Include realistic amounts and calculations.',
    category: 'personal'
  },
  {
    id: 'project-timeline',
    title: 'Project Timeline',
    description: 'Track project milestones and deadlines',
    icon: <Calendar className="w-5 h-5" />,
    prompt: 'Generate a project timeline table for developing a web application. Include columns for task name, phase, assigned team member, start date, due date, status, priority, and completion percentage.',
    category: 'business'
  },
  {
    id: 'team-performance',
    title: 'Team Performance',
    description: 'Employee performance metrics and KPIs',
    icon: <Users className="w-5 h-5" />,
    prompt: 'Create a team performance dashboard table with employee names, department, role, performance score, goals completed, projects assigned, hours worked, and performance rating.',
    category: 'business'
  },
  {
    id: 'sales-data',
    title: 'Sales Analytics',
    description: 'Sales performance data with trends and insights',
    icon: <BarChart3 className="w-5 h-5" />,
    prompt: 'Generate a sales analytics table with columns for product name, category, units sold, revenue, profit margin, growth rate, customer satisfaction, and regional performance.',
    category: 'data'
  }
];

export const TableDemo: React.FC = () => {
  const [currentView, setCurrentView] = useState<'examples' | 'builder' | 'display'>('examples');
  const [selectedExample, setSelectedExample] = useState<DemoExample | null>(null);
  const [tableConfig, setTableConfig] = useState<TableConfig | null>(null);
  const [isBuilding, setIsBuilding] = useState(false);

  const handleExampleSelect = (example: DemoExample) => {
    setSelectedExample(example);
    setCurrentView('builder');
  };

  const handleTableGenerated = (config: TableConfig) => {
    setTableConfig(config);
    setCurrentView('display');
    setIsBuilding(false);
  };

  const handleExportComplete = (result: ExportResult) => {
    console.log('Export completed:', result);
    // Handle export result (show notification, etc.)
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'educational': return <BookOpen className="w-4 h-4" />;
      case 'business': return <Users className="w-4 h-4" />;
      case 'data': return <BarChart3 className="w-4 h-4" />;
      case 'personal': return <DollarSign className="w-4 h-4" />;
      default: return <PlayCircle className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'educational': return 'bg-blue-100 text-blue-800';
      case 'business': return 'bg-green-100 text-green-800';
      case 'data': return 'bg-purple-100 text-purple-800';
      case 'personal': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            AI-Powered Table System Demo
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto">
            Experience intelligent table creation with AI Tutor integration. 
            Choose from examples or describe your own table requirements.
          </p>
        </div>

        {/* Navigation */}
        <div className="flex justify-center mb-8">
          <nav className="flex space-x-1 bg-white p-1 rounded-lg border border-gray-200">
            <button
              onClick={() => setCurrentView('examples')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'examples'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Examples
            </button>
            <button
              onClick={() => setCurrentView('builder')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                currentView === 'builder'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Builder
            </button>
            {tableConfig && (
              <button
                onClick={() => setCurrentView('display')}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentView === 'display'
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Table Display
              </button>
            )}
          </nav>
        </div>

        {/* Content */}
        <div className="max-w-6xl mx-auto">
          
          {/* Examples View */}
          {currentView === 'examples' && (
            <div>
              <div className="text-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  Choose a Demo Example
                </h2>
                <p className="text-gray-600">
                  Select from these pre-configured examples to see the AI table system in action
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {DEMO_EXAMPLES.map((example) => (
                  <div
                    key={example.id}
                    className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleExampleSelect(example)}
                  >
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center">
                        {example.icon}
                        <h3 className="ml-2 text-lg font-semibold text-gray-900">
                          {example.title}
                        </h3>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full flex items-center ${getCategoryColor(example.category)}`}>
                        {getCategoryIcon(example.category)}
                        <span className="ml-1 capitalize">{example.category}</span>
                      </span>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-4">
                      {example.description}
                    </p>
                    
                    <button className="flex items-center text-blue-600 text-sm font-medium hover:text-blue-700">
                      <PlayCircle className="w-4 h-4 mr-1" />
                      Try this example
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-8 text-center">
                <button
                  onClick={() => {
                    setSelectedExample(null);
                    setCurrentView('builder');
                  }}
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                >
                  <PlayCircle className="w-5 h-5 mr-2" />
                  Create Custom Table
                </button>
              </div>
            </div>
          )}

          {/* Builder View */}
          {currentView === 'builder' && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {selectedExample ? selectedExample.title : 'Custom Table Builder'}
                </h2>
                <p className="text-gray-600">
                  {selectedExample 
                    ? 'AI will generate a table based on this example'
                    : 'Describe your table requirements and let AI create it for you'
                  }
                </p>
              </div>

              <TableBuilder
                initialPrompt={selectedExample?.prompt}
                onTableGenerated={handleTableGenerated}
                onBuildingStateChange={setIsBuilding}
              />

              {selectedExample && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <h4 className="font-medium text-blue-900 mb-2">Example Details:</h4>
                  <p className="text-blue-800 text-sm">{selectedExample.description}</p>
                </div>
              )}
            </div>
          )}

          {/* Display View */}
          {currentView === 'display' && tableConfig && (
            <div>
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-2">
                  {tableConfig.title}
                </h2>
                {tableConfig.description && (
                  <p className="text-gray-600">{tableConfig.description}</p>
                )}
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                {/* Table Display */}
                <div className="xl:col-span-3">
                  <AdvancedTable config={tableConfig} />
                </div>

                {/* Export Panel */}
                <div className="xl:col-span-1">
                  <ExportPanel
                    config={tableConfig}
                    onExport={handleExportComplete}
                  />
                </div>
              </div>

              {/* Features Showcase */}
              <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">AI Integration</h3>
                  <p className="text-sm text-gray-600">
                    Powered by AI Tutor for intelligent table structure and data generation
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Professional Styling</h3>
                  <p className="text-sm text-gray-600">
                    Multiple formatting templates with responsive design and accessibility
                  </p>
                </div>
                
                <div className="bg-white p-6 rounded-lg border border-gray-200">
                  <h3 className="font-semibold text-gray-900 mb-2">Export Options</h3>
                  <p className="text-sm text-gray-600">
                    Export to HTML, CSV, JSON, and Excel formats with custom styling
                  </p>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};