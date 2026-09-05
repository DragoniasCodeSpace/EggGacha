export function validateConfig() {

    const errors = [];


    // ======================================================
    // Required Twitch configuration
    // ======================================================

    requireEnvironmentVariable(
        "TWITCH_CLIENT_ID",
        errors
    );

    requireEnvironmentVariable(
        "TWITCH_CLIENT_SECRET",
        errors
    );

    requireEnvironmentVariable(
        "TWITCH_REDIRECT_URI",
        errors
    );


    // ======================================================
    // Encryption
    // ======================================================

    requireEnvironmentVariable(
        "SESSION_ENCRYPTION_KEY",
        errors
    );

    requireEnvironmentVariable(
        "OVERLAY_SECRET",
        errors
    );


    const encryptionKey =
        process.env.SESSION_ENCRYPTION_KEY;


    if (encryptionKey) {

        const decodedKey =
            Buffer.from(
                encryptionKey,
                "base64"
            );


        if (decodedKey.length !== 32) {

            errors.push(
                "SESSION_ENCRYPTION_KEY must decode to exactly 32 bytes."
            );

        }

    }


    // ======================================================
    // URLs
    // ======================================================

    validateUrl(
        "TWITCH_REDIRECT_URI",
        process.env.TWITCH_REDIRECT_URI,
        errors
    );


    if (process.env.PUBLIC_URL) {

        validateUrl(
            "PUBLIC_URL",
            process.env.PUBLIC_URL,
            errors
        );

    }


    // ======================================================
    // Port
    // ======================================================

    if (process.env.PORT) {

        const port =
            Number(
                process.env.PORT
            );


        if (
            !Number.isInteger(port) ||
            port < 1 ||
            port > 65535
        ) {

            errors.push(
                "PORT must be a valid number between 1 and 65535."
            );

        }

    }


    // ======================================================
    // Reward cost
    // ======================================================

    if (process.env.EGG_REWARD_COST) {

        const rewardCost =
            Number(
                process.env.EGG_REWARD_COST
            );


        if (
            !Number.isInteger(rewardCost) ||
            rewardCost < 1
        ) {

            errors.push(
                "EGG_REWARD_COST must be a positive integer."
            );

        }

    }


    // ======================================================
    // Fail startup
    // ======================================================

    if (errors.length > 0) {

        console.error("");
        console.error(
            "EggGacha configuration error:"
        );
        console.error("");


        for (const error of errors) {

            console.error(
                `- ${error}`
            );

        }


        console.error("");

        throw new Error(
            "EggGacha configuration is invalid."
        );

    }


    console.log(
        "EggGacha configuration valid ✓"
    );

}


// ======================================================
// Required environment variable
// ======================================================

function requireEnvironmentVariable(
    name,
    errors
) {

    const value =
        process.env[name];


    if (
        !value ||
        value.trim() === ""
    ) {

        errors.push(
            `${name} is required.`
        );

    }

}


// ======================================================
// URL validation
// ======================================================

function validateUrl(
    name,
    value,
    errors
) {

    if (!value) {

        return;

    }


    try {

        const url =
            new URL(
                value
            );


        if (
            url.protocol !== "http:" &&
            url.protocol !== "https:"
        ) {

            errors.push(
                `${name} must use http:// or https://.`
            );

        }

    } catch {

        errors.push(
            `${name} must be a valid URL.`
        );

    }

}