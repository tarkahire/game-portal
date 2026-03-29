import GAME_CONFIG from '../config/gameConfig.js';

export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: 'BootScene' });
    }

    preload() {
        // Loading text
        const loadingText = this.add.text(
            GAME_CONFIG.GAME_WIDTH / 2,
            GAME_CONFIG.GAME_HEIGHT / 2,
            'Loading...',
            { fontSize: '32px', fill: '#ffffff', fontFamily: 'Arial' }
        ).setOrigin(0.5);

        // Load car sprites (JPGs - white backgrounds will be removed in create())
        this.load.image('blue-car-raw', 'assets/images/blue car.jpg');
        this.load.image('red-car-raw', 'assets/images/red car.jpg');
    }

    /**
     * Remove white/near-white pixels from a loaded texture and create a new
     * transparency-enabled texture under the given cleanKey.
     */
    removeWhiteBackground(rawKey, cleanKey) {
        const sourceTexture = this.textures.get(rawKey);
        const sourceImage = sourceTexture.getSourceImage();
        const w = sourceImage.width;
        const h = sourceImage.height;

        // Draw the source image onto an offscreen canvas
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(sourceImage, 0, 0);

        // Get pixel data and make white/near-white pixels transparent
        const imageData = ctx.getImageData(0, 0, w, h);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            if (r > 230 && g > 230 && b > 230) {
                data[i + 3] = 0; // set alpha to 0 (fully transparent)
            }
        }
        ctx.putImageData(imageData, 0, 0);

        // Register the processed canvas as a new Phaser texture
        this.textures.addCanvas(cleanKey, canvas);
    }

    create() {
        // Remove white backgrounds from car JPGs and create clean textures
        this.removeWhiteBackground('blue-car-raw', 'blue-car');
        this.removeWhiteBackground('red-car-raw', 'red-car');

        // Generate ball texture programmatically
        const r = GAME_CONFIG.BALL_RADIUS;
        const gfx = this.make.graphics({ x: 0, y: 0, add: false });

        // Ball outline
        gfx.fillStyle(GAME_CONFIG.BALL_OUTLINE_COLOR, 1);
        gfx.fillCircle(r + 1, r + 1, r + 1);

        // Ball fill
        gfx.fillStyle(GAME_CONFIG.BALL_COLOR, 1);
        gfx.fillCircle(r + 1, r + 1, r);

        // Add a simple pattern to make it look like a football
        gfx.fillStyle(0x333333, 1);
        gfx.fillCircle(r + 1, r + 1, r * 0.3);

        gfx.generateTexture('ball', (r + 1) * 2, (r + 1) * 2);
        gfx.destroy();

        this.scene.start('MenuScene');
    }
}
