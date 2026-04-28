import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const authorization = request.headers.get("authorization");

    const response = await fetch(`${BACKEND_API_URL}/announcements`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body,
      cache: "no-store",
    });

    const responseText = await response.text();
    const responseType = response.headers.get("content-type") ?? "";

    if (responseType.includes("application/json")) {
      return new Response(responseText, {
        status: response.status,
        headers: {
          "Content-Type": "application/json",
        },
      });
    }

    return NextResponse.json(
      {
        message: responseText || "Не удалось создать объявление.",
      },
      { status: response.status },
    );
  } catch {
    return NextResponse.json(
      {
        message: "Не удалось связаться с сервером объявлений.",
      },
      { status: 502 },
    );
  }
}
