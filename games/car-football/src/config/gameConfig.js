// Central game configuration - single source of truth for all tunable values

const GAME_CONFIG = {
    // Display
    GAME_WIDTH: 1024,
    GAME_HEIGHT: 600,

    // Pitch
    WALL_THICKNESS: 20,
    PITCH_COLOR: 0x2d8a4e,
    LINE_COLOR: 0xffffff,

    // Goals
    GOAL_WIDTH: 50,
    GOAL_HEIGHT: 160,
    GOAL_POST_THICKNESS: 8,
    BLUE_GOAL_COLOR: 0x3366ff,
    RED_GOAL_COLOR: 0xff3333,

    // Car
    CAR_SCALE: 0.12, // legacy - kept for reference; sizing now uses CAR_TARGET_HEIGHT
    CAR_TARGET_HEIGHT: 40, // fixed display height in pixels; both cars are scaled to this
    CAR_MAX_SPEED: 350,
    CAR_ACCELERATION: 1200,
    CAR_DRAG_X: 800,
    CAR_BOUNCE: 0.3,
    CAR_JUMP_VELOCITY: -450,

    // Boost (air rocket)
    BOOST_THRUST: 1800,           // thrust force applied in car's facing direction (high for substantial momentum)
    BOOST_MAX_FUEL: 100,          // full tank
    BOOST_DRAIN_RATE: 50,         // fuel consumed per second while boosting
    BOOST_RECHARGE_RATE: 30,      // default fuel recovered per second while on ground
    BOOST_PARTICLE_LIFESPAN: 300, // ms each flame particle lives
    CAR_AIR_ROTATION_SPEED: 180,  // degrees per second when rotating in air

    // Boost regen presets
    BOOST_REGEN_OPTIONS: [
        { label: 'Slow', rate: 15 },
        { label: 'Normal', rate: 30 },
        { label: 'Fast', rate: 60 },
        { label: 'Infinite', rate: -1 }
    ],
    DEFAULT_BOOST_REGEN: 'Normal',

    // Car size presets
    CAR_SIZE_OPTIONS: [
        { label: 'Tiny', height: 25 },
        { label: 'Small', height: 35 },
        { label: 'Normal', height: 40 },
        { label: 'Large', height: 55 }
    ],
    DEFAULT_CAR_SIZE: 'Normal',

    // Ball size presets
    BALL_SIZE_OPTIONS: [
        { label: 'Tiny', radius: 6 },
        { label: 'Small', radius: 9 },
        { label: 'Normal', radius: 12 },
        { label: 'Large', radius: 18 },
        { label: 'Giant', radius: 28 }
    ],
    DEFAULT_BALL_SIZE: 'Normal',

    // Ball
    BALL_RADIUS: 12,
    BALL_COLOR: 0xffffff,
    BALL_OUTLINE_COLOR: 0x333333,
    BALL_BOUNCE: 0.75,
    BALL_DRAG_X: 30,
    BALL_DRAG_Y: 0,
    BALL_MAX_SPEED: 600,

    // Kick
    KICK_FORCE: 350,
    KICK_CAR_SPEED_FACTOR: 0.5,

    // Car speed presets
    SPEED_OPTIONS: [
        { label: 'Slow', maxSpeed: 200, acceleration: 700 },
        { label: 'Normal', maxSpeed: 350, acceleration: 1200 },
        { label: 'Fast', maxSpeed: 500, acceleration: 1600 },
        { label: 'Very Fast', maxSpeed: 700, acceleration: 2200 }
    ],
    DEFAULT_SPEED: 'Normal',

    // Physics
    GRAVITY_Y: 900,

    // Ball gravity presets (effective gravity applied to the ball)
    GRAVITY_OPTIONS: [
        { label: 'Normal', value: 900 },
        { label: 'Low', value: 500 },
        { label: 'Very Low', value: 250 },
        { label: 'Moon', value: 100 }
    ],
    DEFAULT_BALL_GRAVITY: 900,

    // AI Difficulty Settings
    AI: {
        easy: {
            reactionDelay: 500,
            maxSpeed: 200,
            predictionEnabled: false,
            jumpAccuracy: 0.25,
            positioningSkill: 0.3,
            mistakeChance: 0.15
        },
        medium: {
            reactionDelay: 200,
            maxSpeed: 300,
            predictionEnabled: false,
            jumpAccuracy: 0.6,
            positioningSkill: 0.6,
            mistakeChance: 0.05
        },
        hard: {
            reactionDelay: 50,
            maxSpeed: 400,
            predictionEnabled: true,
            jumpAccuracy: 0.9,
            positioningSkill: 0.95,
            mistakeChance: 0.01
        }
    },

    // Match defaults
    DEFAULT_GOAL_LIMIT: 5,
    DEFAULT_TIME_LIMIT: 180, // seconds (3 minutes)
    DEFAULT_DIFFICULTY: 'medium',

    // Reset positions
    BLUE_START_X_RATIO: 0.25,
    RED_START_X_RATIO: 0.75,

    // Goal celebration
    GOAL_PAUSE_DURATION: 2000, // ms

    // Ball stuck detection & auto-launch
    BALL_GROUND_STUCK_TIME: 3000,   // ms before auto-launch
    BALL_LAUNCH_VELOCITY: -500,     // upward launch speed (negative = up)
    BALL_LAUNCH_WARNING_TIME: 2000  // ms on ground before warning starts
};

export default GAME_CONFIG;
