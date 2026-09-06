
        // =====================================================
        // Elements
        // =====================================================

        const overlay =
            document.getElementById(
                "overlay"
            );

        const username =
            document.getElementById(
                "username"
            );

        const eggPlaceholder =
            document.getElementById(
                "egg-placeholder"
            );

        const eggImage =
            document.getElementById(
                "egg-image"
            );

        const eggName =
            document.getElementById(
                "egg-name"
            );

        const rarity =
            document.getElementById(
                "rarity"
            );

        const collectionStatus =
            document.getElementById(
                "collection-status"
            );

        const flash =
            document.getElementById(
                "flash"
            );


        // =====================================================
        // Roll queue
        // =====================================================

        const queue = [];

        let playing = false;


        // =====================================================
        // WebSocket
        // =====================================================

        const protocol =
            window.location.protocol === "https:"
                ? "wss:"
                : "ws:";

        const params =
            new URLSearchParams(
                window.location.search
            );


        const overlayKey =
            params.get(
                "key"
            );


        if (!overlayKey) {

            throw new Error(
                "Missing overlay key."
            );

        }


        const socket =
            new WebSocket(
                `${protocol}//${window.location.host}/overlay-ws?key=${encodeURIComponent(overlayKey)}`
            );


        // =====================================================
        // WebSocket connected
        // =====================================================

        socket.addEventListener(
            "open",
            () => {

                console.log(
                    "EggGacha overlay connected ✓"
                );

            }
        );


        // =====================================================
        // Receive EggGacha messages
        // =====================================================

        socket.addEventListener(
            "message",
            event => {

                try {

                    const message =
                        JSON.parse(
                            event.data
                        );


                    console.log(
                        "Overlay message received:",
                        message
                    );


                    // Ignore messages that are not egg rolls.

                    if (
                        message.type !==
                        "egg_roll"
                    ) {

                        return;

                    }


                    // Add the roll to the queue.

                    queue.push(
                        message
                    );


                    // Start playing if nothing is
                    // currently being displayed.

                    playNext();

                } catch (error) {

                    console.error(
                        "Failed to process overlay message:",
                        error
                    );

                }

            }
        );


        // =====================================================
        // WebSocket error
        // =====================================================

        socket.addEventListener(
            "error",
            error => {

                console.error(
                    "EggGacha overlay WebSocket error:",
                    error
                );

            }
        );


        // =====================================================
        // WebSocket disconnected
        // =====================================================

        socket.addEventListener(
            "close",
            () => {

                console.warn(
                    "EggGacha overlay disconnected."
                );

            }
        );


        // =====================================================
        // Queue
        // =====================================================

        async function playNext() {

            if (playing) {
                return;
            }


            const message =
                queue.shift();


            if (!message) {
                return;
            }


            playing =
                true;


            try {

                await playRoll(
                    message
                );

            } catch (error) {

                console.error(
                    "Failed to play egg roll:",
                    error
                );

            } finally {

                playing =
                    false;


                playNext();

            }

        }


        // =====================================================
        // Play egg roll
        // =====================================================

        async function playRoll(
            message
        ) {

            resetOverlay();


            const rolledRarity =
                message.egg.rarity;


            // =================================================
            // Apply rarity class
            // =================================================

            overlay.classList.add(
                rolledRarity
            );


            // =================================================
            // Viewer
            // =================================================

            username.textContent =
                message.user.displayName;


            // =================================================
            // Egg information
            // =================================================

            eggName.textContent =
                message.egg.name;


            rarity.textContent =
                rolledRarity;


            // =================================================
            // Collection information
            // =================================================

            if (
                message.collection.isNew
            ) {

                collectionStatus.textContent =
                    "NEW!";


                collectionStatus.classList.add(
                    "new"
                );

            } else {

                collectionStatus.textContent =
                    `Owned ×${message.collection.quantity}`;

            }


            // =================================================
            // Egg image
            // =================================================

            if (
                message.egg.image
            ) {

                eggImage.src =
                    message.egg.image;

            }


            // =================================================
            // Show overlay
            // =================================================

            overlay.classList.add(
                "visible"
            );


            // =================================================
            // Start shake
            // =================================================

            eggPlaceholder.classList.add(
                "shake"
            );


            const timings =
                getRarityTimings(
                    rolledRarity
                );


            await wait(
                timings.shake
            );


            // =================================================
            // Stop shaking
            // =================================================

            eggPlaceholder.classList.remove(
                "shake"
            );


            eggPlaceholder.style.opacity =
                "0";


            // =================================================
            // Reveal flash
            // =================================================

            flash.classList.add(
                "flash"
            );


            // =================================================
            // Reveal egg
            // =================================================

            eggImage.classList.add(
                "reveal"
            );


            await wait(
                750
            );


            // =================================================
            // Rarity-specific animation
            // =================================================

            addRarityAnimation(
                rolledRarity
            );


            // =================================================
            // Display egg
            // =================================================

            await wait(
                timings.display
            );


            // =================================================
            // Hide overlay
            // =================================================

            overlay.classList.remove(
                "visible"
            );


            await wait(
                400
            );


            resetOverlay();

        }


        // =====================================================
        // Rarity animations
        // =====================================================

        function addRarityAnimation(
            rolledRarity
        ) {

            if (
                rolledRarity ===
                "legendary"
            ) {

                eggImage.classList.add(
                    "float"
                );

            }


            if (
                rolledRarity ===
                "exotic"
            ) {

                eggImage.classList.add(
                    "float"
                );

            }


            if (
                rolledRarity ===
                "mythic"
            ) {

                eggImage.classList.add(
                    "mythic-pulse"
                );

            }


            if (
                rolledRarity ===
                "ancient"
            ) {

                eggImage.classList.add(
                    "ancient-pulse"
                );

            }


            if (
                rolledRarity ===
                "eternal"
            ) {

                eggImage.classList.add(
                    "eternal-pulse"
                );

            }

        }


        // =====================================================
        // Rarity timings
        // =====================================================

        function getRarityTimings(
            rolledRarity
        ) {

            const timings = {

                common: {
                    shake: 900,
                    display: 2200
                },

                uncommon: {
                    shake: 1100,
                    display: 2400
                },

                rare: {
                    shake: 1300,
                    display: 2800
                },

                epic: {
                    shake: 1550,
                    display: 3100
                },

                legendary: {
                    shake: 1850,
                    display: 3600
                },

                exotic: {
                    shake: 2100,
                    display: 3900
                },

                mythic: {
                    shake: 2500,
                    display: 4400
                },

                ancient: {
                    shake: 2900,
                    display: 4900
                },

                eternal: {
                    shake: 3500,
                    display: 5600
                }

            };


            return (
                timings[rolledRarity] ??
                timings.common
            );

        }


        // =====================================================
        // Reset overlay
        // =====================================================

        function resetOverlay() {

            overlay.className =
                "";


            eggPlaceholder.className =
                "";


            eggPlaceholder.style.opacity =
                "1";


            eggImage.className =
                "";


            eggImage.removeAttribute(
                "src"
            );


            flash.className =
                "";


            collectionStatus.className =
                "";


            username.textContent =
                "";


            eggName.textContent =
                "";


            rarity.textContent =
                "";


            collectionStatus.textContent =
                "";

        }


        // =====================================================
        // Utility
        // =====================================================

        function wait(
            milliseconds
        ) {

            return new Promise(
                resolve =>
                    setTimeout(
                        resolve,
                        milliseconds
                    )
            );

        }
