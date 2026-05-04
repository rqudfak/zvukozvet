import { NextRequest, NextResponse } from "next/server";

const BACKEND_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.text();
    const authorization = request.headers.get("authorization");

    const response = await fetch(`${BACKEND_API_URL}/announcements/${id}`, {
      method: "PUT",
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
        message: responseText || "Не удалось обновить объявление.",
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

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const authorization = request.headers.get("authorization");

    const response = await fetch(`${BACKEND_API_URL}/announcements/${id}`, {
      method: "DELETE",
      headers: {
        Accept: "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
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
        message: responseText || "Не удалось удалить объявление.",
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
