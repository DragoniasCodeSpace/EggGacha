import { eggs } from "./eggs.js";
import { rarities } from "./rarities.js";

export function rollEgg() {
    const rarity = rollRarity();

    const possibleEggs = eggs.filter(
        egg => egg.rarity === rarity
    );

    if (possibleEggs.length === 0) {
        throw new Error(
            `No eggs configured for rarity: ${rarity}`
        );
    }

    return possibleEggs[
        Math.floor(Math.random() * possibleEggs.length)
    ];
}

function rollRarity() {
    const roll = Math.random() * 100;

    let cumulativeChance = 0;

    for (const rarity of rarities) {
        cumulativeChance += rarity.chance;

        if (roll < cumulativeChance) {
            return rarity.name;
        }
    }

    throw new Error("Failed to roll a rarity.");
}