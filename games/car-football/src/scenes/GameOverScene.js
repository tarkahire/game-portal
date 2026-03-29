import GAME_CONFIG from '../config/gameConfig.js';

export default class GameOverScene extends Phaser.Scene {
    constructor() {
        super({ key: 'GameOverScene' });
    }

    init(data) {
        this.winner = data.winner;
        this.blueScore = data.blueScore;
        this.redScore = data.redScore;
    }

    create() {
        const centerX = GAME_CONFIG.GAME_WIDTH / 2;
        const centerY = GAME_CONFIG.GAME_HEIGHT / 2;

        this.cameras.main.setBackgroundColor('#1a1a2e');

        // Winner text
        let winnerLabel, winnerColor;
        if (this.winner === 'blue') {
            winnerLabel = 'BLUE WINS!';
            winnerColor = '#3366ff';
        } else if (this.winner === 'red') {
            winnerLabel = 'RED WINS!';
            winnerColor = '#ff3333';
        } else {
            winnerLabel = "IT'S A DRAW!";
            winnerColor = '#ffffff';
        }

        this.add.text(centerX, centerY - 100, winnerLabel, {
            fontSize: '56px',
            fill: winnerColor,
            fontFamily: 'Arial',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4
        }).setOrigin(0.5);

        // Final score
        this.add.text(centerX, centerY - 20, `${this.blueScore}  -  ${this.redScore}`, {
            fontSize: '48px',
            fill: '#ffffff',
            fontFamily: 'Arial',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        // Team labels under score
        this.add.text(centerX - 60, centerY + 30, 'BLUE', {
            fontSize: '18px', fill: '#3366ff', fontFamily: 'Arial'
        }).setOrigin(0.5);

        this.add.text(centerX + 60, centerY + 30, 'RED', {
            fontSize: '18px', fill: '#ff3333', fontFamily: 'Arial'
        }).setOrigin(0.5);

        // Play Again button
        const playAgainBtn = this.add.rectangle(centerX - 130, centerY + 110, 200, 50, 0x4CAF50)
            .setInteractive({ useHandCursor: true });
        this.add.text(centerX - 130, centerY + 110, 'PLAY AGAIN', {
            fontSize: '22px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
        }).setOrigin(0.5);

        playAgainBtn.on('pointerover', () => playAgainBtn.setFillStyle(0x66BB6A));
        playAgainBtn.on('pointerout', () => playAgainBtn.setFillStyle(0x4CAF50));
        playAgainBtn.on('pointerdown', () => this.scene.start('SettingsScene'));

        // Main Menu button
        const menuBtn = this.add.rectangle(centerX + 130, centerY + 110, 200, 50, 0x2196F3)
            .setInteractive({ useHandCursor: true });
        this.add.text(centerX + 130, centerY + 110, 'MAIN MENU', {
            fontSize: '22px', fill: '#ffffff', fontFamily: 'Arial', fontStyle: 'bold'
        }).setOrigin(0.5);

        menuBtn.on('pointerover', () => menuBtn.setFillStyle(0x42A5F5));
        menuBtn.on('pointerout', () => menuBtn.setFillStyle(0x2196F3));
        menuBtn.on('pointerdown', () => this.scene.start('MenuScene'));
    }
}
