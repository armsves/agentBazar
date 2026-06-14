import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import {
  handleDelegationCreated,
  handleDelegationRevoked,
  handlePing,
  verifyWebhookSignature,
  WebhookPayloadSchema,
} from "@/lib/dynamic/webhooks";

/**
 * Webhook endpoint for Dynamic events
 *
 * This endpoint receives webhooks from Dynamic and processes them securely:
 * 1. Verifies the webhook signature to ensure authenticity
 * 2. Validates the payload structure using Zod schemas
 * 3. Routes to appropriate handlers based on event type
 *
 * Configure this URL in your Dynamic dashboard:
 * https://your-domain.com/api/webhooks/dynamic
 *
 * Supported events:
 * - ping: Health check event
 * - wallet.delegation.created: Fired when a delegation is created
 * - wallet.delegation.revoked: Fired when a delegation is revoked
 */
export async function handleWebhookRequest(request: NextRequest) {
  // Step 1: Verify the signature and extract payload
  // This ensures the webhook is authentic and from Dynamic
  const verificationResult = await verifyWebhookSignature(request);

  if (!verificationResult.success) {
    return NextResponse.json(
      { error: verificationResult.error },
      { status: verificationResult.status }
    );
  }

  const rawPayload = verificationResult.payload;
  const eventName =
    typeof rawPayload === "object" &&
    rawPayload !== null &&
    "eventName" in rawPayload &&
    typeof rawPayload.eventName === "string"
      ? rawPayload.eventName
      : undefined;

  const handledEvents = new Set([
    "ping",
    "wallet.delegation.created",
    "wallet.delegation.revoked",
  ]);

  if (!eventName || !handledEvents.has(eventName)) {
    return NextResponse.json(
      { success: true, message: `Ignored event: ${eventName ?? "unknown"}` },
      { status: 200 }
    );
  }

  const validationResult = WebhookPayloadSchema.safeParse(rawPayload);

  if (!validationResult.success) {
    console.error("Invalid payload structure:", validationResult.error.issues);
    return NextResponse.json(
      {
        error: "Invalid payload structure",
        details: validationResult.error.issues,
      },
      { status: 400 }
    );
  }

  // Step 3: Route to appropriate handler based on event type
  // Add new event handlers here as you support more webhook events
  let result: { success: boolean; message: string };

  const payload = validationResult.data;
  switch (payload.eventName) {
    case "ping":
      result = await handlePing(payload);
      break;
    case "wallet.delegation.created":
      result = await handleDelegationCreated(payload);
      break;
    case "wallet.delegation.revoked":
      result = await handleDelegationRevoked(payload);
      break;
  }

  return NextResponse.json(result, {
    status: result.success ? 200 : 500,
  });
}
