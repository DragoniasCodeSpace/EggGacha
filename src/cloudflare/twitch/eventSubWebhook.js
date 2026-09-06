import {
    hasProcessedEventSubMessage,
    markEventSubMessageProcessed,
    cleanupProcessedEventSubMessages
} from "../database/eventSubMessages.js";

import {
    handleEggRedemption
} from "./redemptions.js";

import {
    handleChatMessage
} from "./chat.js";

const MAX_MESSAGE_AGE_MS =
    10 * 60 * 1000;

export async function handleEventSubWebhook(
    request,
    env
) {
    if (request.method !== "POST") {
        return new Response(
            "Method Not Allowed",
            {
                status: 405
            }
        );
    }

    const messageId =
        request.headers.get(
            "Twitch-Eventsub-Message-Id"
        );

    const messageTimestamp =
        request.headers.get(
            "Twitch-Eventsub-Message-Timestamp"
        );

    const messageSignature =
        request.headers.get(
            "Twitch-Eventsub-Message-Signature"
        );

    const messageType =
        request.headers.get(
            "Twitch-Eventsub-Message-Type"
        );

    if (
        !messageId ||
        !messageTimestamp ||
        !messageSignature ||
        !messageType
    ) {
        return new Response(
            "Missing EventSub headers",
            {
                status: 400
            }
        );
    }

    const rawBody =
        await request.text();

    const validSignature =
        await verifyEventSubSignature(
            env.TWITCH_EVENTSUB_SECRET,
            messageId,
            messageTimestamp,
            rawBody,
            messageSignature
        );

    if (!validSignature) {
        console.warn(
            "Rejected EventSub message with invalid signature."
        );

        return new Response(
            "Invalid signature",
            {
                status: 403
            }
        );
    }

    const timestamp =
        Date.parse(messageTimestamp);

    if (
        Number.isNaN(timestamp) ||
        Math.abs(
            Date.now() - timestamp
        ) > MAX_MESSAGE_AGE_MS
    ) {
        console.warn(
            "Rejected old EventSub message."
        );

        return new Response(
            "Expired message",
            {
                status: 403
            }
        );
    }

    let payload;

    try {
        payload =
            JSON.parse(rawBody);
    } catch {
        return new Response(
            "Invalid JSON",
            {
                status: 400
            }
        );
    }

    if (
        messageType ===
        "webhook_callback_verification"
    ) {
        if (!payload.challenge) {
            return new Response(
                "Missing challenge",
                {
                    status: 400
                }
            );
        }

        console.log(
            "EventSub webhook verified:",
            payload.subscription?.type
        );

        return new Response(
            payload.challenge,
            {
                status: 200,
                headers: {
                    "Content-Type":
                        "text/plain"
                }
            }
        );
    }

    if (
        messageType ===
        "revocation"
    ) {
        console.warn(
            "EventSub subscription revoked:",
            payload.subscription?.type,
            payload.subscription?.status
        );

        return new Response(
            null,
            {
                status: 204
            }
        );
    }

    if (
        messageType !==
        "notification"
    ) {
        return new Response(
            null,
            {
                status: 204
            }
        );
    }

    const alreadyProcessed =
        await hasProcessedEventSubMessage(
            env.DB,
            messageId
        );

    if (alreadyProcessed) {
        console.log(
            `Ignoring duplicate EventSub message ${messageId}`
        );

        return new Response(
            null,
            {
                status: 204
            }
        );
    }

    const subscriptionType =
        payload.subscription?.type;

    console.log(
        "EventSub notification received:",
        subscriptionType
    );

    if (
        subscriptionType ===
        "channel.channel_points_custom_reward_redemption.add"
    ) {
        await handleEggRedemption(
            env,
            payload.event
        );
    }

    if (
        subscriptionType ===
        "channel.chat.message"
    ) {
        await handleChatMessage(
            env,
            payload.event
        );
    }

    await markEventSubMessageProcessed(
        env.DB,
        messageId
    );

    await cleanupProcessedEventSubMessages(
        env.DB
    );

    return new Response(
        null,
        {
            status: 204
        }
    );
}

async function verifyEventSubSignature(
    secret,
    messageId,
    timestamp,
    rawBody,
    receivedSignature
) {
    if (
        !secret ||
        !receivedSignature.startsWith(
            "sha256="
        )
    ) {
        return false;
    }

    const encoder =
        new TextEncoder();

    const key =
        await crypto.subtle.importKey(
            "raw",
            encoder.encode(secret),
            {
                name: "HMAC",
                hash: "SHA-256"
            },
            false,
            [
                "verify"
            ]
        );

    const signatureHex =
        receivedSignature.substring(
            "sha256=".length
        );

    if (
        !/^[0-9a-f]{64}$/i.test(
            signatureHex
        )
    ) {
        return false;
    }

    const signatureBytes =
        hexToBytes(
            signatureHex
        );

    const message =
        messageId +
        timestamp +
        rawBody;

    return await crypto.subtle.verify(
        "HMAC",
        key,
        signatureBytes,
        encoder.encode(message)
    );
}

function hexToBytes(hex) {
    const bytes =
        new Uint8Array(
            hex.length / 2
        );

    for (
        let i = 0;
        i < hex.length;
        i += 2
    ) {
        bytes[i / 2] =
            Number.parseInt(
                hex.slice(
                    i,
                    i + 2
                ),
                16
            );
    }

    return bytes;
}