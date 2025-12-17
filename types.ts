
export enum AppSection {
  RESEARCH = 'RESEARCH',
  VIDEO = 'VIDEO',
  NOTES = 'NOTES',
  STUDY = 'STUDY',
  QUIZ = 'QUIZ',
}

export interface Message {
  id: string;
  role: 'user' | 'ai';
  content: string;
  timestamp: Date;
  sources?: Array<{ title: string; uri: string }>;
}

export interface VideoResult {
  title: string;
  url: string;
  description: string;
  videoId: string;
  thumbnail?: string;
  duration?: string;
  channelTitle?: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string; // The text of the correct option
  explanation: string;
}

export interface QuizData {
  topic: string;
  questions: QuizQuestion[];
}

export interface FormInput {
  topic: string;
  className: string; // 'class' is reserved
  instructions: string;
  level?: string; // For quiz
}

// New Types for Saved Library System
export interface SavedLibraryItem {
  id: string;
  type: 'VIDEO' | 'NOTE' | 'STUDY' | 'QUIZ';
  topic: string;
  className: string;
  createdAt: string; // ISO String
  data: any; // Flexible payload (Markdown string, VideoResult[], or QuizResult)
}

export interface QuizResult extends QuizData {
  score: number;
  totalQuestions: number;
  dateTaken: string;
}
