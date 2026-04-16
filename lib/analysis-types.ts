// Shared TypeScript types for structured AI analysis

export type MeetingType = 'broker_seminar' | 'company_visit' | 'earnings_call' | 'other';

export type SentimentType = 'positive' | 'cautious' | 'neutral' | 'evasive' | 'negative';

export type QACategory =
  | 'revenue_guidance'
  | 'margin'
  | 'capacity'
  | 'demand'
  | 'competition'
  | 'technology'
  | 'capex'
  | 'dividend'
  | 'management'
  | 'other';

export interface FinancialDataItem {
  metric: string;
  value: string;
  change?: string;
  vsGuidance?: string;
  source: 'stated' | 'implied';
  timestamp?: number;
}

export interface SentimentItem {
  topic: string;
  sentiment: SentimentType;
  evidence: string;
  timestamp?: number;
}

export interface QAItem {
  question: string;
  answer: string;
  category: QACategory;
  importance: 'high' | 'medium' | 'low';
  timestamp?: number;
}

export interface FollowUpItem {
  item: string;
  deadline?: string;
  priority: 'urgent' | 'normal';
}

export interface RiskOpportunityItem {
  type: 'risk' | 'opportunity';
  description: string;
  timeframe: 'short' | 'medium' | 'long';
}

export interface FullAnalysis {
  executiveSummary: string;
  financialData: FinancialDataItem[];
  sentimentAnalysis: SentimentItem[];
  qaHighlights: QAItem[];
  followUpItems: FollowUpItem[];
  risksAndOpportunities: RiskOpportunityItem[];
  confidence: number; // 0-100
  warnings: string[];
}

export interface HistoricalComparison {
  lastMeetingId: string;
  lastMeetingDate: string;
  lastMeetingType: MeetingType;
  financialChanges: {
    metric: string;
    thisTime: string;
    lastTime: string;
    direction: 'up' | 'down' | 'flat' | 'new';
    significance: 'significant' | 'minor';
  }[];
  sentimentShifts: {
    topic: string;
    thisTime: SentimentType;
    lastTime: SentimentType;
    changed: boolean;
  }[];
  newTopics: string[];
  disappearedTopics: string[];
  followUpResolutions: {
    originalItem: string;
    resolved: boolean;
    resolution?: string;
  }[];
  comparisonSummary: string;
}
