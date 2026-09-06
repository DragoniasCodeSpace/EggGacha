import {
    getTwitchSession,
    saveTwitchSession
} from "../database/twitchSessions.js";

import {
    refreshTwitchToken,
    validateTwitchToken
} from "./auth.js";

const REFRESH_BUFFER_MS =
    5 * 60 * 1000;

export async function getValidTwitchSession(
    env,
    broadcasterId
) {
    let session =
        await getTwitchSession(
            env.DB,
            env.SESSION_ENCRYPTION_KEY,
            broadcasterId
        );

    if (!session) {
        throw new Error(
            `No Twitch session found for broadcaster ${broadcasterId}.`
        );
    }

    const expiresSoon =
        session.expiresAt <=
        Date.now() + REFRESH_BUFFER_MS;

    if (!expiresSoon) {
        const validation =
            await validateTwitchToken(
                session.accessToken
            );

        if (validation) {
            return session;
        }
    }

    session = await refreshSession(
        env,
        session
    );

    return session;
}

async function refreshSession(
    env,
    session
) {
    console.log(
        `Refreshing Twitch token for ${session.login}`
    );

    const tokenData =
        await refreshTwitchToken(
            env,
            session.refreshToken
        );

    const expiresAt =
        Date.now() +
        tokenData.expires_in * 1000;

    const refreshedSession = {
        broadcasterId:
            session.broadcasterId,

        login:
            session.login,

        displayName:
            session.displayName,

        accessToken:
            tokenData.access_token,

        refreshToken:
            tokenData.refresh_token ??
            session.refreshToken,

        expiresAt
    };

    await saveTwitchSession(
        env.DB,
        env.SESSION_ENCRYPTION_KEY,
        refreshedSession
    );

    return refreshedSession;
}