import { WebSocket } from "ws";

import { config } from "../config/config.js";
import { subscribeToChat } from "./chat.js";
import { twitchFetch } from "./session.js";


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

    const connection =
        createConnectionManager(
            twitchSession,
            onRedemption,
            onChatMessage
        );


    connection.connect(
        EVENTSUB_URL,
        false
    );


    return connection;

}


// ======================================================
// Connection manager
// ======================================================

function createConnectionManager(
    twitchSession,
    onRedemption,
    onChatMessage
) {

    let socket =
        null;

    let reconnecting =
        false;

    let manuallyClosed =
        false;


    // ==================================================
    // Connect
    // ==================================================

    function connect(
        url,
        isReconnect
    ) {

        console.log(
            isReconnect
                ? "Connecting to Twitch EventSub reconnect URL..."
                : "Connecting to Twitch EventSub..."
        );


        const newSocket =
            new WebSocket(
                url
            );


        newSocket.on(
            "open",
            () => {

                console.log(
                    isReconnect
                        ? "Connected to Twitch EventSub replacement WebSocket ✓"
                        : "Connected to Twitch EventSub WebSocket ✓"
                );

            }
        );


        newSocket.on(
            "message",
            async rawMessage => {

                try {

                    const message =
                        JSON.parse(
                            rawMessage.toString()
                        );


                    const messageType =
                        message.metadata
                            ?.message_type;


                    // ==================================
                    // Session welcome
                    // ==================================

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


                        // ==============================
                        // Reconnect session
                        // ==============================
                        //
                        // Twitch transfers the existing
                        // subscriptions to this session.
                        // Do NOT create them again.
                        //

                        if (isReconnect) {

                            console.log(
                                "Twitch EventSub reconnect completed ✓"
                            );


                            const oldSocket =
                                socket;


                            socket =
                                newSocket;


                            reconnecting =
                                false;


                            if (
                                oldSocket &&
                                oldSocket !== newSocket
                            ) {

                                try {

                                    oldSocket.close();

                                } catch (error) {

                                    console.error(
                                        "Failed to close old Twitch EventSub socket:",
                                        error
                                    );

                                }

                            }


                            return;

                        }


                        // ==============================
                        // Initial session
                        // ==============================

                        socket =
                            newSocket;


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


                    // ==================================
                    // Keepalive
                    // ==================================

                    if (
                        messageType ===
                        "session_keepalive"
                    ) {

                        return;

                    }


                    // ==================================
                    // Twitch reconnect request
                    // ==================================

                    if (
                        messageType ===
                        "session_reconnect"
                    ) {

                        const reconnectUrl =
                            message.payload
                                ?.session
                                ?.reconnect_url;


                        if (!reconnectUrl) {

                            console.error(
                                "Twitch requested an EventSub reconnect but did not provide a reconnect URL."
                            );


                            return;

                        }


                        if (reconnecting) {

                            console.log(
                                "Twitch EventSub reconnect already in progress."
                            );


                            return;

                        }


                        console.log(
                            "Twitch requested EventSub reconnect."
                        );


                        reconnecting =
                            true;


                        // IMPORTANT:
                        // Keep the old socket alive until
                        // the replacement socket is ready.

                        connect(
                            reconnectUrl,
                            true
                        );


                        return;

                    }


                    // ==================================
                    // Revocation
                    // ==================================

                    if (
                        messageType ===
                        "revocation"
                    ) {

                        console.warn(
                            "Twitch EventSub subscription revoked:",
                            message.payload
                                ?.subscription
                        );


                        return;

                    }


                    // ==================================
                    // Notification
                    // ==================================

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


                        // ==============================
                        // Channel Point redemption
                        // ==============================

                        if (
                            subscriptionType ===
                            "channel.channel_points_custom_reward_redemption.add"
                        ) {

                            await onRedemption?.(
                                event
                            );


                            return;

                        }


                        // ==============================
                        // Chat message
                        // ==============================

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


        // ==================================================
        // Error
        // ==================================================

        newSocket.on(
            "error",
            error => {

                console.error(
                    "Twitch EventSub WebSocket error:",
                    error
                );

            }
        );


        // ==================================================
        // Close
        // ==================================================

        newSocket.on(
            "close",
            (
                code,
                reason
            ) => {

                const reasonText =
                    reason?.toString() ||
                    "No reason provided";


                // This was the old socket during a
                // successful Twitch reconnect.

                if (
                    newSocket !== socket
                ) {

                    console.log(
                        "Old Twitch EventSub WebSocket closed."
                    );


                    return;

                }


                if (manuallyClosed) {

                    console.log(
                        "Twitch EventSub WebSocket closed."
                    );


                    return;

                }


                console.warn(
                    `Twitch EventSub WebSocket disconnected. Code: ${code}. Reason: ${reasonText}`
                );

            }
        );

    }


    // ==================================================
    // Manual close
    // ==================================================
    //
    // index.js already calls:
    //
    // eventSubSocket.close()
    //
    // So we preserve that interface.
    //

    function close() {

        manuallyClosed =
            true;


        if (!socket) {
            return;
        }


        try {

            socket.close();

        } catch (error) {

            console.error(
                "Failed to close Twitch EventSub WebSocket:",
                error
            );

        }

    }


    return {
        connect,
        close
    };

}


// ======================================================
// Subscribe to Channel Point redemptions
// ======================================================

async function subscribeToRedemptions(
    twitchSession,
    sessionId
) {

    const response =
        await twitchFetch(
            twitchSession,
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
                                twitchSession
                                    .broadcaster
                                    .id

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