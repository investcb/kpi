export interface UserProfile {
  uid: string;
  fullName: string;
  department: string;
  position: string;
  kpiGoal: number; // monthly target (e.g., 100 points)
  createdAt?: string;
}

export type TaskType = "daily" | "monthly" | "future";
export type TaskStatus = "pending" | "completed";

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  type: TaskType;
  status: TaskStatus;
  kpiCategory: string; // e.g. "Chuyên môn", "Đoàn thể", "Học tập"
  kpiScore: number; // maximum KPI score available (e.g. 10)
  selfGradedScore: number; // score user claims (e.g. 10)
  evidence?: string; // proof of work (e.g. Quyết định số 12/BC-UBND)
  createdAt: string;
  updatedAt: string;
  participationRate?: number;
  executionMinutes?: number;
  quantity?: string;
  quality?: string;
  progress?: string;
  reworkCount?: number;
  timeRange?: string;
  subtasks?: { text: string; completed: boolean }[];
}

export interface KPICategoryDefinition {
  id: string;
  name: string;
  maxScore: number;
  description: string;
}

export interface AISuggestionResponse {
  refinedTitle: string;
  refinedDescription: string;
  recommendedCategory: string;
  recommendedScore: number;
  recommendedEvidenceTemplate: string;
  explanation: string;
}
