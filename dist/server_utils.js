"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRandomPositionInZone = getRandomPositionInZone;
exports.createDecoration = createDecoration;
exports.createSand = createSand;
const constants_1 = require("./constants");
const sands = [];
function getRandomPositionInZone(zoneIndex) {
    const zoneWidth = constants_1.WORLD_WIDTH / 6; // 6 zones
    const startX = zoneIndex * zoneWidth;
    // For legendary and mythic zones, ensure they're in the rightmost areas
    if (zoneIndex >= 4) { // Legendary and Mythic zones
        const adjustedStartX = constants_1.WORLD_WIDTH - (6 - zoneIndex) * (zoneWidth / 2); // Start from right side
        return {
            x: adjustedStartX + Math.random() * (constants_1.WORLD_WIDTH - adjustedStartX),
            y: Math.random() * constants_1.WORLD_HEIGHT
        };
    }
    return {
        x: startX + Math.random() * zoneWidth,
        y: Math.random() * constants_1.WORLD_HEIGHT
    };
}
function createDecoration() {
    const zoneIndex = Math.floor(Math.random() * 6); // 6 zones
    const pos = getRandomPositionInZone(zoneIndex);
    return {
        x: pos.x,
        y: pos.y,
        scale: 0.5 + Math.random() * 1.5
    };
}
function createSand() {
    // Create sand patches with more spacing
    const sectionWidth = constants_1.WORLD_WIDTH / (constants_1.SAND_COUNT / 2); // Divide world into sections
    const sectionIndex = sands.length;
    return {
        x: (sectionIndex * sectionWidth) + Math.random() * sectionWidth, // Spread out along x-axis
        y: Math.random() * constants_1.WORLD_HEIGHT,
        radius: constants_1.MIN_SAND_RADIUS + Math.random() * (constants_1.MAX_SAND_RADIUS - constants_1.MIN_SAND_RADIUS),
        rotation: Math.random() * Math.PI * 2
    };
}
