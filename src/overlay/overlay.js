import {
    WebSocketServer,
    WebSocket
} from "ws";

import crypto from "crypto";


let overlayWss =
    null;


// ======================================================
// Start overlay WebSocket server
// ======================================================

export function startOverlayServer(
    server
) {

    overlayWss =
        new WebSocketServer({
            noServer:
                true
        });


    // ==================================================
    // HTTP upgrade
    // ==================================================

    server.on(
        "upgrade",
        (
            request,
            socket,
            head
        ) => {

            try {

                const requestUrl =
                    new URL(
                        request.url,
                        "http://localhost"
                    );


                // Only handle the overlay WebSocket.
                if (
                    requestUrl.pathname !==
                    "/overlay-ws"
                ) {

                    return;

                }


                const providedKey =
                    requestUrl.searchParams.get(
                        "key"
                    );


                if (
                    !providedKey ||
                    !isValidOverlayKey(
                        providedKey
                    )
                ) {

                    console.warn(
                        "Rejected unauthorized overlay WebSocket connection."
                    );


                    socket.write(
                        "HTTP/1.1 401 Unauthorized\r\n" +
                        "Connection: close\r\n" +
                        "\r\n"
                    );


                    socket.destroy();


                    return;

                }


                overlayWss.handleUpgrade(
                    request,
                    socket,
                    head,
                    webSocket => {

                        overlayWss.emit(
                            "connection",
                            webSocket,
                            request
                        );

                    }
                );

            } catch (error) {

                console.error(
                    "Failed to process overlay WebSocket upgrade:",
                    error
                );


                socket.destroy();

            }

        }
    );


    // ==================================================
    // Authorized overlay connection
    // ==================================================

    overlayWss.on(
        "connection",
        socket => {

            console.log(
                "Authorized overlay client connected ✓"
            );


            socket.on(
                "close",
                () => {

                    console.log(
                        "Overlay client disconnected"
                    );

                }
            );


            socket.on(
                "error",
                error => {

                    console.error(
                        "Overlay WebSocket error:",
                        error
                    );

                }
            );

        }
    );


    console.log(
        "Protected overlay WebSocket ready at /overlay-ws ✓"
    );

}


// ======================================================
// Validate overlay key
// ======================================================

function isValidOverlayKey(
    providedKey
) {

    const expectedKey =
        process.env.OVERLAY_SECRET;


    if (
        !expectedKey ||
        !providedKey
    ) {

        return false;

    }


    const expectedBuffer =
        Buffer.from(
            expectedKey
        );


    const providedBuffer =
        Buffer.from(
            providedKey
        );


    if (
        expectedBuffer.length !==
        providedBuffer.length
    ) {

        return false;

    }


    return crypto.timingSafeEqual(
        expectedBuffer,
        providedBuffer
    );

}


// ======================================================
// Send egg roll
// ======================================================

export function sendEggRollToOverlay(
    user,
    egg,
    quantity
) {

    if (!overlayWss) {

        console.warn(
            "Overlay WebSocket server has not been started."
        );


        return;

    }


    const message =
        JSON.stringify({

            type:
                "egg_roll",

            user: {
                displayName:
                    user.display_name

            },

            egg: {

                id:
                    egg.id,

                name:
                    egg.name,

                rarity:
                    egg.rarity,

                image:
                    egg.image ?? null

            },

            collection: {

                quantity,

                isNew:
                    quantity === 1

            }

        });


    let sentTo =
        0;


    for (
        const client
        of overlayWss.clients
    ) {

        if (
            client.readyState ===
            WebSocket.OPEN
        ) {

            client.send(
                message
            );


            sentTo++;

        }

    }


    console.log(
        `Egg roll sent to ${sentTo} overlay client(s).`
    );

}