import { Redis } from '@upstash/redis';
import { TaskState, createTask as createMemoryTask, updateTask as updateMemoryTask, getTask as getMemoryTask } from './task-store';

const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

export const redis = (redisUrl && redisToken)
  ? new Redis({
      url: redisUrl,
      token: redisToken,
    })
  : null;

/**
 * Save or update task state in Upstash Redis (with TTL), falling back to memory store if Redis is unconfigured.
 */
export async function setTaskState(taskId: string, data: Partial<TaskState>, ttlSeconds = 900): Promise<void> {
  const key = `task:${taskId}`;
  
  if (redis) {
    try {
      const existing = await redis.get<TaskState>(key);
      const merged: TaskState = {
        task_id: taskId,
        status: data.status || existing?.status || 'processing',
        createdAt: existing?.createdAt || Date.now(),
        ...existing,
        ...data
      };
      await redis.set(key, JSON.stringify(merged), { ex: ttlSeconds });
      return;
    } catch (err) {
      console.error("Upstash Redis set error, falling back to memory store:", err);
    }
  }

  // Fallback to in-memory store
  const existingMemory = getMemoryTask(taskId);
  if (!existingMemory) {
    createMemoryTask(taskId);
  }
  updateMemoryTask(taskId, data);
}

/**
 * Retrieve task state from Upstash Redis, falling back to memory store if Redis is unconfigured.
 */
export async function getTaskState(taskId: string): Promise<TaskState | null> {
  const key = `task:${taskId}`;

  if (redis) {
    try {
      const raw = await redis.get<any>(key);
      if (!raw) return null;
      if (typeof raw === 'string') {
        return JSON.parse(raw) as TaskState;
      }
      return raw as TaskState;
    } catch (err) {
      console.error("Upstash Redis get error, falling back to memory store:", err);
    }
  }

  // Fallback to in-memory store
  const memoryTask = getMemoryTask(taskId);
  return memoryTask || null;
}
