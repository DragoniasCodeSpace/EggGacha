import crypto from "crypto";


// ======================================================
// Configuration
// ======================================================

const ALGORITHM =
    "aes-256-gcm";

const IV_LENGTH =
    12;

const AUTH_TAG_LENGTH =
    16;


// ======================================================
// Encryption key
// ======================================================

function getEncryptionKey() {

    const encodedKey =
        process.env.SESSION_ENCRYPTION_KEY;


    if (!encodedKey) {

        throw new Error(
            "SESSION_ENCRYPTION_KEY is missing from the environment."
        );

    }


    let key;

    try {

        key =
            Buffer.from(
                encodedKey,
                "base64"
            );

    } catch {

        throw new Error(
            "SESSION_ENCRYPTION_KEY is not valid Base64."
        );

    }


    if (key.length !== 32) {

        throw new Error(
            "SESSION_ENCRYPTION_KEY must decode to exactly 32 bytes."
        );

    }


    return key;

}


// ======================================================
// Encrypt
// ======================================================

export function encrypt(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return null;

    }


    const key =
        getEncryptionKey();


    const iv =
        crypto.randomBytes(
            IV_LENGTH
        );


    const cipher =
        crypto.createCipheriv(
            ALGORITHM,
            key,
            iv
        );


    const encrypted =
        Buffer.concat([
            cipher.update(
                String(value),
                "utf8"
            ),

            cipher.final()
        ]);


    const authTag =
        cipher.getAuthTag();


    // Stored format:
    //
    // version.iv.authTag.ciphertext

    return [
        "v1",
        iv.toString("base64"),
        authTag.toString("base64"),
        encrypted.toString("base64")
    ].join(".");

}


// ======================================================
// Decrypt
// ======================================================

export function decrypt(
    encryptedValue
) {

    if (
        encryptedValue === null ||
        encryptedValue === undefined
    ) {

        return null;

    }


    const parts =
        String(
            encryptedValue
        ).split(".");


    if (
        parts.length !== 4 ||
        parts[0] !== "v1"
    ) {

        throw new Error(
            "Encrypted value has an invalid format."
        );

    }


    const [
        version,
        ivBase64,
        authTagBase64,
        encryptedBase64
    ] = parts;


    const key =
        getEncryptionKey();


    const iv =
        Buffer.from(
            ivBase64,
            "base64"
        );


    const authTag =
        Buffer.from(
            authTagBase64,
            "base64"
        );


    const encrypted =
        Buffer.from(
            encryptedBase64,
            "base64"
        );


    if (iv.length !== IV_LENGTH) {

        throw new Error(
            "Encrypted value contains an invalid IV."
        );

    }


    if (authTag.length !== AUTH_TAG_LENGTH) {

        throw new Error(
            "Encrypted value contains an invalid authentication tag."
        );

    }


    try {

        const decipher =
            crypto.createDecipheriv(
                ALGORITHM,
                key,
                iv
            );


        decipher.setAuthTag(
            authTag
        );


        const decrypted =
            Buffer.concat([
                decipher.update(
                    encrypted
                ),

                decipher.final()
            ]);


        return decrypted.toString(
            "utf8"
        );

    } catch {

        throw new Error(
            "Failed to decrypt protected data. The encryption key may be incorrect or the data may have been modified."
        );

    }

}