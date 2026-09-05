import { WebSocket } from "ws";

import { config } from "../config/config.js";
import { subscribeToChat } from "./chat.js";
import { twitchFetch } from "./session.js";


const EVENTSUB_URL =
    "wss://eventsub.wss.twitch.tv/ws";

const MAX_RECONNECT_DELAY =
    30_000;

const KEEPALIVE_GRACE_MS =
    5_000;


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

    // A normal connection that has not received
    // session_welcome yet.
    let pendingSocket =
        null;

    // A Twitch-requested replacement connection.
    let replacementSocket =
        null;

    let reconnecting =
        false;

    let manuallyClosed =
        false;

    let reconnectTimer =
        null;

    let reconnectAttempt =
        0;

    let keepaliveTimer =
        null;

    let keepaliveTimeoutMs =
        null;


    // ==================================================
    // Connect
    // ==================================================

    function connect(
        url,
        isReconnect
    ) {

        if (manuallyClosed) {
            return;
        }


        console.log(
            isReconnect
                ? "Connecting to Twitch EventSub reconnect URL..."
                : "Connecting to Twitch EventSub..."
        );


        const newSocket =
            new WebSocket(
                url
            );


        if (isReconnect) {

            replacementSocket =
                newSocket;

        } else {

            pendingSocket =
                newSocket;

        }


        // ==================================================
        // Open
        // ==================================================

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


        // ==================================================
        // Message
        // ==================================================

        newSocket.on(
            "message",
            async rawMessage => {

                try {

                    const message =
                        JSON.parse(
                            rawMessage.toString()
                        );


                    // Any message from the active socket
                    // proves the connection is alive.

                    if (
                        newSocket === socket
                    ) {

                        resetKeepaliveWatchdog();

                    }


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


                        const keepaliveTimeoutSeconds =
                            message.payload
                                ?.session
                                ?.keepalive_timeout_seconds;


                        if (!sessionId) {

                            throw new Error(
                                "Twitch EventSub did not provide a session ID."
                            );

                        }


                        if (
                            Number.isFinite(
                                keepaliveTimeoutSeconds
                            ) &&
                            keepaliveTimeoutSeconds > 0
                        ) {

                            keepaliveTimeoutMs =
                                keepaliveTimeoutSeconds *
                                1000;


                            console.log(
                                `Twitch EventSub keepalive timeout: ${keepaliveTimeoutSeconds}s`
                            );

                        }


                        // ==============================
                        // Twitch-requested reconnect
                        // ==============================

                        if (isReconnect) {

                            console.log(
                                "Twitch EventSub reconnect completed ✓"
                            );


                            const oldSocket =
                                socket;


                            socket =
                                newSocket;


                            replacementSocket =
                                null;


                            reconnecting =
                                false;


                            reconnectAttempt =
                                0;


                            clearReconnectTimer();


                            resetKeepaliveWatchdog();


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
                        // Fresh session
                        // ==============================

                        pendingSocket =
                            null;


                        socket =
                            newSocket;


                        reconnecting =
                            false;


                        reconnectAttempt =
                            0;


                        clearReconnectTimer();


                        resetKeepaliveWatchdog();


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


                        console.log(
                            "Twitch EventSub subscriptions ready ✓"
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


                        // Keep the old active socket alive
                        // until Twitch's replacement socket
                        // has received session_welcome.

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


                // ==========================================
                // Manual shutdown
                // ==========================================

                if (manuallyClosed) {

                    console.log(
                        "Twitch EventSub WebSocket closed."
                    );


                    return;

                }


                // ==========================================
                // Twitch replacement connection failed
                // ==========================================

                if (
                    newSocket === replacementSocket
                ) {

                    replacementSocket =
                        null;


                    reconnecting =
                        false;


                    console.warn(
                        `Twitch EventSub replacement connection failed. Code: ${code}. Reason: ${reasonText}`
                    );


                    clearKeepaliveWatchdog();


                    const oldSocket =
                        socket;


                    socket =
                        null;


                    if (
                        oldSocket &&
                        oldSocket.readyState !==
                            WebSocket.CLOSED
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


                    scheduleReconnect();


                    return;

                }


                // ==========================================
                // Fresh connection attempt failed
                // ==========================================
                //
                // This is the important case for errors
                // such as ENOTFOUND while the internet is
                // unavailable.
                //

                if (
                    newSocket === pendingSocket
                ) {

                    pendingSocket =
                        null;


                    console.warn(
                        `Twitch EventSub connection attempt failed. Code: ${code}. Reason: ${reasonText}`
                    );


                    scheduleReconnect();


                    return;

                }


                // ==========================================
                // Active connection unexpectedly died
                // ==========================================

                if (
                    newSocket === socket
                ) {

                    console.warn(
                        `Twitch EventSub WebSocket disconnected. Code: ${code}. Reason: ${reasonText}`
                    );


                    clearKeepaliveWatchdog();


                    socket =
                        null;


                    reconnecting =
                        false;


                    scheduleReconnect();


                    return;

                }


                // ==========================================
                // Old socket
                // ==========================================

                console.log(
                    "Old Twitch EventSub WebSocket closed."
                );

            }
        );

    }


    // ==================================================
    // EventSub keepalive watchdog
    // ==================================================

    function resetKeepaliveWatchdog() {

        clearKeepaliveWatchdog();


        if (
            !keepaliveTimeoutMs ||
            manuallyClosed ||
            !socket
        ) {

            return;

        }


        keepaliveTimer =
            setTimeout(
                () => {

                    keepaliveTimer =
                        null;


                    if (
                        manuallyClosed ||
                        !socket
                    ) {

                        return;

                    }


                    console.warn(
                        "Twitch EventSub keepalive timed out. Reconnecting..."
                    );


                    const staleSocket =
                        socket;


                    try {

                        staleSocket.terminate();

                    } catch (error) {

                        console.error(
                            "Failed to terminate stale Twitch EventSub connection:",
                            error
                        );


                        if (
                            socket === staleSocket
                        ) {

                            socket =
                                null;

                        }


                        reconnecting =
                            false;


                        scheduleReconnect();

                    }

                },
                keepaliveTimeoutMs +
                    KEEPALIVE_GRACE_MS
            );

    }


    // ==================================================
    // Clear keepalive watchdog
    // ==================================================

    function clearKeepaliveWatchdog() {

        if (!keepaliveTimer) {
            return;
        }


        clearTimeout(
            keepaliveTimer
        );


        keepaliveTimer =
            null;

    }


    // ==================================================
    // Automatic reconnect
    // ==================================================

    function scheduleReconnect() {

        if (
            manuallyClosed ||
            reconnectTimer ||
            pendingSocket
        ) {

            return;

        }


        reconnectAttempt +=
            1;


        // 1s → 2s → 4s → 8s → 16s → 30s
        // Then remain capped at 30 seconds.

        const delay =
            Math.min(
                1000 *
                    (2 ** (reconnectAttempt - 1)),
                MAX_RECONNECT_DELAY
            );


        console.log(
            `Reconnecting to Twitch EventSub in ${delay / 1000}s...`
        );


        reconnectTimer =
            setTimeout(
                () => {

                    reconnectTimer =
                        null;


                    if (manuallyClosed) {
                        return;
                    }


                    console.log(
                        `Twitch EventSub reconnect attempt ${reconnectAttempt}...`
                    );


                    connect(
                        EVENTSUB_URL,
                        false
                    );

                },
                delay
            );

    }


    // ==================================================
    // Clear reconnect timer
    // ==================================================

    function clearReconnectTimer() {

        if (!reconnectTimer) {
            return;
        }


        clearTimeout(
            reconnectTimer
        );


        reconnectTimer =
            null;

    }


    // ==================================================
    // Manual close
    // ==================================================

    function close() {

        manuallyClosed =
            true;


        clearKeepaliveWatchdog();


        clearReconnectTimer();


        reconnecting =
            false;


        // Close a pending normal connection.

        if (
            pendingSocket &&
            pendingSocket !== socket
        ) {

            try {

                pendingSocket.close();

            } catch (error) {

                console.error(
                    "Failed to close pending Twitch EventSub WebSocket:",
                    error
                );

            }


            pendingSocket =
                null;

        }


        // Close a Twitch replacement connection.

        if (
            replacementSocket &&
            replacementSocket !== socket
        ) {

            try {

                replacementSocket.close();

            } catch (error) {

                console.error(
                    "Failed to close Twitch EventSub replacement WebSocket:",
                    error
                );

            }


            replacementSocket =
                null;

        }


        // Close the active connection.

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