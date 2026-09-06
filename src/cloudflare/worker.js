import {
    createTwitchAuthRedirect,
    exchangeAuthorizationCode,
    getTwitchUser
} from "./twitch/auth.js";

import {
    saveOAuthState,
    consumeOAuthState,
    cleanupExpiredOAuthStates
} from "./database/oauthStates.js";

import {
    saveTwitchSession
} from "./database/twitchSessions.js";

import {
    syncEggReward
} from "./twitch/rewards.js";

import {
    handleEventSubWebhook
} from "./twitch/eventSubWebhook.js";

import {
    setupEventSubSubscriptions
} from "./twitch/eventSubSubscriptions.js";

import {
    getOrCreateUser,
    getUserByCollectionToken
} from "./database/users.js";

import {
    getUserCollection
} from "./database/collections.js";

import {
    eggs
} from "../gacha/eggs.js";

import {
    OverlayDurableObject
} from "./overlay/OverlayDurableObject.js";


export {
    OverlayDurableObject
};


// ======================================================
// Worker
// ======================================================

export default {

    async fetch(
        request,
        env,
        ctx
    ) {

        const url =
            new URL(
                request.url
            );


        // ==================================================
        // Health
        // ==================================================

        if (
            request.method === "GET" &&
            url.pathname === "/health"
        ) {

            return await handleHealth(
                env
            );

        }


        // ==================================================
        // Twitch OAuth start
        // ==================================================

        if (
            request.method === "GET" &&
            url.pathname === "/auth/twitch"
        ) {

            return await handleTwitchLogin(
                env
            );

        }


        // ==================================================
        // Twitch OAuth callback
        // ==================================================

        if (
            request.method === "GET" &&
            url.pathname === "/auth/twitch/callback"
        ) {

            return await handleTwitchCallback(
                request,
                env
            );

        }


        // ==================================================
        // Twitch EventSub webhook
        // ==================================================

        if (
            url.pathname === "/eventsub"
        ) {

            return await handleEventSubWebhook(
                request,
                env
            );

        }


        // ==================================================
        // Overlay WebSocket
        // ==================================================

        if (
            url.pathname === "/overlay-ws"
        ) {

            return await handleOverlayWebSocket(
                request,
                env
            );

        }


        // ==================================================
        // Overlay page
        // ==================================================

        if (
            request.method === "GET" &&
            url.pathname === "/overlay"
        ) {

            return await serveOverlayPage(
                request,
                env
            );

        }


        // ==================================================
        // Collection API
        // ==================================================

        if (
            request.method === "GET" &&
            url.pathname.startsWith(
                "/api/collection/"
            )
        ) {

            return await handleCollectionApi(
                request,
                env
            );

        }


        // ==================================================
        // Collection page
        // ==================================================

        if (
            request.method === "GET" &&
            url.pathname.startsWith(
                "/collection/"
            )
        ) {

            return await serveCollectionPage(
                request,
                env
            );

        }


        // ==================================================
        // Homepage / Twitch connect page
        // ==================================================

        if (
            request.method === "GET" &&
            url.pathname === "/"
        ) {

            return await serveLoginPage(
                request,
                env
            );

        }


        // ==================================================
        // Static assets
        // ==================================================

        return await env.ASSETS.fetch(
            request
        );

    }

};


// ======================================================
// Health
// ======================================================

async function handleHealth(
    env
) {

    try {

        await env.DB
            .prepare(
                "SELECT 1"
            )
            .first();


        return Response.json(
            {
                status:
                    "ok",

                database:
                    "connected"
            }
        );

    } catch (error) {

        console.error(
            "Health check failed:",
            error
        );


        return Response.json(
            {
                status:
                    "error",

                database:
                    "failed"
            },
            {
                status:
                    500
            }
        );

    }

}


// ======================================================
// Login page
// ======================================================

async function serveLoginPage(
    request,
    env
) {

    const assetUrl =
        new URL(
            request.url
        );


    assetUrl.pathname =
        "/auth-files/login.html";


    const assetRequest =
        new Request(
            assetUrl.toString(),
            request
        );


    return await env.ASSETS.fetch(
        assetRequest
    );

}


// ======================================================
// Twitch login
// ======================================================

async function handleTwitchLogin(
    env
) {

    try {

        // Remove old OAuth states
        await cleanupExpiredOAuthStates(
            env.DB
        );


        // Create Twitch authorization URL + state
        const auth =
            createTwitchAuthRedirect(
                env
            );


        // OAuth state is valid for 10 minutes
        const expiresAt =
            Date.now() +
            (10 * 60 * 1000);


        // Store state in D1
        await saveOAuthState(
            env.DB,
            auth.state,
            expiresAt
        );


        return Response.redirect(
            auth.url,
            302
        );

    } catch (error) {

        console.error(
            "Failed to start Twitch OAuth:",
            error
        );


        return new Response(
            "Failed to start Twitch authentication.",
            {
                status:
                    500
            }
        );

    }

}


// ======================================================
// Twitch OAuth callback
// ======================================================

async function handleTwitchCallback(
    request,
    env
) {

    try {

        const url =
            new URL(
                request.url
            );


        const code =
            url.searchParams.get(
                "code"
            );


        const state =
            url.searchParams.get(
                "state"
            );


        const twitchError =
            url.searchParams.get(
                "error"
            );


        if (twitchError) {

            console.error(
                "Twitch OAuth error:",
                twitchError
            );


            return redirectToLogin(
                env,
                {
                    error:
                        "twitch_denied"
                }
            );

        }


        if (
            !code ||
            !state
        ) {

            return redirectToLogin(
                env,
                {
                    error:
                        "missing_oauth_data"
                }
            );

        }


        // ==============================================
        // Validate OAuth state
        // ==============================================

        const validState =
            await consumeOAuthState(
                env.DB,
                state
            );


        if (!validState) {

            console.warn(
                "Invalid or expired OAuth state."
            );


            return redirectToLogin(
                env,
                {
                    error:
                        "invalid_state"
                }
            );

        }


        // ==============================================
        // Exchange authorization code
        // ==============================================

        const tokenData =
            await exchangeAuthorizationCode(
                env,
                code
            );


        // ==============================================
        // Get Twitch broadcaster
        // ==============================================

        const twitchUser =
            await getTwitchUser(
                env,
                tokenData.access_token
            );


        if (!twitchUser) {

            throw new Error(
                "Could not retrieve Twitch user."
            );

        }


        // ==============================================
        // Create / update EggGacha user
        // ==============================================

        const eggGachaUser =
            await getOrCreateUser(
                env.DB,
                twitchUser.id,
                twitchUser.display_name
            );


        // ==============================================
        // Save encrypted Twitch session
        // ==============================================

        const expiresAt =
            Date.now() +
            (tokenData.expires_in * 1000);


        await saveTwitchSession(
            env.DB,
            env.SESSION_ENCRYPTION_KEY,
            {
                broadcasterId:
                    twitchUser.id,

                login:
                    twitchUser.login,

                displayName:
                    twitchUser.display_name,

                accessToken:
                    tokenData.access_token,

                refreshToken:
                    tokenData.refresh_token,

                expiresAt
            }
        );


        // ==============================================
        // Create / sync EggGacha reward
        // ==============================================

        const reward =
            await syncEggReward(
                env,
                twitchUser.id
            );


        // ==============================================
        // EventSub subscriptions
        // ==============================================

        await setupEventSubSubscriptions(
            env,
            twitchUser.id,
            reward.id
        );


        console.log(
            `Twitch connected: ${twitchUser.display_name}`
        );


        // ==============================================
        // Return to homepage
        // ==============================================

        return redirectToLogin(
            env,
            {
                connected:
                    "true",

                username:
                    twitchUser.display_name,

                collectionToken:
                    eggGachaUser.collection_token
            }
        );

    } catch (error) {

        console.error(
            "Twitch OAuth callback failed:",
            error
        );


        return redirectToLogin(
            env,
            {
                error:
                    "oauth_failed"
            }
        );

    }

}


// ======================================================
// Login redirect helper
// ======================================================

function redirectToLogin(
    env,
    parameters = {}
) {

    const url =
        new URL(
            "/",
            env.PUBLIC_URL
        );


    for (
        const [
            key,
            value
        ]
        of Object.entries(
            parameters
        )
    ) {

        if (
            value !== undefined &&
            value !== null
        ) {

            url.searchParams.set(
                key,
                String(
                    value
                )
            );

        }

    }


    return Response.redirect(
        url.toString(),
        302
    );

}


// ======================================================
// Collection API
// ======================================================

async function handleCollectionApi(
    request,
    env
) {

    try {

        const url =
            new URL(
                request.url
            );


        const token =
            decodeURIComponent(
                url.pathname.substring(
                    "/api/collection/".length
                )
            );


        if (!token) {

            return Response.json(
                {
                    error:
                        "Missing collection token"
                },
                {
                    status:
                        400
                }
            );

        }


        const user =
            await getUserByCollectionToken(
                env.DB,
                token
            );


        if (!user) {

            return Response.json(
                {
                    error:
                        "Collection not found"
                },
                {
                    status:
                        404
                }
            );

        }


        const collection =
            await getUserCollection(
                env.DB,
                user.id
            );


        const ownedEggs =
            new Map();


        for (
            const entry
            of collection
        ) {

            ownedEggs.set(
                entry.egg_id,
                entry
            );

        }


        const collectionEggs =
            eggs.map(
                egg => {

                    const entry =
                        ownedEggs.get(
                            egg.id
                        );


                    return {
                        ...egg,

                        unlocked:
                            Boolean(
                                entry
                            ),

                        quantity:
                            entry?.quantity ?? 0,

                        firstObtainedAt:
                            entry?.first_obtained_at ??
                            null
                    };

                }
            );


        const uniqueEggs =
            collectionEggs.filter(
                egg =>
                    egg.unlocked
            ).length;


        const totalEggs =
            collectionEggs.reduce(
                (
                    total,
                    egg
                ) =>
                    total +
                    egg.quantity,
                0
            );


        const totalAvailable =
            eggs.length;


        const completion =
            totalAvailable > 0
                ? Math.round(
                    (
                        uniqueEggs /
                        totalAvailable
                    ) *
                    100
                )
                : 0;


        return Response.json(
            {
                user: {
                    twitchUserId:
                        user.twitch_user_id,

                    displayName:
                        user.display_name
                },

                stats: {
                    totalEggs,
                    uniqueEggs,
                    totalAvailable,
                    completion
                },

                eggs:
                    collectionEggs
            }
        );

    } catch (error) {

        console.error(
            "Failed to load collection:",
            error
        );


        return Response.json(
            {
                error:
                    "Failed to load collection."
            },
            {
                status:
                    500
            }
        );

    }

}


// ======================================================
// Collection page
// ======================================================

async function serveCollectionPage(
    request,
    env
) {

    const url =
        new URL(
            request.url
        );


    const token =
        decodeURIComponent(
            url.pathname.substring(
                "/collection/".length
            )
        );


    if (!token) {

        return new Response(
            "Collection not found",
            {
                status:
                    404
            }
        );

    }


    const user =
        await getUserByCollectionToken(
            env.DB,
            token
        );


    if (!user) {

        return new Response(
            "Collection not found",
            {
                status:
                    404
            }
        );

    }


    const assetUrl =
        new URL(
            request.url
        );


    assetUrl.pathname =
        "/collection-files/collection.html";


    const assetRequest =
        new Request(
            assetUrl.toString(),
            request
        );


    return await env.ASSETS.fetch(
        assetRequest
    );

}


// ======================================================
// Overlay page
// ======================================================

async function serveOverlayPage(
    request,
    env
) {

    const url =
        new URL(
            request.url
        );


    const providedKey =
        url.searchParams.get(
            "key"
        );


    if (
        !providedKey ||
        providedKey !==
        env.OVERLAY_SECRET
    ) {

        return new Response(
            "Unauthorized",
            {
                status:
                    401
            }
        );

    }


    const assetUrl =
        new URL(
            request.url
        );


    assetUrl.pathname =
        "/overlay-files/overlay.html";


    const assetRequest =
        new Request(
            assetUrl.toString(),
            request
        );


    return await env.ASSETS.fetch(
        assetRequest
    );

}


// ======================================================
// Overlay WebSocket
// ======================================================

async function handleOverlayWebSocket(
    request,
    env
) {

    const url =
        new URL(
            request.url
        );


    const providedKey =
        url.searchParams.get(
            "key"
        );


    if (
        !providedKey ||
        providedKey !==
        env.OVERLAY_SECRET
    ) {

        console.warn(
            "Rejected unauthorized overlay connection."
        );


        return new Response(
            "Unauthorized",
            {
                status:
                    401
            }
        );

    }


    const upgrade =
        request.headers.get(
            "Upgrade"
        );


    if (
        !upgrade ||
        upgrade.toLowerCase() !==
        "websocket"
    ) {

        return new Response(
            "Expected WebSocket",
            {
                status:
                    426
            }
        );

    }


    const durableObjectId =
        env.OVERLAY.idFromName(
            "main"
        );


    const overlay =
        env.OVERLAY.get(
            durableObjectId
        );


    return await overlay.fetch(
        request
    );

}