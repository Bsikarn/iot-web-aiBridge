import { NextResponse } from 'next/server';
import { isAuthorizedBoardRequest } from '@/lib/auth';
import { getTaskState } from '@/lib/redis';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  try {
    // Secret Header Authorization Check (x-board-key) / Same-Origin Check
    if (!isAuthorizedBoardRequest(req)) {
      return NextResponse.json(
        { error: "Unauthorized API Access", status: 401 },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get('task_id');

    if (!taskId) {
      return NextResponse.json({ error: "Missing task_id query parameter" }, { status: 400 });
    }

    const task = await getTaskState(taskId);

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    if (task.status === 'processing') {
      return NextResponse.json({
        status: "processing",
        step: task.step || "processing",
        task_id: taskId
      }, { status: 200 });
    }

    if (task.status === 'failed') {
      return NextResponse.json({
        status: "failed",
        step: task.step || "failed",
        task_id: taskId,
        error: task.error || "Task processing failed"
      }, { status: 200 });
    }

    return NextResponse.json({
      status: "completed",
      step: "completed",
      task_id: taskId,
      pages: task.pages || [],
      total_pages: task.total_pages || 0,
      reply: task.reply || "",
      active_prompt: task.active_prompt || "",
      active_model: task.active_model || "",
      active_kb: task.active_kb || "",
      image_url: task.image_url || "",
      image_urls: task.image_urls || [],
      total_images: task.total_images || 0
    }, { status: 200 });

  } catch (error: any) {
    console.error("API /api/status Critical Error:", error);
    return NextResponse.json({
      error: error.message || "An error occurred while checking task status"
    }, { status: 500 });
  }
}
