import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

const FIELD_LABELS: Record<string, string> = {
  tagId: "tag ID",
  name: "name",
  email: "email",
};

function friendlyField(target: unknown): string {
  if (!Array.isArray(target) || target.length === 0) return "value";
  const field = target[target.length - 1];
  return FIELD_LABELS[field] ?? field;
}

// Maps a caught error to a clear, user-facing error response.
// Known Prisma error codes get a specific explanation; anything else falls
// back to the caller-supplied message.
export function errorResponse(error: unknown, fallback: string, status = 500) {
  console.error(fallback, error);

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case "P2002":
        return NextResponse.json(
          { error: `A record with this ${friendlyField(error.meta?.target)} already exists.` },
          { status: 409 }
        );
      case "P2003":
        return NextResponse.json(
          { error: "This record is linked to other data, so it can't be changed or deleted." },
          { status: 409 }
        );
      case "P2025":
        return NextResponse.json({ error: "Record not found." }, { status: 404 });
    }
  }

  return NextResponse.json({ error: fallback }, { status });
}
