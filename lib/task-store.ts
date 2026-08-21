export interface TaskState {
  task_id: string;
  status: 'processing' | 'completed' | 'failed';
  step?: string;
  createdAt: number;
  completedAt?: number;
  error?: string;
  reply?: string;
  active_prompt?: string;
  active_model?: string;
  active_kb?: string;
  image_url?: string;
  image_urls?: string[];
  total_images?: number;
  total_pages?: number;
  pages?: string[];
}

declare global {
  var __taskStore: Map<string, TaskState> | undefined;
}

const taskStore = globalThis.__taskStore || new Map<string, TaskState>();
globalThis.__taskStore = taskStore;

const TASK_TTL_MS = 15 * 60 * 1000; // 15 minutes TTL

function cleanupExpiredTasks() {
  const now = Date.now();
  for (const [id, task] of taskStore.entries()) {
    if (now - task.createdAt > TASK_TTL_MS) {
      taskStore.delete(id);
    }
  }
}

export function createTask(taskId: string): TaskState {
  cleanupExpiredTasks();
  const newTask: TaskState = {
    task_id: taskId,
    status: 'processing',
    createdAt: Date.now()
  };
  taskStore.set(taskId, newTask);
  return newTask;
}

export function updateTask(taskId: string, update: Partial<TaskState>): TaskState | undefined {
  const existing = taskStore.get(taskId);
  if (!existing) return undefined;
  const updated = { ...existing, ...update };
  taskStore.set(taskId, updated);
  return updated;
}

export function getTask(taskId: string): TaskState | undefined {
  cleanupExpiredTasks();
  return taskStore.get(taskId);
}
