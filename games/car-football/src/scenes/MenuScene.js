import GAME_CONFIG from '../config/gameConfig.js';

export default class MenuScene extends Phaser.Scene {
    constructor() {
        super({ key: 'MenuScene' });
    }

    create() {
        const centerX = GAME_CONFIG.GAME_WIDTH / 2;
        const centerY = GAME_CONFIG.GAME_HEIGHT / 2;

        // Background
        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Title
        this.add.text(centerX, centerY - 120, 'CAR FOOTBALL', {
            fontSize: '64px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5);

        // Subtitle
        this.add.text(centerX, centerY - 50, '2D Edition', {
            fontSize: '28px',
            fill: '#aaaaaa',
            fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Play button
        const playBtn = this.add.rectangle(centerX, centerY + 50, 220, 60, 0x4CAF50)
            .setInteractive({ useHandCursor: true });

        const playText = this.add.text(centerX, centerY + 50, 'PLAY', {
            fontSize: '32px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        playBtn.on('pointerover', () => playBtn.setFillStyle(0x66BB6A));
        playBtn.on('pointerout', () => playBtn.setFillStyle(0x4CAF50));
        playBtn.on('pointerdown', () => {
            this.scene.start('SettingsScene');
        });

        // Car preview images
        const blueCar = this.add.image(centerX - 150, centerY + 160, 'blue-car')
            .setScale(0.15);
        const redCar = this.add.image(centerX + 150, centerY + 160, 'red-car')
            .setScale(0.15)
            .setFlipX(true);

        this.add.text(centerX, centerY + 220, 'BLUE vs RED', {
            fontSize: '20px',
            fill: '#cccccc',
            fontFamily: 'Arial'
        }).setOrigin(0.5);
    }
}
