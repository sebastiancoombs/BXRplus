import { authenticateWorkflowRequest } from "@/src/open-agent-builder/server/auth";
import { workflowErrorResponse } from "@/src/open-agent-builder/server/errors";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

type RouteContext = { params: Promise<{ runId: string }> };
const terminalStatuses = new Set([
  "waiting_approval",
  "completed",
  "failed",
  "cancelled",
]);

export async function GET(request: Request, context: RouteContext) {
  try {
    const { runId } = await context.params;
    const { supabase } = await authenticateWorkflowRequest(request);
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let previous = "";
        let closed = false;
        request.signal.addEventListener("abort", () => {
          closed = true;
          try { controller.close(); } catch {}
        });

        for (let tick = 0; tick < 600 && !closed; tick += 1) {
          const { data, error } = await supabase
            .from("agent_workflow_runs")
            .select("*, agent_workflow_node_runs(*)")
            .eq("id", runId)
            .order("created_at", {
              referencedTable: "agent_workflow_node_runs",
              ascending: true,
            })
            .single();
          if (error || !data) {
            controller.enqueue(encoder.encode(`event: error\ndata: ${JSON.stringify({ message: "Run not found." })}\n\n`));
            break;
          }
          const serialized = JSON.stringify(data);
          if (serialized !== previous) {
            controller.enqueue(encoder.encode(`event: run\ndata: ${serialized}\n\n`));
            previous = serialized;
          } else if (tick % 15 === 0) {
            controller.enqueue(encoder.encode(": keepalive\n\n"));
          }
          if (terminalStatuses.has(data.status)) break;
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (!closed) controller.close();
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return workflowErrorResponse(error);
  }
}
