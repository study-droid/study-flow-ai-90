import type { TableConfig, TableRow, TableColumn } from '@/types/table-types';

type Template = {
  id: string;
  name: string;
  description: string;
  config: TableConfig;
};

function makeRows(columns: TableColumn[], rows: Array<Record<string, any>>): TableRow[] {
  return rows.map((r, idx) => ({ id: idx, data: r, selected: false }));
}

export const TABLE_TEMPLATES: Template[] = [
  {
    id: 'study-planner',
    name: 'Study Planner',
    description: 'Weekly plan of study sessions with subjects and goals',
    config: {
      columns: [
        { id: 'day', key: 'day', title: 'Day', dataType: 'string', sortable: true, filterable: true, visible: true, align: 'left' },
        { id: 'subject', key: 'subject', title: 'Subject', dataType: 'string', sortable: true, filterable: true, visible: true, align: 'left' },
        { id: 'topic', key: 'topic', title: 'Topic', dataType: 'string', sortable: true, filterable: true, visible: true, align: 'left' },
        { id: 'duration', key: 'duration', title: 'Duration (min)', dataType: 'number', sortable: true, filterable: true, visible: true, align: 'right' },
        { id: 'goal', key: 'goal', title: 'Goal', dataType: 'string', sortable: false, filterable: true, visible: true, align: 'left' },
        { id: 'status', key: 'status', title: 'Status', dataType: 'string', sortable: true, filterable: true, visible: true, align: 'left' },
      ],
      data: makeRows(
        [],
        [
          { day: 'Mon', subject: 'Math', topic: 'Algebra', duration: 60, goal: 'Practice equations', status: 'Planned' },
          { day: 'Tue', subject: 'Physics', topic: 'Kinematics', duration: 45, goal: 'Read chapter 3', status: 'Planned' },
          { day: 'Wed', subject: 'History', topic: 'Revolution', duration: 40, goal: 'Summarize notes', status: 'Planned' },
        ]
      ),
      styling: { size: 'md', striped: true, bordered: true, hoverable: true, theme: 'default' },
      accessibility: { caption: 'Weekly Study Planner', enableKeyboardNavigation: true },
      sorting: { enabled: true, multiColumn: false },
      filtering: { enabled: true, globalSearch: true },
      pagination: { enabled: true, page: 1, pageSize: 10, showPageSizeSelector: true },
      performance: { searchDebounce: 300, filterDebounce: 300 },
      export: { enableExport: true, formats: ['csv', 'json', 'html'], filename: 'study-planner' },
    },
  },
  {
    id: 'assignment-tracker',
    name: 'Assignment Tracker',
    description: 'Track assignments, due dates and completion',
    config: {
      columns: [
        { id: 'title', key: 'title', title: 'Title', dataType: 'string', sortable: true, filterable: true, visible: true, align: 'left' },
        { id: 'subject', key: 'subject', title: 'Subject', dataType: 'string', sortable: true, filterable: true, visible: true, align: 'left' },
        { id: 'due', key: 'due', title: 'Due Date', dataType: 'date', sortable: true, filterable: true, visible: true, align: 'left' },
        { id: 'priority', key: 'priority', title: 'Priority', dataType: 'string', sortable: true, filterable: true, visible: true, align: 'left' },
        { id: 'complete', key: 'complete', title: 'Complete', dataType: 'boolean', sortable: true, filterable: true, visible: true, align: 'left' },
      ],
      data: makeRows(
        [],
        [
          { title: 'Essay draft', subject: 'English', due: '2025-09-10', priority: 'High', complete: false },
          { title: 'Lab report', subject: 'Chemistry', due: '2025-09-12', priority: 'Medium', complete: false },
          { title: 'Problem set', subject: 'Math', due: '2025-09-14', priority: 'High', complete: true },
        ]
      ),
      styling: { size: 'md', striped: true, bordered: true, hoverable: true, theme: 'default' },
      accessibility: { caption: 'Assignment Tracker', enableKeyboardNavigation: true },
      sorting: { enabled: true, multiColumn: false },
      filtering: { enabled: true, globalSearch: true },
      pagination: { enabled: true, page: 1, pageSize: 10, showPageSizeSelector: true },
      performance: { searchDebounce: 300, filterDebounce: 300 },
      export: { enableExport: true, formats: ['csv', 'json', 'html'], filename: 'assignment-tracker' },
    },
  },
  {
    id: 'reading-list',
    name: 'Reading List',
    description: 'Reading log with progress and notes',
    config: {
      columns: [
        { id: 'title', key: 'title', title: 'Title', dataType: 'string', sortable: true, filterable: true, visible: true, align: 'left' },
        { id: 'author', key: 'author', title: 'Author', dataType: 'string', sortable: true, filterable: true, visible: true, align: 'left' },
        { id: 'pages', key: 'pages', title: 'Pages', dataType: 'number', sortable: true, filterable: true, visible: true, align: 'right' },
        { id: 'progress', key: 'progress', title: 'Progress %', dataType: 'number', sortable: true, filterable: true, visible: true, align: 'right' },
        { id: 'notes', key: 'notes', title: 'Notes', dataType: 'string', sortable: false, filterable: true, visible: true, align: 'left' },
      ],
      data: makeRows(
        [],
        [
          { title: 'Atomic Habits', author: 'James Clear', pages: 280, progress: 25, notes: 'Great intro.' },
          { title: 'Deep Work', author: 'Cal Newport', pages: 296, progress: 60, notes: 'Focus rituals.' },
          { title: 'Sapiens', author: 'Yuval N. Harari', pages: 498, progress: 10, notes: 'Big picture history.' },
        ]
      ),
      styling: { size: 'md', striped: true, bordered: true, hoverable: true, theme: 'default' },
      accessibility: { caption: 'Reading List', enableKeyboardNavigation: true },
      sorting: { enabled: true, multiColumn: false },
      filtering: { enabled: true, globalSearch: true },
      pagination: { enabled: true, page: 1, pageSize: 10, showPageSizeSelector: true },
      performance: { searchDebounce: 300, filterDebounce: 300 },
      export: { enableExport: true, formats: ['csv', 'json', 'html'], filename: 'reading-list' },
    },
  },
];

export type { Template };

