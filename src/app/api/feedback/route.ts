import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { category, subject, message } = await req.json();

  if (!message?.trim()) {
    return NextResponse.json({ error: "Message is required" }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "Message must be 2000 characters or less" }, { status: 400 });
  }

  const toEmail = process.env.FEEDBACK_TO_EMAIL;
  if (!toEmail) {
    return NextResponse.json({ error: "Feedback email not configured" }, { status: 500 });
  }

  const senderName = session.user.name ?? "Unknown";
  const senderEmail = session.user.email ?? "Unknown";
  const subjectLine = subject?.trim()
    ? `[Goat Tracker Feedback] ${category}: ${subject.trim()}`
    : `[Goat Tracker Feedback] ${category}`;

  const body = [
    `From: ${senderName} <${senderEmail}>`,
    `Category: ${category}`,
    subject?.trim() ? `Subject: ${subject.trim()}` : null,
    ``,
    message.trim(),
  ]
    .filter((line) => line !== null)
    .join("\n");

  try {
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: toEmail,
      subject: subjectLine,
      text: body,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Feedback email error:", err);
    return NextResponse.json({ error: "Failed to send feedback" }, { status: 500 });
  }
}
