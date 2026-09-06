function base64ToBytes(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);

    for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
    }

    return bytes;
}

function bytesToBase64(bytes) {
    let binary = "";

    for (const byte of bytes) {
        binary += String.fromCharCode(byte);
    }

    return btoa(binary);
}

async function getEncryptionKey(base64Key) {
    const rawKey = base64ToBytes(base64Key);

    if (rawKey.length !== 32) {
        throw new Error(
            "SESSION_ENCRYPTION_KEY must decode to exactly 32 bytes."
        );
    }

    return await crypto.subtle.importKey(
        "raw",
        rawKey,
        {
            name: "AES-GCM"
        },
        false,
        [
            "encrypt",
            "decrypt"
        ]
    );
}

export async function encryptValue(
    base64Key,
    value
) {
    const key = await getEncryptionKey(
        base64Key
    );

    const iv = crypto.getRandomValues(
        new Uint8Array(12)
    );

    const encodedValue =
        new TextEncoder().encode(value);

    const encrypted = await crypto.subtle.encrypt(
        {
            name: "AES-GCM",
            iv
        },
        key,
        encodedValue
    );

    return [
        bytesToBase64(iv),
        bytesToBase64(
            new Uint8Array(encrypted)
        )
    ].join(".");
}

export async function decryptValue(
    base64Key,
    encryptedValue
) {
    const [
        ivBase64,
        ciphertextBase64
    ] = encryptedValue.split(".");

    if (
        !ivBase64 ||
        !ciphertextBase64
    ) {
        throw new Error(
            "Invalid encrypted value."
        );
    }

    const key = await getEncryptionKey(
        base64Key
    );

    const iv =
        base64ToBytes(ivBase64);

    const ciphertext =
        base64ToBytes(ciphertextBase64);

    const decrypted = await crypto.subtle.decrypt(
        {
            name: "AES-GCM",
            iv
        },
        key,
        ciphertext
    );

    return new TextDecoder().decode(
        decrypted
    );
}