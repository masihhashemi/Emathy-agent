export enum AppScreen {
  CONFIG = 'CONFIG',
  EMAIL_SIMULATION = 'EMAIL_SIMULATION',
  INTERVIEW = 'INTERVIEW',
  REPORT = 'REPORT',
}

export enum InterviewStyle {
  DIRECT = 'Direct',
  INDIRECT = 'Indirect/Conversational',
}

export enum InterviewMode {
  VOICE = 'Voice',
  TEXT = 'Text',
}

export interface DeepResearchData {
  challenge: string;
  context: string; // The deep research text
  style: InterviewStyle;
  mode: InterviewMode;
}

export interface EmpathyCanvas {
  thinkAndFeel: string[];
  see: string[];
  hear: string[];
  sayAndDo: string[];
  pains: string[];
  gains: string[];
}

export interface InterviewReport {
  intervieweeName: string;
  biography: string;
  transcript: string; // Full transcript
  canvas: EmpathyCanvas;
  machineInsights: string; // The 2-3 paragraphs of insight
}

export interface AudioContextState {
  isRecording: boolean;
  isPlaying: boolean;
  volume: number;
}

export type LogMessage = {
  role: 'user' | 'model' | 'system';
  text: string;
  timestamp: number;
};