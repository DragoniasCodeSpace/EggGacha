import { WebSocket } from "ws";

import { config } from "../config/config.js";
import { subscribeToChat } from "./chat.js";


const EVENTSUB_URL =
    "wss://eventsub.wss.twitch.tv/ws";


// ======================================================
// Connect to Twitch EventSub
// ======================================================

export function connectToEventSub(
    twitchSession,
    onRedemption,
    onChatMessage
) {

    const socket =
        new WebSocket(
            EVENTSUB_URL
        );


    socket.on(
        "open",
        () => {

            console.log(
                "Connected to Twitch EventSub WebSocket ✓"
            );

        }
    );


    socket.on(
        "message",
        async rawMessage => {

            try {

                const message =
                    JSON.parse(
                        rawMessage.toString()
                    );


                const messageType =
                    message.metadata?.message_type;


                // ======================================
                // Session welcome
                // ======================================

                if (
                    messageType ===
                    "session_welcome"
                ) {

                    const sessionId =
                        message.payload
                            ?.session
                            ?.id;


                    if (!sessionId) {

                        throw new Error(
                            "Twitch EventSub did not provide a session ID."
                        );

                    }


                    console.log(
                        "Twitch EventSub session ready ✓"
                    );


                    await subscribeToRedemptions(
                        twitchSession,
                        sessionId
                    );


                    await subscribeToChat(
                        twitchSession,
                        sessionId
                    );


                    return;

                }


                // ======================================
                // Keepalive
                // ======================================

                if (
                    messageType ===
                    "session_keepalive"
                ) {

                    return;

                }


                // ======================================
                // Twitch reconnect request
                // ======================================

                if (
                    messageType ===
                    "session_reconnect"
                ) {

                    const reconnectUrl =
                        message.payload
                            ?.session
                            ?.reconnect_url;


                    console.log(
                        "Twitch requested EventSub reconnect:",
                        reconnectUrl
                    );


                    return;

                }


                // ======================================
                // Revocation
                // ======================================

                if (
                    messageType ===
                    "revocation"
                ) {

                    console.warn(
                        "Twitch EventSub subscription revoked:",
                        message.payload?.subscription
                    );


                    return;

                }


                // ======================================
                // Notification
                // ======================================

                if (
                    messageType ===
                    "notification"
                ) {

                    const subscriptionType =
                        message.payload
                            ?.subscription
                            ?.type;


                    const event =
                        message.payload
                            ?.event;


                    // ==================================
                    // Channel Point redemption
                    // ==================================

                    if (
                        subscriptionType ===
                        "channel.channel_points_custom_reward_redemption.add"
                    ) {

                        await onRedemption?.(
                            event
                        );


                        return;

                    }


                    // ==================================
                    // Chat message
                    // ==================================

                    if (
                        subscriptionType ===
                        "channel.chat.message"
                    ) {

                        await onChatMessage?.(
                            event
                        );


                        return;

                    }

                }

            } catch (error) {

                console.error(
                    "Failed to process Twitch EventSub message:",
                    error
                );

            }

        }
    );


    socket.on(
        "error",
        error => {

            console.error(
                "Twitch EventSub WebSocket error:",
                error
            );

        }
    );


    socket.on(
        "close",
        () => {

            console.warn(
                "Twitch EventSub WebSocket disconnected."
            );

        }
    );


    return socket;
}


// ======================================================
// Subscribe to Channel Point redemptions
// ======================================================

async function subscribeToRedemptions(
    twitchSession,
    sessionId
) {

    const response =
        await fetch(
            "https://api.twitch.tv/helix/eventsub/subscriptions",
            {
                method:
                    "POST",

                headers: {
                    "Client-ID":
                        config.twitch.clientId,

                    "Authorization":
                        `Bearer ${twitchSession.accessToken}`,

                    "Content-Type":
                        "application/json"
                },

                body:
                    JSON.stringify({
                        type:
                            "channel.channel_points_custom_reward_redemption.add",

                        version:
                            "1",

                        condition: {
                            broadcaster_user_id:
                                twitchSession.broadcaster.id
                        },

                        transport: {
                            method:
                                "websocket",

                            session_id:
                                sessionId
                        }
                    })
            }
        );


    const data =
        await response.json();


    if (!response.ok) {

        throw new Error(
            `Failed to subscribe to Channel Point redemptions: ${JSON.stringify(data)}`
        );

    }


    console.log(
        "Channel Point redemption subscription ready ✓"
    );

}