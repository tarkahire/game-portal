export default class MatchTimer {
    constructor(totalSeconds) {
        this.totalTime = totalSeconds;
        this.remainingTime = totalSeconds;
        this.isRunning = false;
    }

    start() {
        this.isRunning = true;
    }

    pause() {
        this.isRunning = false;
    }

    resume() {
        this.isRunning = true;
    }

    update(delta) {
        if (!this.isRunning) return false;

        this.remainingTime -= delta / 1000;

        if (this.remainingTime <= 0) {
            this.remainingTime = 0;
            this.isRunning = false;
            return true; // time is up
        }

        return false;
    }

    getDisplay() {
        const totalSecs = Math.ceil(this.remainingTime);
        const mins = Math.floor(totalSecs / 60);
        const secs = totalSecs % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    isUrgent() {
        return this.remainingTime <= 30;
    }
}
