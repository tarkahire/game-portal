// Map definitions for the car football game
// Each map defines pitch dimensions (via wall thickness), colours, goal size, and obstacles.
// All maps render within the fixed 1024x600 canvas. "Small" maps use thicker walls
// to shrink the playing area; "large" maps use thinner walls to maximise it.

const MAP_LIST = [
    {
        name: 'Classic',
        wallThickness: 20,
        pitchColor: 0x2d8a4e,
        wallColor: 0x444444,
        lineColor: 0xffffff,
        goalHeight: 160,
        goalWidth: 50,
        goalPostThickness: 8,
        ballDrag: 30,
        obstacles: []
    },
    {
        name: 'Arena',
        wallThickness: 80,
        pitchColor: 0x8B0000,
        wallColor: 0x555555,
        lineColor: 0xffffff,
        goalHeight: 140,
        goalWidth: 50,
        goalPostThickness: 8,
        ballDrag: 30,
        obstacles: []
    },
    {
        name: 'Colosseum',
        wallThickness: 5,
        pitchColor: 0xC2B280,
        wallColor: 0x8B7355,
        lineColor: 0xffffff,
        goalHeight: 200,
        goalWidth: 50,
        goalPostThickness: 8,
        ballDrag: 30,
        obstacles: []
    },
    {
        name: 'Ice Rink',
        wallThickness: 20,
        pitchColor: 0xB0E0E6,
        wallColor: 0x4682B4,
        lineColor: 0xFFFFFF,
        goalHeight: 110,
        goalWidth: 50,
        goalPostThickness: 8,
        ballDrag: 10,
        obstacles: []
    },
    {
        name: 'Fortress',
        wallThickness: 20,
        pitchColor: 0x2F4F4F,
        wallColor: 0x696969,
        lineColor: 0xffffff,
        goalHeight: 100,
        goalWidth: 50,
        goalPostThickness: 8,
        ballDrag: 30,
        obstacles: [
            // Center platform — 60% down from top of playing area
            { xRatio: 0.5, yRatio: 0.6, width: 120, height: 15 }
        ]
    },
    {
        name: 'Chaos',
        wallThickness: 5,
        pitchColor: 0x1a1a2e,
        wallColor: 0x333355,
        lineColor: 0x4444aa,
        goalHeight: 200,
        goalWidth: 50,
        goalPostThickness: 8,
        ballDrag: 30,
        obstacles: [
            // Left ramp
            { xRatio: 0.3, yRatio: 0.7, width: 80, height: 12 },
            // Center platform
            { xRatio: 0.5, yRatio: 0.5, width: 80, height: 12 },
            // Right ramp
            { xRatio: 0.7, yRatio: 0.7, width: 80, height: 12 }
        ]
    }
];

const DEFAULT_MAP = 'Classic';

export { MAP_LIST, DEFAULT_MAP };
