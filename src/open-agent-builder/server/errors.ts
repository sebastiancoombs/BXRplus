export class WorkflowHttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "WorkflowHttpError";
    this.status = status;
  }
}

export function workflowErrorResponse(error: unknown) {
  if (error instanceof WorkflowHttpError) {
    return Response.json({ error: error.message }, { status: error.status });
  }

  console.error("Workflow API error:", error);
  return Response.json(
    { error: "The workflow request could not be completed." },
    { status: 500 },
  );
}
