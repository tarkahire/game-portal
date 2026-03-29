export default class ScoreManager {
    constructor(matchMode, goalLimit, timeLimit) {
        this.blueScore = 0;
        this.redScore = 0;
        this.matchMode = matchMode;
        this.goalLimit = goalLimit;
        this.timeLimit = timeLimit;
        this.matchOver = false;
    }

    addGoal(team) {
        if (this.matchOver) return;

        if (team === 'blue') {
            this.blueScore++;
        } else {
            this.redScore++;
        }
    }

    checkWinCondition() {
        if (this.matchMode === 'goals' && this.goalLimit) {
            if (this.blueScore >= this.goalLimit) {
                this.matchOver = true;
                return { over: true, winner: 'blue' };
            }
            if (this.redScore >= this.goalLimit) {
                this.matchOver = true;
                return { over: true, winner: 'red' };
            }
        }
        return { over: false, winner: null };
    }

    checkTimeUp() {
        if (this.matchMode === 'time') {
            this.matchOver = true;
            if (this.blueScore > this.redScore) {
                return { over: true, winner: 'blue' };
            } else if (this.redScore > this.blueScore) {
                return { over: true, winner: 'red' };
            } else {
                return { over: true, winner: 'draw' };
            }
        }
        return { over: false, winner: null };
    }

    getScores() {
        return { blue: this.blueScore, red: this.redScore };
    }
}
