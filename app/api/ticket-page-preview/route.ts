import { NextResponse } from "next/server";

import { fetchTicketPagePreview } from "@/lib/ticket-url-preview";

const MAX_BODY = 4096;

export async function POST(request: Request) {
  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY) {
      return NextResponse.json({ error: "Body too large" }, { status: 400 });
    }
    let body: unknown;
    try {
      body = JSON.parse(raw) as unknown;
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }
    const url = (body as { url?: unknown }).url;
    if (typeof url !== "string" || !url.trim().startsWith("https://")) {
      return NextResponse.json(
        { error: "url must be a string starting with https://" },
        { status: 400 },
      );
    }

    const result = await fetchTicketPagePreview(url);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: "Unexpected server error", details: String(error) },
      { status: 500 },
    );
  }
}
