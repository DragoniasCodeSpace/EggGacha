import db from "../database/database.js";
import { config } from "../config/config.js";


// ======================================================
// Save Twitch session
// ======================================================

export function saveTwitchSession(
    twitchSession
) {

    db.prepare(`
        INSERT INTO twitch_sessions (
            broadcaster_id,
            login,
            display_name,
            access_token,
            refresh_token,
            updated_at
        )
        VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)

        ON CONFLICT(broadcaster_id)
        DO UPDATE SET
            login = excluded.login,
            display_name = excluded.display_name,
            access_token = excluded.access_token,
            refresh_token = excluded.refresh_token,
            updated_at = CURRENT_TIMESTAMP
    `).run(
        twitchSession.broadcaster.id,
        twitchSession.broadcaster.login,
        twitchSession.broadcaster.displayName,
        twitchSession.accessToken,
        twitchSession.refreshToken
    );


    console.log(
        "Twitch session saved ✓"
    );

}


// ======================================================
// Load saved Twitch session
// ======================================================

export function loadTwitchSession() {

    const savedSession =
        db.prepare(`
            SELECT *
            FROM twitch_sessions
            ORDER BY updated_at DESC
            LIMIT 1
        `).get();


    if (!savedSession) {
        return null;
    }


    return {

        accessToken:
            savedSession.access_token,

        refreshToken:
            savedSession.refresh_token,

        broadcaster: {

            id:
                savedSession.broadcaster_id,

            login:
                savedSession.login,

            displayName:
                savedSession.display_name

        }

    };

}


// ======================================================
// Delete saved session
// ======================================================

export function deleteTwitchSession(
    broadcasterId
) {

    if (!broadcasterId) {
        return;
    }


    db.prepare(`
        DELETE FROM twitch_sessions
        WHERE broadcaster_id = ?
    `).run(
        broadcasterId
    );


    console.log(
        "Saved Twitch session removed."
    );

}


// ======================================================
// Validate Twitch access token
// ======================================================

export async function validateTwitchSession(
    twitchSession
) {

    const response =
        await fetch(
            "https://id.twitch.tv/oauth2/validate",
            {
                headers: {
                    "Authorization":
                        `Bearer ${twitchSession.accessToken}`
                }
            }
        );


    if (response.ok) {

        const data =
            await response.json();


        if (
            data.client_id !==
            config.twitch.clientId
        ) {

            throw new Error(
                "Saved Twitch token belongs to a different Twitch application."
            );

        }


        if (
            data.user_id !==
            twitchSession.broadcaster.id
        ) {

            throw new Error(
                "Saved Twitch token belongs to a different broadcaster."
            );

        }


        return data;

    }


    // Invalid/expired access token.
    // Try the refresh token.

    if (
        response.status === 401
    ) {

        console.log(
            "Twitch access token is no longer valid. Refreshing..."
        );


        await refreshTwitchSession(
            twitchSession
        );


        return await validateTwitchSession(
            twitchSession
        );

    }


    const data =
        await safeJson(
            response
        );


    throw new Error(
        `Failed to validate Twitch session: ${JSON.stringify(data)}`
    );

}


// ======================================================
// Refresh Twitch token
// ======================================================

export async function refreshTwitchSession(
    twitchSession
) {

    if (!twitchSession.refreshToken) {

        throw new Error(
            "No Twitch refresh token is available."
        );

    }


    const body =
        new URLSearchParams();


    body.set(
        "grant_type",
        "refresh_token"
    );


    body.set(
        "refresh_token",
        twitchSession.refreshToken
    );


    body.set(
        "client_id",
        config.twitch.clientId
    );


    body.set(
        "client_secret",
        config.twitch.clientSecret
    );


    const response =
        await fetch(
            "https://id.twitch.tv/oauth2/token",
            {
                method:
                    "POST",

                headers: {
                    "Content-Type":
                        "application/x-www-form-urlencoded"
                },

                body:
                    body.toString()
            }
        );


    const data =
        await safeJson(
            response
        );


    if (!response.ok) {

        throw new Error(
            `Failed to refresh Twitch token: ${JSON.stringify(data)}`
        );

    }


    if (!data.access_token) {

        throw new Error(
            "Twitch refresh response did not contain an access token."
        );

    }


    twitchSession.accessToken =
        data.access_token;


    // Twitch may rotate the refresh token.
    // Always use the new one when provided.

    if (data.refresh_token) {

        twitchSession.refreshToken =
            data.refresh_token;

    }


    saveTwitchSession(
        twitchSession
    );


    console.log(
        "Twitch access token refreshed ✓"
    );


    return twitchSession;

}


// ======================================================
// Twitch API request with automatic refresh
// ======================================================

export async function twitchFetch(
    twitchSession,
    url,
    options = {}
) {

    let response =
        await authenticatedRequest(
            twitchSession,
            url,
            options
        );


    // Twitch recommends refreshing reactively after 401.

    if (
        response.status !== 401
    ) {

        return response;

    }


    console.log(
        "Twitch API returned 401. Refreshing access token..."
    );


    await refreshTwitchSession(
        twitchSession
    );


    // Retry exactly once using the new token.

    response =
        await authenticatedRequest(
            twitchSession,
            url,
            options
        );


    return response;

}


// ======================================================
// Authenticated Twitch request
// ======================================================

async function authenticatedRequest(
    twitchSession,
    url,
    options
) {

    const headers =
        new Headers(
            options.headers ?? {}
        );


    headers.set(
        "Client-ID",
        config.twitch.clientId
    );


    headers.set(
        "Authorization",
        `Bearer ${twitchSession.accessToken}`
    );


    return await fetch(
        url,
        {
            ...options,
            headers
        }
    );

}


// ======================================================
// Hourly validation
// ======================================================

export function startTwitchSessionValidation(
    twitchSession,
    onInvalid
) {

    const ONE_HOUR =
        60 * 60 * 1000;


    const interval =
        setInterval(
            async () => {

                try {

                    await validateTwitchSession(
                        twitchSession
                    );


                    console.log(
                        "Twitch OAuth session validated ✓"
                    );

                } catch (error) {

                    console.error(
                        "Twitch OAuth session validation failed:",
                        error
                    );


                    clearInterval(
                        interval
                    );


                    await onInvalid?.(
                        error
                    );

                }

            },
            ONE_HOUR
        );


    return () => {

        clearInterval(
            interval
        );

    };

}


// ======================================================
// Safe JSON helper
// ======================================================

async function safeJson(
    response
) {

    try {

        return await response.json();

    } catch {

        return {
            status:
                response.status,

            statusText:
                response.statusText
        };

    }

}