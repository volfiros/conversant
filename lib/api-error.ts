export function apiError(message: string, status = 500) {
  return Response.json({ error: message }, { status })
}
