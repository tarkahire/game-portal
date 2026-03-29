import GAME_CONFIG from '../config/gameConfig.js';

export default class Pitch {
    constructor(scene, mapConfig) {
        this.scene = scene;
        this.mapConfig = mapConfig;
        this.walls = scene.physics.add.staticGroup();
        this.obstacles = scene.physics.add.staticGroup();

        this.draw();
        this.createWalls();
        this.createObstacles();
    }

    draw() {
        const { GAME_WIDTH, GAME_HEIGHT } = GAME_CONFIG;
        const mc = this.mapConfig;
        const WALL_THICKNESS = mc.wallThickness;
        const GOAL_WIDTH = mc.goalWidth;
        const GOAL_HEIGHT = mc.goalHeight;
        const PITCH_COLOR = mc.pitchColor;
        const LINE_COLOR = mc.lineColor;
        const BLUE_GOAL_COLOR = GAME_CONFIG.BLUE_GOAL_COLOR;
        const RED_GOAL_COLOR = GAME_CONFIG.RED_GOAL_COLOR;

        const gfx = this.scene.add.graphics();

        // Pitch background
        gfx.fillStyle(PITCH_COLOR, 1);
        gfx.fillRect(WALL_THICKNESS, WALL_THICKNESS,
            GAME_WIDTH - WALL_THICKNESS * 2, GAME_HEIGHT - WALL_THICKNESS * 2);

        // Center line
        gfx.lineStyle(2, LINE_COLOR, 0.5);
        gfx.lineBetween(GAME_WIDTH / 2, WALL_THICKNESS, GAME_WIDTH / 2, GAME_HEIGHT - WALL_THICKNESS);

        // Center circle
        gfx.strokeCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 60);

        // Center dot
        gfx.fillStyle(LINE_COLOR, 0.5);
        gfx.fillCircle(GAME_WIDTH / 2, GAME_HEIGHT / 2, 4);

        // Goal areas background
        const goalTop = GAME_HEIGHT - WALL_THICKNESS - GOAL_HEIGHT;

        // Left goal (blue team's goal)
        gfx.fillStyle(BLUE_GOAL_COLOR, 0.3);
        gfx.fillRect(WALL_THICKNESS - GOAL_WIDTH, goalTop, GOAL_WIDTH, GOAL_HEIGHT);

        // Right goal (red team's goal)
        gfx.fillStyle(RED_GOAL_COLOR, 0.3);
        gfx.fillRect(GAME_WIDTH - WALL_THICKNESS, goalTop, GOAL_WIDTH, GOAL_HEIGHT);

        // Goal outlines
        gfx.lineStyle(3, BLUE_GOAL_COLOR, 1);
        gfx.strokeRect(WALL_THICKNESS - GOAL_WIDTH, goalTop, GOAL_WIDTH, GOAL_HEIGHT);

        gfx.lineStyle(3, RED_GOAL_COLOR, 1);
        gfx.strokeRect(GAME_WIDTH - WALL_THICKNESS, goalTop, GOAL_WIDTH, GOAL_HEIGHT);

        // Wall visuals
        const WALL_COLOR = mc.wallColor;
        gfx.fillStyle(WALL_COLOR, 1);
        // Ceiling
        gfx.fillRect(0, 0, GAME_WIDTH, WALL_THICKNESS);
        // Floor
        gfx.fillRect(0, GAME_HEIGHT - WALL_THICKNESS, GAME_WIDTH, WALL_THICKNESS);

        // Left wall - above goal
        gfx.fillRect(0, 0, WALL_THICKNESS, goalTop);
        // Left wall - goal back
        gfx.fillRect(WALL_THICKNESS - GOAL_WIDTH - mc.goalPostThickness, goalTop,
            mc.goalPostThickness, GOAL_HEIGHT);

        // Right wall - above goal
        gfx.fillRect(GAME_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, goalTop);
        // Right wall - goal back
        gfx.fillRect(GAME_WIDTH - WALL_THICKNESS + GOAL_WIDTH, goalTop,
            mc.goalPostThickness, GOAL_HEIGHT);

        // Goal net lines (visual only)
        gfx.lineStyle(1, 0xcccccc, 0.3);
        for (let i = 1; i < 6; i++) {
            // Left goal net
            const lx = WALL_THICKNESS - GOAL_WIDTH + (GOAL_WIDTH / 6) * i;
            gfx.lineBetween(lx, goalTop, lx, goalTop + GOAL_HEIGHT);
            const ly = goalTop + (GOAL_HEIGHT / 6) * i;
            gfx.lineBetween(WALL_THICKNESS - GOAL_WIDTH, ly, WALL_THICKNESS, ly);

            // Right goal net
            const rx = GAME_WIDTH - WALL_THICKNESS + (GOAL_WIDTH / 6) * i;
            gfx.lineBetween(rx, goalTop, rx, goalTop + GOAL_HEIGHT);
            const ry = goalTop + (GOAL_HEIGHT / 6) * i;
            gfx.lineBetween(GAME_WIDTH - WALL_THICKNESS, ry, GAME_WIDTH - WALL_THICKNESS + GOAL_WIDTH, ry);
        }
    }

    createWalls() {
        const { GAME_WIDTH, GAME_HEIGHT } = GAME_CONFIG;
        const mc = this.mapConfig;
        const WALL_THICKNESS = mc.wallThickness;
        const GOAL_WIDTH = mc.goalWidth;
        const GOAL_HEIGHT = mc.goalHeight;
        const GOAL_POST_THICKNESS = mc.goalPostThickness;
        const goalTop = GAME_HEIGHT - WALL_THICKNESS - GOAL_HEIGHT;

        // Minimum physics body thickness to prevent high-velocity tunneling.
        // Arcade Physics uses discrete collision detection, so thin bodies
        // (e.g. 5px on Colosseum/Chaos maps) can be skipped entirely when an
        // object moves more than the body's thickness in a single frame.
        // The visual wall thickness is unaffected — only the invisible physics
        // rectangle is enlarged. The extra thickness extends *outward* (away
        // from the playing area) so the playable space stays the same.
        const MIN_BODY = 20;
        const physThick = Math.max(WALL_THICKNESS, MIN_BODY);

        // Ceiling - full width (extra thickness grows upward, off-screen)
        this.addWall(GAME_WIDTH / 2, WALL_THICKNESS / 2 - (physThick - WALL_THICKNESS) / 2,
            GAME_WIDTH, physThick);

        // Floor - full width (extra thickness grows downward, off-screen)
        this.addWall(GAME_WIDTH / 2, GAME_HEIGHT - WALL_THICKNESS / 2 + (physThick - WALL_THICKNESS) / 2,
            GAME_WIDTH, physThick);

        // Left wall - section ABOVE the goal opening (extra grows leftward)
        const leftWallAboveHeight = goalTop;
        if (leftWallAboveHeight > 0) {
            this.addWall(WALL_THICKNESS / 2 - (physThick - WALL_THICKNESS) / 2,
                leftWallAboveHeight / 2, physThick, leftWallAboveHeight);
        }

        // Right wall - section ABOVE the goal opening (extra grows rightward)
        this.addWall(GAME_WIDTH - WALL_THICKNESS / 2 + (physThick - WALL_THICKNESS) / 2,
            leftWallAboveHeight / 2, physThick, leftWallAboveHeight);

        // Left goal crossbar (top of goal opening)
        this.addWall(WALL_THICKNESS / 2, goalTop, WALL_THICKNESS, GOAL_POST_THICKNESS);

        // Right goal crossbar
        this.addWall(GAME_WIDTH - WALL_THICKNESS / 2, goalTop, WALL_THICKNESS, GOAL_POST_THICKNESS);

        // Left goal back wall
        this.addWall(WALL_THICKNESS - GOAL_WIDTH - GOAL_POST_THICKNESS / 2, goalTop + GOAL_HEIGHT / 2,
            GOAL_POST_THICKNESS, GOAL_HEIGHT);

        // Right goal back wall
        this.addWall(GAME_WIDTH - WALL_THICKNESS + GOAL_WIDTH + GOAL_POST_THICKNESS / 2,
            goalTop + GOAL_HEIGHT / 2, GOAL_POST_THICKNESS, GOAL_HEIGHT);

        // Left goal floor (extends into goal) — use physThick for the floor
        this.addWall(WALL_THICKNESS - GOAL_WIDTH / 2,
            GAME_HEIGHT - WALL_THICKNESS / 2 + (physThick - WALL_THICKNESS) / 2,
            GOAL_WIDTH, physThick);

        // Right goal floor — use physThick for the floor
        this.addWall(GAME_WIDTH - WALL_THICKNESS + GOAL_WIDTH / 2,
            GAME_HEIGHT - WALL_THICKNESS / 2 + (physThick - WALL_THICKNESS) / 2,
            GOAL_WIDTH, physThick);

        // Left goal ceiling (inside goal recess)
        this.addWall(WALL_THICKNESS - GOAL_WIDTH / 2,
            goalTop - GOAL_POST_THICKNESS / 2, GOAL_WIDTH, GOAL_POST_THICKNESS);

        // Right goal ceiling
        this.addWall(GAME_WIDTH - WALL_THICKNESS + GOAL_WIDTH / 2,
            goalTop - GOAL_POST_THICKNESS / 2, GOAL_WIDTH, GOAL_POST_THICKNESS);
    }

    createObstacles() {
        const { GAME_WIDTH, GAME_HEIGHT } = GAME_CONFIG;
        const mc = this.mapConfig;
        const WALL_THICKNESS = mc.wallThickness;

        if (!mc.obstacles || mc.obstacles.length === 0) return;

        // Playing area bounds (inside the walls)
        const playLeft = WALL_THICKNESS;
        const playTop = WALL_THICKNESS;
        const playWidth = GAME_WIDTH - WALL_THICKNESS * 2;
        const playHeight = GAME_HEIGHT - WALL_THICKNESS * 2;

        mc.obstacles.forEach(obs => {
            const ox = playLeft + playWidth * obs.xRatio;
            const oy = playTop + playHeight * obs.yRatio;

            // Visual rectangle for the obstacle
            const obstacleVisual = this.scene.add.rectangle(
                ox, oy, obs.width, obs.height, mc.wallColor, 1
            ).setDepth(3);

            // Add a slightly lighter border to make it visible
            const gfx = this.scene.add.graphics();
            gfx.lineStyle(2, 0xaaaaaa, 0.6);
            gfx.strokeRect(ox - obs.width / 2, oy - obs.height / 2, obs.width, obs.height);
            gfx.setDepth(3);

            // Create invisible physics body for the obstacle
            const obstacleBody = this.scene.add.rectangle(
                ox, oy, obs.width, obs.height, 0x000000, 0
            );
            this.scene.physics.add.existing(obstacleBody, true); // true = static
            this.obstacles.add(obstacleBody);
        });
    }

    addWall(x, y, width, height) {
        const wall = this.scene.add.rectangle(x, y, width, height, 0x000000, 0);
        this.scene.physics.add.existing(wall, true); // true = static
        this.walls.add(wall);
    }

    getGoalTop() {
        return GAME_CONFIG.GAME_HEIGHT - this.mapConfig.wallThickness - this.mapConfig.goalHeight;
    }
}
