import { getRecentMessages, insertMessage, deleteMessage, clearAllMessages } from "../db";

const DELETE_PASSWORD = "0730";

export function handleGetMessages(): Response {
  const messages = getRecentMessages();
  return Response.json({ messages });
}

export async function handlePostMessage(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.author !== "string" || typeof body.content !== "string") {
    return Response.json({ error: "Missing author or content" }, { status: 400 });
  }

  const author = body.author.trim().slice(0, 50);
  const content = body.content.trim().slice(0, 500);
  if (!author || !content) {
    return Response.json({ error: "Author and content cannot be empty" }, { status: 400 });
  }

  const id = insertMessage(author, content);
  return Response.json({ id, author, content }, { status: 201 });
}

export async function handleDeleteMessage(req: Request): Promise<Response> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.password !== "string") {
    return Response.json({ error: "Missing password" }, { status: 400 });
  }

  if (body.password !== DELETE_PASSWORD) {
    return Response.json({ error: "Wrong password" }, { status: 403 });
  }

  if (body.id === "all") {
    clearAllMessages();
    return Response.json({ ok: true });
  }

  const id = Number(body.id);
  if (!id || id <= 0) {
    return Response.json({ error: "Invalid message id" }, { status: 400 });
  }

  const deleted = deleteMessage(id);
  if (!deleted) {
    return Response.json({ error: "Message not found" }, { status: 404 });
  }

  return Response.json({ ok: true });
}
