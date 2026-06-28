import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAuthenticatedUser, canAccessSession } from "@/lib/api-auth";
import { testWebhook } from "@/lib/webhook";

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ sessionId: string; id: string }> }
) {
    const user = await getAuthenticatedUser(request);
    if (!user) {
        return NextResponse.json({ status: false, message: "Unauthorized", error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId, id } = await params;

    const hasAccess = await canAccessSession(user.id, user.role, sessionId);
    if (!hasAccess) {
        return NextResponse.json({ status: false, message: "Forbidden", error: "Forbidden" }, { status: 403 });
    }

    try {
        // Verify webhook ownership
        const webhook = await prisma.webhook.findFirst({
            where: {
                id,
                userId: user.id,
                OR: [
                    { sessionId: sessionId },
                    { sessionId: null }
                ]
            }
        });

        if (!webhook) {
            return NextResponse.json({ status: false, message: "Webhook not found", error: "Webhook not found" }, { status: 404 });
        }

        const result = await testWebhook(webhook.id, webhook.url, webhook.secret);

        return NextResponse.json({
            status: true,
            message: result.success ? "Webhook test successful" : "Webhook test failed",
            data: result
        });
    } catch (error) {
        console.error("Test webhook error:", error);
        return NextResponse.json({ status: false, message: "Failed to test webhook", error: "Failed to test webhook" }, { status: 500 });
    }
}
