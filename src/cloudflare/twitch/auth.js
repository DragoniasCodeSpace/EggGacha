const TWITCH_AUTHORIZE_URL =
    "https://id.twitch.tv/oauth2/authorize";

const TWITCH_TOKEN_URL =
    "https://id.twitch.tv/oauth2/token";

const TWITCH_USERS_URL =
    "https://api.twitch.tv/helix/users";

const SCOPES = [
    "channel:manage:redemptions",
    "user:read:chat",
    "user:write:chat",
    "user:bot",
    "channel:bot"
];

export function createTwitchAuthRedirect(env) {
    const state = generateState();

    const url = new URL(TWITCH_AUTHORIZE_URL);

    url.searchParams.set(
        "client_id",
        env.TWITCH_CLIENT_ID
    );

    url.searchParams.set(
        "redirect_uri",
        env.TWITCH_REDIRECT_URI
    );

    url.searchParams.set(
        "response_type",
        "code"
    );

    url.searchParams.set(
        "scope",
        SCOPES.join(" ")
    );

    url.searchParams.set(
        "state",
        state
    );

    return {
        url: url.toString(),
        state
    };
}

export async function exchangeAuthorizationCode(
    env,
    code
) {
    const body = new URLSearchParams({
        client_id: env.TWITCH_CLIENT_ID,
        client_secret: env.TWITCH_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: env.TWITCH_REDIRECT_URI
    });

    const response = await fetch(
        TWITCH_TOKEN_URL,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },
            body
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Twitch token exchange failed: ${
                data.message ??
                response.status
            }`
        );
    }

    return data;
}

export async function getTwitchUser(
    env,
    accessToken
) {
    const response = await fetch(
        TWITCH_USERS_URL,
        {
            headers: {
                "Client-ID":
                    env.TWITCH_CLIENT_ID,
                "Authorization":
                    `Bearer ${accessToken}`
            }
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Failed to fetch Twitch user: ${
                data.message ??
                response.status
            }`
        );
    }

    const user = data.data?.[0];

    if (!user) {
        throw new Error(
            "Twitch did not return a user."
        );
    }

    return user;
}

export function generateState() {
    const bytes = new Uint8Array(32);

    crypto.getRandomValues(bytes);

    return Array.from(bytes)
        .map(byte =>
            byte.toString(16).padStart(2, "0")
        )
        .join("");
}

export async function refreshTwitchToken(
    env,
    refreshToken
) {
    const body = new URLSearchParams({
        client_id:
            env.TWITCH_CLIENT_ID,

        client_secret:
            env.TWITCH_CLIENT_SECRET,

        grant_type:
            "refresh_token",

        refresh_token:
            refreshToken
    });

    const response = await fetch(
        TWITCH_TOKEN_URL,
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },
            body
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Twitch token refresh failed: ${
                data.message ??
                response.status
            }`
        );
    }

    return data;
}

export async function validateTwitchToken(
    accessToken
) {
    const response = await fetch(
        "https://id.twitch.tv/oauth2/validate",
        {
            headers: {
                "Authorization":
                    `OAuth ${accessToken}`
            }
        }
    );

    if (response.status === 401) {
        return null;
    }

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Twitch token validation failed: ${
                data.message ??
                response.status
            }`
        );
    }

    return data;
}

export async function getAppAccessToken(env) {
    const body = new URLSearchParams({
        client_id: env.TWITCH_CLIENT_ID,
        client_secret: env.TWITCH_CLIENT_SECRET,
        grant_type: "client_credentials"
    });

    const response = await fetch(
        "https://id.twitch.tv/oauth2/token",
        {
            method: "POST",
            headers: {
                "Content-Type":
                    "application/x-www-form-urlencoded"
            },
            body
        }
    );

    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            `Failed to get Twitch App Access Token: ${
                data.message ??
                response.status
            }`
        );
    }

    return data.access_token;
}