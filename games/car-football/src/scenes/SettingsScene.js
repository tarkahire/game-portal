import GAME_CONFIG from '../config/gameConfig.js';
import { MAP_LIST, DEFAULT_MAP } from '../config/maps.js';

export default class SettingsScene extends Phaser.Scene {
    constructor() {
        super({ key: 'SettingsScene' });
    }

    create() {
        const centerX = GAME_CONFIG.GAME_WIDTH / 2;

        this.cameras.main.setBackgroundColor('#1a1a2e');

        // State
        this.mapName = DEFAULT_MAP;
        this.matchMode = 'goals'; // 'goals' or 'time'
        this.goalLimit = GAME_CONFIG.DEFAULT_GOAL_LIMIT;
        this.timeLimit = GAME_CONFIG.DEFAULT_TIME_LIMIT;
        this.difficulty = GAME_CONFIG.DEFAULT_DIFFICULTY;
        this.ballGravity = GAME_CONFIG.DEFAULT_BALL_GRAVITY;
        this.carSpeed = GAME_CONFIG.DEFAULT_SPEED;
        this.boostRegen = GAME_CONFIG.DEFAULT_BOOST_REGEN;
        this.carSize = GAME_CONFIG.DEFAULT_CAR_SIZE;
        this.ballSize = GAME_CONFIG.DEFAULT_BALL_SIZE;
        this.gameMode = 'ai'; // 'ai' or '2player'
        this.carStyle = GAME_CONFIG.DEFAULT_CAR_STYLE;
        this.goalExplosion = GAME_CONFIG.DEFAULT_GOAL_EXPLOSION;

        // ---- FIXED ELEMENTS (not scrolled) ----

        // Title
        this.add.text(centerX, 24, 'MATCH SETTINGS', {
            fontSize: '30px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100);

        // Back button (fixed top-left)
        this.createBackButton(80, 24);

        // Start button (fixed bottom)
        this.createStartButton(centerX, 565);

        // Dark overlay bars to hide scrolling content behind title/start button
        this.add.rectangle(centerX, 25, GAME_CONFIG.GAME_WIDTH, 50, 0x1a1a2e)
            .setDepth(99);
        this.add.rectangle(centerX, 575, GAME_CONFIG.GAME_WIDTH, 50, 0x1a1a2e)
            .setDepth(99);

        // ---- SCROLLABLE CONTENT ----

        // Create a container for all settings rows
        this.settingsContainer = this.add.container(0, 0);

        // Build all selector rows at comfortable Y positions within the container
        // Y values are relative to the container's internal coordinate space
        let rowY = 0;

        // 1. Game Mode selector
        rowY = this.createGameModeSelector(centerX, rowY);

        // 2. AI Difficulty (conditionally visible)
        rowY = this.createDifficultySelector(centerX, rowY);

        // 3. Map selector
        rowY = this.createMapSelector(centerX, rowY);

        // 4. Match End Condition
        rowY = this.createMatchModeSelector(centerX, rowY);

        // 5. Car Speed
        rowY = this.createCarSpeedSelector(centerX, rowY);

        // 6. Ball Gravity
        rowY = this.createBallGravitySelector(centerX, rowY);

        // 7. Boost Regen
        rowY = this.createBoostRegenSelector(centerX, rowY);

        // 8. Car Size
        rowY = this.createCarSizeSelector(centerX, rowY);

        // 9. Ball Size
        rowY = this.createBallSizeSelector(centerX, rowY);

        // 10. Car Style
        rowY = this.createCarStyleSelector(centerX, rowY);

        // 11. Goal Explosion
        rowY = this.createGoalExplosionSelector(centerX, rowY);

        // Store total content height for scroll clamping
        this.contentHeight = rowY;

        // ---- SCROLL MASK ----
        // Visible scroll area: from y=50 (below title) to y=545 (above start button)
        this.scrollTop = 50;
        this.scrollBottom = 545;
        this.scrollAreaHeight = this.scrollBottom - this.scrollTop;

        // Position the container so its content starts at the scroll area top
        this.scrollOffset = 0;
        this.settingsContainer.setPosition(0, this.scrollTop);

        // Create a graphics mask to clip the scrollable area
        const maskShape = this.make.graphics({ x: 0, y: 0, add: false });
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(0, this.scrollTop, GAME_CONFIG.GAME_WIDTH, this.scrollAreaHeight);
        const mask = maskShape.createGeometryMask();
        this.settingsContainer.setMask(mask);

        // ---- MOUSE WHEEL SCROLLING ----
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            this.scrollOffset += deltaY * 0.5;
            this.clampScroll();
            this.settingsContainer.setPosition(0, this.scrollTop - this.scrollOffset);
        });
    }

    clampScroll() {
        const maxScroll = Math.max(0, this.contentHeight - this.scrollAreaHeight);
        this.scrollOffset = Phaser.Math.Clamp(this.scrollOffset, 0, maxScroll);
    }

    // --- Helper: add element to the scrollable container ---
    addToContainer(...elements) {
        elements.forEach(el => this.settingsContainer.add(el));
    }

    // ==========================================================
    // GAME MODE SELECTOR
    // ==========================================================
    createGameModeSelector(x, y) {
        const label = this.add.text(x, y, 'Game Mode', {
            fontSize: '20px', fill: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(label);

        const modes = [
            { label: 'vs AI', key: 'ai', color: 0x4CAF50 },
            { label: '2 Player', key: '2player', color: 0x2196F3 }
        ];

        this.gameModeBtns = [];
        modes.forEach((mode, i) => {
            const bx = x - 80 + i * 160;
            const isSelected = mode.key === this.gameMode;
            const btn = this.add.rectangle(bx, y + 30, 130, 34, isSelected ? mode.color : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 30, mode.label, {
                fontSize: '16px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.gameMode = mode.key;
                this.updateGameModeButtons(modes);
                this.updateDifficultyVisibility();
            });

            this.gameModeBtns.push({ btn, txt, key: mode.key, color: mode.color });
            this.addToContainer(btn, txt);
        });

        return y + 75;
    }

    updateGameModeButtons(modes) {
        this.gameModeBtns.forEach(({ btn, key, color }) => {
            btn.setFillStyle(key === this.gameMode ? color : 0x444444);
        });
    }

    updateDifficultyVisibility() {
        const visible = this.gameMode === 'ai';
        this.difficultyElements.forEach(el => el.setVisible(visible));
    }

    // ==========================================================
    // AI DIFFICULTY SELECTOR
    // ==========================================================
    createDifficultySelector(x, y) {
        this.difficultyElements = [];

        const label = this.add.text(x, y, 'AI Difficulty', {
            fontSize: '20px', fill: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(label);
        this.difficultyElements.push(label);

        const difficulties = [
            { label: 'Easy', key: 'easy', color: 0x4CAF50 },
            { label: 'Medium', key: 'medium', color: 0xFF9800 },
            { label: 'Hard', key: 'hard', color: 0xf44336 }
        ];

        this.diffBtns = [];
        difficulties.forEach((diff, i) => {
            const bx = x - 140 + i * 140;
            const isSelected = diff.key === this.difficulty;
            const btn = this.add.rectangle(bx, y + 30, 110, 34, isSelected ? diff.color : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 30, diff.label, {
                fontSize: '16px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.difficulty = diff.key;
                this.updateDiffButtons(difficulties);
            });

            this.diffBtns.push({ btn, txt, key: diff.key, color: diff.color });
            this.addToContainer(btn, txt);
            this.difficultyElements.push(btn, txt);
        });

        return y + 75;
    }

    updateDiffButtons(difficulties) {
        this.diffBtns.forEach(({ btn, key, color }) => {
            btn.setFillStyle(key === this.difficulty ? color : 0x444444);
        });
    }

    // ==========================================================
    // MAP SELECTOR
    // ==========================================================
    createMapSelector(x, y) {
        const label = this.add.text(x, y, 'Map', {
            fontSize: '18px', fill: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(label);

        const totalWidth = (MAP_LIST.length - 1) * 85;
        const startX = x - totalWidth / 2;

        this.mapBtns = [];
        MAP_LIST.forEach((map, i) => {
            const bx = startX + i * 85;
            const isSelected = map.name === this.mapName;
            const btn = this.add.rectangle(bx, y + 24, 74, 28, isSelected ? 0xE65100 : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 24, map.name, {
                fontSize: '12px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.mapName = map.name;
                this.updateMapButtons();
            });

            this.mapBtns.push({ btn, txt, name: map.name });
            this.addToContainer(btn, txt);
        });

        return y + 65;
    }

    updateMapButtons() {
        this.mapBtns.forEach(({ btn, name }) => {
            btn.setFillStyle(name === this.mapName ? 0xE65100 : 0x444444);
        });
    }

    // ==========================================================
    // MATCH MODE SELECTOR
    // ==========================================================
    createMatchModeSelector(x, y) {
        const label = this.add.text(x, y, 'Match End Condition', {
            fontSize: '20px', fill: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(label);

        // Goals mode button
        this.goalModeBtn = this.add.rectangle(x - 120, y + 30, 200, 34, 0x4CAF50)
            .setInteractive({ useHandCursor: true });
        this.goalModeText = this.add.text(x - 120, y + 30, 'Goal Limit', {
            fontSize: '16px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.addToContainer(this.goalModeBtn, this.goalModeText);

        // Time mode button
        this.timeModeBtn = this.add.rectangle(x + 120, y + 30, 200, 34, 0x555555)
            .setInteractive({ useHandCursor: true });
        this.timeModeText = this.add.text(x + 120, y + 30, 'Time Limit', {
            fontSize: '16px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
        }).setOrigin(0.5);
        this.addToContainer(this.timeModeBtn, this.timeModeText);

        // Goal limit value controls
        this.goalValueElements = [];
        const goalValues = [1, 3, 5, 7, 10];

        this.goalBtns = [];
        goalValues.forEach((val, i) => {
            const bx = x - 200 + i * 100;
            const btn = this.add.rectangle(bx, y + 75, 70, 34, val === this.goalLimit ? 0x4CAF50 : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 75, `${val}`, {
                fontSize: '16px', fill: '#ffffff', fontFamily: 'Arial'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.goalLimit = val;
                this.updateGoalButtons();
            });

            this.goalBtns.push({ btn, txt, val });
            this.addToContainer(btn, txt);
            this.goalValueElements.push(btn, txt);
        });

        this.goalsLabel = this.add.text(x, y + 100, 'goals to win', {
            fontSize: '12px', fill: '#888888', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(this.goalsLabel);
        this.goalValueElements.push(this.goalsLabel);

        // Time limit value controls
        this.timeValueElements = [];
        const timeValues = [{ label: '1 min', val: 60 }, { label: '2 min', val: 120 },
            { label: '3 min', val: 180 }, { label: '5 min', val: 300 }];

        this.timeBtns = [];
        timeValues.forEach((item, i) => {
            const bx = x - 170 + i * 115;
            const btn = this.add.rectangle(bx, y + 75, 90, 34, item.val === this.timeLimit ? 0x4CAF50 : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 75, item.label, {
                fontSize: '16px', fill: '#ffffff', fontFamily: 'Arial'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.timeLimit = item.val;
                this.updateTimeButtons(timeValues);
            });

            this.timeBtns.push({ btn, txt, val: item.val });
            this.addToContainer(btn, txt);
            this.timeValueElements.push(btn, txt);
        });

        // Initially hide time controls
        this.timeValueElements.forEach(el => el.setVisible(false));

        // Mode toggle handlers
        this.goalModeBtn.on('pointerdown', () => {
            this.matchMode = 'goals';
            this.goalModeBtn.setFillStyle(0x4CAF50);
            this.timeModeBtn.setFillStyle(0x555555);
            this.goalValueElements.forEach(el => el.setVisible(true));
            this.timeValueElements.forEach(el => el.setVisible(false));
        });

        this.timeModeBtn.on('pointerdown', () => {
            this.matchMode = 'time';
            this.timeModeBtn.setFillStyle(0x4CAF50);
            this.goalModeBtn.setFillStyle(0x555555);
            this.timeValueElements.forEach(el => el.setVisible(true));
            this.goalValueElements.forEach(el => el.setVisible(false));
        });

        return y + 120;
    }

    updateGoalButtons() {
        this.goalBtns.forEach(({ btn, val }) => {
            btn.setFillStyle(val === this.goalLimit ? 0x4CAF50 : 0x444444);
        });
    }

    updateTimeButtons(timeValues) {
        this.timeBtns.forEach(({ btn, val }) => {
            btn.setFillStyle(val === this.timeLimit ? 0x4CAF50 : 0x444444);
        });
    }

    // ==========================================================
    // CAR SPEED SELECTOR
    // ==========================================================
    createCarSpeedSelector(x, y) {
        const label = this.add.text(x, y, 'Car Speed', {
            fontSize: '20px', fill: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(label);

        const options = GAME_CONFIG.SPEED_OPTIONS;
        const totalWidth = (options.length - 1) * 120;
        const startX = x - totalWidth / 2;

        this.speedBtns = [];
        options.forEach((opt, i) => {
            const bx = startX + i * 120;
            const isSelected = opt.label === this.carSpeed;
            const btn = this.add.rectangle(bx, y + 30, 100, 34, isSelected ? 0x00BCD4 : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 30, opt.label, {
                fontSize: '14px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.carSpeed = opt.label;
                this.updateSpeedButtons();
            });

            this.speedBtns.push({ btn, txt, label: opt.label });
            this.addToContainer(btn, txt);
        });

        return y + 75;
    }

    updateSpeedButtons() {
        this.speedBtns.forEach(({ btn, label }) => {
            btn.setFillStyle(label === this.carSpeed ? 0x00BCD4 : 0x444444);
        });
    }

    // ==========================================================
    // BALL GRAVITY SELECTOR
    // ==========================================================
    createBallGravitySelector(x, y) {
        const label = this.add.text(x, y, 'Ball Gravity', {
            fontSize: '20px', fill: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(label);

        const options = GAME_CONFIG.GRAVITY_OPTIONS;
        const totalWidth = (options.length - 1) * 120;
        const startX = x - totalWidth / 2;

        this.gravBtns = [];
        options.forEach((opt, i) => {
            const bx = startX + i * 120;
            const isSelected = opt.value === this.ballGravity;
            const btn = this.add.rectangle(bx, y + 30, 100, 34, isSelected ? 0x9C27B0 : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 30, opt.label, {
                fontSize: '14px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.ballGravity = opt.value;
                this.updateGravButtons();
            });

            this.gravBtns.push({ btn, txt, value: opt.value });
            this.addToContainer(btn, txt);
        });

        return y + 75;
    }

    updateGravButtons() {
        this.gravBtns.forEach(({ btn, value }) => {
            btn.setFillStyle(value === this.ballGravity ? 0x9C27B0 : 0x444444);
        });
    }

    // ==========================================================
    // BOOST REGEN SELECTOR
    // ==========================================================
    createBoostRegenSelector(x, y) {
        const label = this.add.text(x, y, 'Boost Regen', {
            fontSize: '20px', fill: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(label);

        const options = GAME_CONFIG.BOOST_REGEN_OPTIONS;
        const totalWidth = (options.length - 1) * 120;
        const startX = x - totalWidth / 2;

        this.boostRegenBtns = [];
        options.forEach((opt, i) => {
            const bx = startX + i * 120;
            const isSelected = opt.label === this.boostRegen;
            const btn = this.add.rectangle(bx, y + 30, 100, 34, isSelected ? 0xFF6F00 : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 30, opt.label, {
                fontSize: '14px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.boostRegen = opt.label;
                this.updateBoostRegenButtons();
            });

            this.boostRegenBtns.push({ btn, txt, label: opt.label });
            this.addToContainer(btn, txt);
        });

        return y + 75;
    }

    updateBoostRegenButtons() {
        this.boostRegenBtns.forEach(({ btn, label }) => {
            btn.setFillStyle(label === this.boostRegen ? 0xFF6F00 : 0x444444);
        });
    }

    // ==========================================================
    // CAR SIZE SELECTOR
    // ==========================================================
    createCarSizeSelector(x, y) {
        const label = this.add.text(x, y, 'Car Size', {
            fontSize: '20px', fill: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(label);

        const options = GAME_CONFIG.CAR_SIZE_OPTIONS;
        const totalWidth = (options.length - 1) * 120;
        const startX = x - totalWidth / 2;

        this.carSizeBtns = [];
        options.forEach((opt, i) => {
            const bx = startX + i * 120;
            const isSelected = opt.label === this.carSize;
            const btn = this.add.rectangle(bx, y + 30, 100, 34, isSelected ? 0x66BB6A : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 30, opt.label, {
                fontSize: '14px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.carSize = opt.label;
                this.updateCarSizeButtons();
            });

            this.carSizeBtns.push({ btn, txt, label: opt.label });
            this.addToContainer(btn, txt);
        });

        return y + 75;
    }

    updateCarSizeButtons() {
        this.carSizeBtns.forEach(({ btn, label }) => {
            btn.setFillStyle(label === this.carSize ? 0x66BB6A : 0x444444);
        });
    }

    // ==========================================================
    // BALL SIZE SELECTOR
    // ==========================================================
    createBallSizeSelector(x, y) {
        const label = this.add.text(x, y, 'Ball Size', {
            fontSize: '20px', fill: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(label);

        const options = GAME_CONFIG.BALL_SIZE_OPTIONS;
        const totalWidth = (options.length - 1) * 105;
        const startX = x - totalWidth / 2;

        this.ballSizeBtns = [];
        options.forEach((opt, i) => {
            const bx = startX + i * 105;
            const isSelected = opt.label === this.ballSize;
            const btn = this.add.rectangle(bx, y + 30, 88, 34, isSelected ? 0x42A5F5 : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 30, opt.label, {
                fontSize: '14px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.ballSize = opt.label;
                this.updateBallSizeButtons();
            });

            this.ballSizeBtns.push({ btn, txt, label: opt.label });
            this.addToContainer(btn, txt);
        });

        return y + 75;
    }

    updateBallSizeButtons() {
        this.ballSizeBtns.forEach(({ btn, label }) => {
            btn.setFillStyle(label === this.ballSize ? 0x42A5F5 : 0x444444);
        });
    }

    // ==========================================================
    // CAR STYLE SELECTOR
    // ==========================================================
    createCarStyleSelector(x, y) {
        const label = this.add.text(x, y, 'Car Style', {
            fontSize: '20px', fill: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(label);

        const options = GAME_CONFIG.CAR_STYLE_OPTIONS;
        const totalWidth = (options.length - 1) * 95;
        const startX = x - totalWidth / 2;

        this.carStyleBtns = [];
        options.forEach((opt, i) => {
            const bx = startX + i * 95;
            const isSelected = opt.label === this.carStyle;
            const btnColor = opt.tint ? opt.tint : 0x888888;
            const btn = this.add.rectangle(bx, y + 30, 82, 34, isSelected ? btnColor : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 30, opt.label, {
                fontSize: '13px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.carStyle = opt.label;
                this.updateCarStyleButtons();
            });

            this.carStyleBtns.push({ btn, txt, label: opt.label, color: btnColor });
            this.addToContainer(btn, txt);
        });

        return y + 75;
    }

    updateCarStyleButtons() {
        this.carStyleBtns.forEach(({ btn, label, color }) => {
            btn.setFillStyle(label === this.carStyle ? color : 0x444444);
        });
    }

    // ==========================================================
    // GOAL EXPLOSION SELECTOR
    // ==========================================================
    createGoalExplosionSelector(x, y) {
        const label = this.add.text(x, y, 'Goal Explosion', {
            fontSize: '20px', fill: '#cccccc', fontFamily: 'Arial'
        }).setOrigin(0.5);
        this.addToContainer(label);

        const options = GAME_CONFIG.GOAL_EXPLOSION_OPTIONS;
        const totalWidth = (options.length - 1) * 110;
        const startX = x - totalWidth / 2;

        this.explosionBtns = [];
        options.forEach((opt, i) => {
            const bx = startX + i * 110;
            const isSelected = opt.label === this.goalExplosion;
            const btn = this.add.rectangle(bx, y + 30, 95, 34, isSelected ? 0xF44336 : 0x444444)
                .setInteractive({ useHandCursor: true });
            const txt = this.add.text(bx, y + 30, opt.label, {
                fontSize: '13px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
            }).setOrigin(0.5);

            btn.on('pointerdown', () => {
                this.goalExplosion = opt.label;
                this.updateExplosionButtons();
            });

            this.explosionBtns.push({ btn, txt, label: opt.label });
            this.addToContainer(btn, txt);
        });

        return y + 75;
    }

    updateExplosionButtons() {
        this.explosionBtns.forEach(({ btn, label }) => {
            btn.setFillStyle(label === this.goalExplosion ? 0xF44336 : 0x444444);
        });
    }

    // ==========================================================
    // START BUTTON (fixed at bottom)
    // ==========================================================
    createStartButton(x, y) {
        const startBtn = this.add.rectangle(x, y, 240, 55, 0x2196F3)
            .setInteractive({ useHandCursor: true }).setDepth(100);
        const startText = this.add.text(x, y, 'START MATCH', {
            fontSize: '24px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
        }).setOrigin(0.5).setDepth(100);

        startBtn.on('pointerover', () => startBtn.setFillStyle(0x42A5F5));
        startBtn.on('pointerout', () => startBtn.setFillStyle(0x2196F3));
        startBtn.on('pointerdown', () => {
            this.scene.start('GameScene', {
                mapName: this.mapName,
                matchMode: this.matchMode,
                goalLimit: this.matchMode === 'goals' ? this.goalLimit : null,
                timeLimit: this.matchMode === 'time' ? this.timeLimit : null,
                difficulty: this.difficulty,
                ballGravity: this.ballGravity,
                carSpeed: this.carSpeed,
                boostRegen: this.boostRegen,
                carSize: this.carSize,
                ballSize: this.ballSize,
                gameMode: this.gameMode,
                carStyle: this.carStyle,
                goalExplosion: this.goalExplosion
            });
        });
    }

    // ==========================================================
    // BACK BUTTON (fixed at top-left)
    // ==========================================================
    createBackButton(x, y) {
        const backBtn = this.add.text(x, y, '< Back', {
            fontSize: '18px', fill: '#888888', fontFamily: 'Arial'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(100);

        backBtn.on('pointerover', () => backBtn.setFill('#ffffff'));
        backBtn.on('pointerout', () => backBtn.setFill('#888888'));
        backBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}
