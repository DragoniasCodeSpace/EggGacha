import db from "../database/database.js";
import { config } from "../config/config.js";

import {
    encrypt,
    decrypt
} from "../security/encryption.js";


// ======================================================
// Save Twitch session
// ======================================================

export function saveTwitchSession(
    twitchSession
) {

    const encryptedAccessToken =
        encrypt(
            twitchSession.accessToken
        );


    const encryptedRefreshToken =
        encrypt(
            twitchSession.refreshToken
        );


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
        encryptedAccessToken,
        encryptedRefreshToken
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
            decrypt(
                savedSession.access_token
            ),

        refreshToken:
            decrypt(
                savedSession.refresh_token
            ),

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

    let response =
        await requestTokenValidation(
            twitchSession.accessToken
        );


    /*
     * Token is valid.
     */

    if (response.ok) {

        return await validateTokenResponse(
            response,
            twitchSession
        );

    }


    /*
     * Anything other than 401 is not a token-expiry issue.
     */

    if (
        response.status !== 401
    ) {

        const data =
            await safeJson(
                response
            );


        throw new Error(
            `Failed to validate Twitch session: ${JSON.stringify(data)}`
        );

    }


    /*
     * Access token expired or became invalid.
     *
     * Refresh exactly once.
     */

    console.log(
        "Twitch access token is no longer valid. Refreshing..."
    );


    await refreshTwitchSession(
        twitchSession
    );


    /*
     * Retry validation exactly once using the new token.
     */

    response =
        await requestTokenValidation(
            twitchSession.accessToken
        );


    if (!response.ok) {

        const data =
            await safeJson(
                response
            );


        throw new Error(
            `Twitch token remained invalid after refresh: ${JSON.stringify(data)}`
        );

    }


    return await validateTokenResponse(
        response,
        twitchSession
    );

}


// ======================================================
// Request Twitch token validation
// ======================================================

async function requestTokenValidation(
    accessToken
) {

    return await fetch(
        "https://id.twitch.tv/oauth2/validate",
        {
            headers: {

                "Authorization":
                    `Bearer ${accessToken}`

            }
        }
    );

}


// ======================================================
// Validate Twitch token response
// ======================================================

async function validateTokenResponse(
    response,
    twitchSession
) {

    const data =
        await response.json();


    /*
     * Make sure this token belongs to this EggGacha
     * Twitch application.
     */

    if (
        data.client_id !==
        config.twitch.clientId
    ) {

        throw new Error(
            "Saved Twitch token belongs to a different Twitch application."
        );

    }


    /*
     * Make sure this token belongs to the broadcaster
     * stored in the session.
     */

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


    /*
     * Twitch may rotate the refresh token.
     *
     * Always replace the old token when Twitch sends
     * a new one.
     */

    if (data.refresh_token) {

        twitchSession.refreshToken =
            data.refresh_token;

    }


    /*
     * Persist the refreshed tokens.
     *
     * saveTwitchSession() encrypts both tokens before
     * writing them to SQLite.
     */

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


    /*
     * Normal request.
     */

    if (
        response.status !== 401
    ) {

        return response;

    }


    /*
     * Twitch recommends refreshing reactively after a 401.
     */

    console.log(
        "Twitch API returned 401. Refreshing access token..."
    );


    await refreshTwitchSession(
        twitchSession
    );


    /*
     * Retry exactly once using the refreshed token.
     */

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


    /*
     * Always overwrite these headers so callers cannot
     * accidentally keep using an old access token after
     * refresh.
     */

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