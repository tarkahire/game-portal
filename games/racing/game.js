const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// ── Constants ──
const TRACK_PADDING = 80;
const MAX_SPEED = 8;
const ACCELERATION = 0.12;
const BRAKE_FORCE = 0.15;
const FRICTION = 0.02;
const TURN_SPEED = 0.04;
const DRIFT_FRICTION = 0.008;
const DRIFT_TURN = 0.06;
const TOTAL_LAPS = 3;
const AI_COUNT = 5;

// ── State ──
let gameState = 'menu';
let raceMode = 'race'; // 'race', 'timetrial', or 'crash'
let raceTime = 0;
let countdown = 0;
let countdownTimer = 0;

const keys = {};
window.addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; if (['arrowup','arrowdown','arrowleft','arrowright',' '].includes(e.key.toLowerCase() || e.key)) e.preventDefault(); });
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// ── Track Definition (oval with chicane) ──
function buildTrack() {
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const rx = canvas.width * 0.38;
    const ry = canvas.height * 0.35;
    const points = [];
    const segments = 120;
    for (let i = 0; i < segments; i++) {
        const a = (i / segments) * Math.PI * 2;
        // Add chicane wobble on the straights
        let wobbleX = 0, wobbleY = 0;
        if (Math.abs(Math.sin(a)) > 0.8) {
            wobbleX = Math.sin(a * 3) * 40;
        }
        if (Math.abs(Math.cos(a)) > 0.8) {
            wobbleY = Math.cos(a * 3) * 30;
        }
        points.push({
            x: cx + Math.cos(a) * rx + wobbleX,
            y: cy + Math.sin(a) * ry + wobbleY,
        });
    }
    return points;
}

let trackPoints = buildTrack();
const TRACK_WIDTH = 80;

// ── Checkpoint/Lap System ──
function getCheckpointIndex(car) {
    let closest = 0, closestDist = Infinity;
    for (let i = 0; i < trackPoints.length; i++) {
        const dx = car.x - trackPoints[i].x;
        const dy = car.y - trackPoints[i].y;
        const d = dx * dx + dy * dy;
        if (d < closestDist) { closestDist = d; closest = i; }
    }
    return closest;
}

// ── Car Class ──
class Car {
    constructor(color, isPlayer) {
        this.color = color;
        this.isPlayer = isPlayer;
        this.x = 0; this.y = 0;
        this.angle = 0;
        this.speed = 0;
        this.lap = 0;
        this.checkpoint = 0;
        this.lastCheckpoint = 0;
        this.finished = false;
        this.drifting = false;
        this.driftTrail = [];
        this.finishTime = 0;
        this.health = 100;
        this.dead = false;
        this.hitFlash = 0;
    }

    reset(startIndex) {
        if (raceMode === 'crash') {
            this.resetArena(startIndex);
            return;
        }
        const p = trackPoints[startIndex % trackPoints.length];
        const nextP = trackPoints[(startIndex + 1) % trackPoints.length];
        this.x = p.x;
        this.y = p.y;
        this.angle = Math.atan2(nextP.y - p.y, nextP.x - p.x);
        this.speed = 0;
        this.lap = 0;
        this.checkpoint = startIndex % trackPoints.length;
        this.lastCheckpoint = startIndex % trackPoints.length;
        this.finished = false;
        this.drifting = false;
        this.driftTrail = [];
        this.finishTime = 0;
        this.health = 100;
        this.dead = false;
        this.hitFlash = 0;
    }

    resetArena(index) {
        const cx = canvas.width / 2, cy = canvas.height / 2;
        const r = Math.min(canvas.width, canvas.height) * 0.3;
        const a = (index / (AI_COUNT + 1)) * Math.PI * 2;
        this.x = cx + Math.cos(a) * r;
        this.y = cy + Math.sin(a) * r;
        this.angle = Math.atan2(cy - this.y, cx - this.x);
        this.speed = 0;
        this.lap = 0; this.checkpoint = 0; this.lastCheckpoint = 0;
        this.finished = false; this.drifting = false; this.driftTrail = [];
        this.finishTime = 0; this.health = 100; this.dead = false; this.hitFlash = 0;
    }

    update() {
        if (this.dead) return;
        if (this.hitFlash > 0) this.hitFlash--;
        if (this.finished) {
            this.speed *= 0.95;
            this.x += Math.cos(this.angle) * this.speed;
            this.y += Math.sin(this.angle) * this.speed;
            return;
        }

        if (this.isPlayer) {
            this.handlePlayerInput();
        } else {
            this.handleAI();
        }

        // Apply speed
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;

        // Boundaries
        if (raceMode === 'crash') {
            this.constrainToArena();
        } else {
            this.constrainToTrack();
        }

        if (raceMode === 'crash') return; // skip lap logic in crash mode

        // Update checkpoint
        const newCp = getCheckpointIndex(this);
        const totalPts = trackPoints.length;
        const diff = newCp - this.lastCheckpoint;

        // Detect crossing the start/finish line (checkpoint 0)
        if (this.lastCheckpoint > totalPts * 0.8 && newCp < totalPts * 0.2) {
            this.lap++;
            if (this.lap >= TOTAL_LAPS) {
                this.finished = true;
                this.finishTime = raceTime;
            }
        }
        // Prevent backwards lap cheating
        if (this.lastCheckpoint < totalPts * 0.2 && newCp > totalPts * 0.8) {
            this.lap = Math.max(0, this.lap - 1);
        }

        this.lastCheckpoint = newCp;
        this.checkpoint = newCp;

        // Drift trail
        if (this.drifting && Math.abs(this.speed) > 2) {
            this.driftTrail.push({ x: this.x, y: this.y, life: 40 });
        }
        for (let i = this.driftTrail.length - 1; i >= 0; i--) {
            this.driftTrail[i].life--;
            if (this.driftTrail[i].life <= 0) this.driftTrail.splice(i, 1);
        }
    }

    handlePlayerInput() {
        if (countdown > 0) return;
        const accel = keys['w'] || keys['arrowup'];
        const brake = keys['s'] || keys['arrowdown'];
        const left = keys['a'] || keys['arrowleft'];
        const right = keys['d'] || keys['arrowright'];
        const drift = keys[' '];

        this.drifting = drift && Math.abs(this.speed) > 2;

        if (accel) this.speed = Math.min(this.speed + ACCELERATION, MAX_SPEED);
        if (brake) this.speed = Math.max(this.speed - BRAKE_FORCE, -MAX_SPEED * 0.4);

        // Friction
        if (!accel && !brake) {
            if (this.speed > 0) this.speed = Math.max(0, this.speed - FRICTION);
            else this.speed = Math.min(0, this.speed + FRICTION);
        }

        // Steering (only when moving)
        if (Math.abs(this.speed) > 0.3) {
            const turnMult = this.drifting ? DRIFT_TURN : TURN_SPEED;
            const speedFactor = Math.min(Math.abs(this.speed) / MAX_SPEED, 1);
            if (left) this.angle -= turnMult * speedFactor;
            if (right) this.angle += turnMult * speedFactor;
        }

        // Drift friction (less grip)
        if (this.drifting) {
            this.speed *= (1 - DRIFT_FRICTION);
        }
    }

    handleAI() {
        if (countdown > 0) return;

        if (raceMode === 'crash') {
            this.handleCrashAI();
            return;
        }

        // Look ahead on track and steer toward it
        const lookAhead = 8;
        const targetIdx = (this.checkpoint + lookAhead) % trackPoints.length;
        const target = trackPoints[targetIdx];
        const dx = target.x - this.x;
        const dy = target.y - this.y;
        const targetAngle = Math.atan2(dy, dx);

        // Steer toward target
        let angleDiff = targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const steerStrength = 0.05 + Math.random() * 0.01;
        if (angleDiff > 0.05) this.angle += steerStrength;
        else if (angleDiff < -0.05) this.angle -= steerStrength;

        // Speed control — slow down for turns
        const turnSharpness = Math.abs(angleDiff);
        const targetSpeed = turnSharpness > 0.5 ? MAX_SPEED * 0.55 : MAX_SPEED * (0.75 + Math.random() * 0.15);
        if (this.speed < targetSpeed) this.speed += ACCELERATION * 0.9;
        else this.speed *= 0.97;

        this.drifting = turnSharpness > 0.8 && this.speed > 3;
    }

    handleCrashAI() {
        // Find closest alive enemy to ram
        let closest = null, closestDist = Infinity;
        for (const car of allCars) {
            if (car === this || car.dead) continue;
            const dx = car.x - this.x, dy = car.y - this.y;
            const d = dx * dx + dy * dy;
            if (d < closestDist) { closestDist = d; closest = car; }
        }
        if (!closest) return;

        const dx = closest.x - this.x, dy = closest.y - this.y;
        const targetAngle = Math.atan2(dy, dx);

        let angleDiff = targetAngle - this.angle;
        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const steer = 0.055 + Math.random() * 0.015;
        if (angleDiff > 0.05) this.angle += steer;
        else if (angleDiff < -0.05) this.angle -= steer;

        // Full speed toward target
        this.speed = Math.min(this.speed + ACCELERATION, MAX_SPEED * 0.9);

        // Occasionally dodge
        if (Math.sqrt(closestDist) < 80 && Math.random() < 0.02) {
            this.angle += (Math.random() > 0.5 ? 1 : -1) * 0.5;
        }
    }

    constrainToTrack() {
        // Find closest track point
        let closest = 0, closestDist = Infinity;
        for (let i = 0; i < trackPoints.length; i++) {
            const dx = this.x - trackPoints[i].x;
            const dy = this.y - trackPoints[i].y;
            const d = dx * dx + dy * dy;
            if (d < closestDist) { closestDist = d; closest = i; }
        }
        const dist = Math.sqrt(closestDist);
        if (dist > TRACK_WIDTH * 0.5) {
            // Push back and slow down (off-track penalty)
            const tp = trackPoints[closest];
            const pushAngle = Math.atan2(this.y - tp.y, this.x - tp.x);
            this.x = tp.x + Math.cos(pushAngle) * TRACK_WIDTH * 0.48;
            this.y = tp.y + Math.sin(pushAngle) * TRACK_WIDTH * 0.48;
            this.speed *= 0.92; // grass slowdown
        }
    }

    constrainToArena() {
        const pad = 60;
        const bounceForce = 0.7;
        if (this.x < pad) { this.x = pad; this.speed *= -bounceForce; this.takeDamage(3); }
        if (this.x > canvas.width - pad) { this.x = canvas.width - pad; this.speed *= -bounceForce; this.takeDamage(3); }
        if (this.y < pad) { this.y = pad; this.speed *= -bounceForce; this.takeDamage(3); }
        if (this.y > canvas.height - pad) { this.y = canvas.height - pad; this.speed *= -bounceForce; this.takeDamage(3); }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.hitFlash = 8;
        if (this.health <= 0) {
            this.health = 0;
            this.dead = true;
            // Explosion particles
            for (let i = 0; i < 20; i++) {
                const a = Math.random() * Math.PI * 2;
                const s = 2 + Math.random() * 5;
                crashParticles.push({ x: this.x, y: this.y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
                    life: 20 + Math.random() * 20, maxLife: 40,
                    color: Math.random() > 0.5 ? '#ff6600' : '#ffcc00' });
            }
            // Debris
            for (let i = 0; i < 10; i++) {
                crashParticles.push({ x: this.x, y: this.y,
                    vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8,
                    life: 30 + Math.random() * 20, maxLife: 50,
                    color: this.color });
            }
        }
    }

    draw() {
        if (this.dead) return;
        // Drift trail
        for (const t of this.driftTrail) {
            ctx.globalAlpha = t.life / 40 * 0.3;
            ctx.fillStyle = '#333';
            ctx.beginPath(); ctx.arc(t.x, t.y, 3, 0, Math.PI * 2); ctx.fill();
        }
        ctx.globalAlpha = 1;

        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        // Car shadow
        ctx.fillStyle = 'rgba(0,0,0,0.3)';
        ctx.fillRect(-14, -7, 28, 16);

        // Car body
        ctx.fillStyle = this.color;
        ctx.fillRect(-15, -8, 30, 16);

        // Windshield
        ctx.fillStyle = 'rgba(100,180,255,0.6)';
        ctx.fillRect(4, -6, 8, 12);

        // Wheels
        ctx.fillStyle = '#222';
        ctx.fillRect(-12, -10, 7, 3);
        ctx.fillRect(-12, 7, 7, 3);
        ctx.fillRect(6, -10, 7, 3);
        ctx.fillRect(6, 7, 7, 3);

        // Headlights
        ctx.fillStyle = '#ffe066';
        ctx.fillRect(13, -5, 3, 3);
        ctx.fillRect(13, 2, 3, 3);

        // Brake lights (when braking)
        if ((this.isPlayer && (keys['s'] || keys['arrowdown'])) || this.speed < 0) {
            ctx.fillStyle = '#ff3333';
            ctx.fillRect(-16, -5, 2, 3);
            ctx.fillRect(-16, 2, 2, 3);
        }

        ctx.restore();

        // Player indicator
        if (this.isPlayer) {
            ctx.fillStyle = '#fff';
            ctx.font = '10px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('YOU', this.x, this.y - 16);
        }
    }
}

// ── Create Cars ──
const playerCar = new Car('#e74c3c', true);
const aiCars = [];
const AI_COLORS = ['#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
for (let i = 0; i < AI_COUNT; i++) {
    aiCars.push(new Car(AI_COLORS[i % AI_COLORS.length], false));
}
const allCars = [playerCar, ...aiCars];
const crashParticles = [];

function resetRace() {
    trackPoints = buildTrack();
    for (let i = 0; i < allCars.length; i++) {
        // Stagger start positions along the track
        allCars[i].reset(i * 3);
    }
    raceTime = 0;
    countdown = 3;
    countdownTimer = 0;
}

// ── Drawing ──
function handleCrashCollisions() {
    for (let i = 0; i < allCars.length; i++) {
        for (let j = i + 1; j < allCars.length; j++) {
            const a = allCars[i], b = allCars[j];
            if (a.dead || b.dead) continue;
            const dx = b.x - a.x, dy = b.y - a.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 28) {
                // Collision! Damage based on relative speed
                const relSpeed = Math.abs(a.speed) + Math.abs(b.speed);
                const damage = Math.max(3, relSpeed * 3);
                a.takeDamage(damage);
                b.takeDamage(damage);

                // Bounce apart
                const nx = dx / dist, ny = dy / dist;
                const pushForce = 4;
                a.x -= nx * pushForce; a.y -= ny * pushForce;
                b.x += nx * pushForce; b.y += ny * pushForce;

                // Exchange speed
                const tempSpeed = a.speed;
                a.speed = b.speed * 0.7;
                b.speed = tempSpeed * 0.7;

                // Spark particles at collision point
                const cx = (a.x + b.x) / 2, cy = (a.y + b.y) / 2;
                for (let p = 0; p < 8; p++) {
                    const pa = Math.random() * Math.PI * 2;
                    const ps = 2 + Math.random() * 4;
                    crashParticles.push({ x: cx, y: cy, vx: Math.cos(pa) * ps, vy: Math.sin(pa) * ps,
                        life: 10 + Math.random() * 10, maxLife: 20,
                        color: Math.random() > 0.5 ? '#ffcc00' : '#ff8800' });
                }
            }
        }
    }
}

function updateCrashParticles() {
    for (let i = crashParticles.length - 1; i >= 0; i--) {
        const p = crashParticles[i];
        p.x += p.vx; p.y += p.vy;
        p.vx *= 0.96; p.vy *= 0.96;
        p.life--;
        if (p.life <= 0) crashParticles.splice(i, 1);
    }
}

function drawCrashParticles() {
    for (const p of crashParticles) {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = p.color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 2 + (p.life / p.maxLife) * 4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.globalAlpha = 1;
}

function drawArena() {
    // Dark ground
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Arena floor
    const pad = 60;
    ctx.fillStyle = '#333';
    ctx.fillRect(pad, pad, canvas.width - pad * 2, canvas.height - pad * 2);

    // Tire marks / dirt texture
    ctx.fillStyle = '#3a3a3a';
    for (let i = 0; i < 20; i++) {
        const rx = pad + Math.random() * (canvas.width - pad * 2);
        const ry = pad + Math.random() * (canvas.height - pad * 2);
        ctx.beginPath(); ctx.arc(rx, ry, 5 + Math.random() * 15, 0, Math.PI * 2); ctx.fill();
    }

    // Barriers — red/white stripes
    const stripeW = 30;
    for (let x = 0; x < canvas.width; x += stripeW) {
        ctx.fillStyle = (Math.floor(x / stripeW) % 2 === 0) ? '#cc0000' : '#fff';
        ctx.fillRect(x, 0, stripeW, pad * 0.6);
        ctx.fillRect(x, canvas.height - pad * 0.6, stripeW, pad * 0.6);
    }
    for (let y = 0; y < canvas.height; y += stripeW) {
        ctx.fillStyle = (Math.floor(y / stripeW) % 2 === 0) ? '#cc0000' : '#fff';
        ctx.fillRect(0, y, pad * 0.6, stripeW);
        ctx.fillRect(canvas.width - pad * 0.6, y, pad * 0.6, stripeW);
    }

    // Corner posts
    ctx.fillStyle = '#ff0000';
    ctx.beginPath(); ctx.arc(pad, pad, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(canvas.width - pad, pad, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(pad, canvas.height - pad, 10, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(canvas.width - pad, canvas.height - pad, 10, 0, Math.PI * 2); ctx.fill();
}

function drawHealthBars() {
    if (raceMode !== 'crash') return;
    const barW = 30, barH = 4;
    for (const car of allCars) {
        if (car.dead) continue;
        const hpRatio = car.health / 100;
        const bx = car.x - barW / 2, by = car.y - 22;
        ctx.fillStyle = '#333'; ctx.fillRect(bx, by, barW, barH);
        ctx.fillStyle = hpRatio > 0.5 ? '#2ecc71' : hpRatio > 0.25 ? '#f39c12' : '#e74c3c';
        ctx.fillRect(bx, by, barW * hpRatio, barH);
    }
}

function drawTrack() {
    // Grass background
    ctx.fillStyle = '#2d5a1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Track surface
    ctx.strokeStyle = '#444';
    ctx.lineWidth = TRACK_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
    for (let i = 1; i < trackPoints.length; i++) {
        ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
    }
    ctx.closePath();
    ctx.stroke();

    // Track borders (white lines)
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = TRACK_WIDTH + 4;
    ctx.globalAlpha = 0.15;
    ctx.beginPath();
    ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
    for (let i = 1; i < trackPoints.length; i++) {
        ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.globalAlpha = 1;

    // Center dashes
    ctx.strokeStyle = '#666';
    ctx.lineWidth = 2;
    ctx.setLineDash([15, 15]);
    ctx.beginPath();
    ctx.moveTo(trackPoints[0].x, trackPoints[0].y);
    for (let i = 1; i < trackPoints.length; i++) {
        ctx.lineTo(trackPoints[i].x, trackPoints[i].y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.setLineDash([]);

    // Start/finish line
    const sp = trackPoints[0];
    const sp2 = trackPoints[1];
    const startAngle = Math.atan2(sp2.y - sp.y, sp2.x - sp.x) + Math.PI / 2;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(sp.x + Math.cos(startAngle) * TRACK_WIDTH * 0.45, sp.y + Math.sin(startAngle) * TRACK_WIDTH * 0.45);
    ctx.lineTo(sp.x - Math.cos(startAngle) * TRACK_WIDTH * 0.45, sp.y - Math.sin(startAngle) * TRACK_WIDTH * 0.45);
    ctx.stroke();

    // Checkerboard pattern at start
    const checkSize = 6;
    for (let r = 0; r < 3; r++) {
        for (let c = -3; c <= 3; c++) {
            const offX = Math.cos(Math.atan2(sp2.y - sp.y, sp2.x - sp.x)) * (r - 1) * checkSize;
            const offY = Math.sin(Math.atan2(sp2.y - sp.y, sp2.x - sp.x)) * (r - 1) * checkSize;
            const perpX = Math.cos(startAngle) * c * checkSize;
            const perpY = Math.sin(startAngle) * c * checkSize;
            ctx.fillStyle = (r + c) % 2 === 0 ? '#fff' : '#111';
            ctx.fillRect(sp.x + perpX + offX - checkSize / 2, sp.y + perpY + offY - checkSize / 2, checkSize, checkSize);
        }
    }
}

function drawMinimap() {
    const mmSize = 120;
    const mmX = canvas.width - mmSize - 16;
    const mmY = canvas.height - mmSize - 16;

    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(mmX - 4, mmY - 4, mmSize + 8, mmSize + 8);

    // Scale track to minimap
    const scaleX = mmSize / canvas.width;
    const scaleY = mmSize / canvas.height;

    // Track line
    ctx.strokeStyle = '#555';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < trackPoints.length; i++) {
        const mx = mmX + trackPoints[i].x * scaleX;
        const my = mmY + trackPoints[i].y * scaleY;
        if (i === 0) ctx.moveTo(mx, my); else ctx.lineTo(mx, my);
    }
    ctx.closePath();
    ctx.stroke();

    // Cars on minimap
    for (const car of allCars) {
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.arc(mmX + car.x * scaleX, mmY + car.y * scaleY, car.isPlayer ? 4 : 2.5, 0, Math.PI * 2);
        ctx.fill();
    }
}

function getPlayerPosition() {
    // Sort by laps (desc), then checkpoint progress (desc)
    const sorted = [...allCars].sort((a, b) => {
        if (a.finished && !b.finished) return -1;
        if (!a.finished && b.finished) return 1;
        if (a.lap !== b.lap) return b.lap - a.lap;
        return b.checkpoint - a.checkpoint;
    });
    const pos = sorted.indexOf(playerCar) + 1;
    const suffix = pos === 1 ? 'st' : pos === 2 ? 'nd' : pos === 3 ? 'rd' : 'th';
    return pos + suffix;
}

function formatTime(frames) {
    const seconds = frames / 60;
    const mins = Math.floor(seconds / 60);
    const secs = (seconds % 60).toFixed(1);
    return `${mins}:${secs.padStart(4, '0')}`;
}

function updateHUD() {
    const speed = Math.abs(playerCar.speed) / MAX_SPEED * 280;
    document.getElementById('speed-display').innerHTML = Math.floor(speed) + ' <span>KM/H</span>';
    document.getElementById('lap-display').textContent = `Lap ${Math.min(playerCar.lap + 1, TOTAL_LAPS)}/${TOTAL_LAPS}`;
    document.getElementById('time-display').textContent = formatTime(raceTime);
    document.getElementById('position-display').textContent = raceMode === 'race' ? getPlayerPosition() : '';
}

// ── Countdown ──
function drawCountdown() {
    if (countdown <= 0) return;
    ctx.font = 'bold 100px "Segoe UI",Arial,sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = countdown <= 0.5 ? '#2ecc71' : '#fff';
    ctx.shadowColor = countdown <= 0.5 ? '#2ecc71' : '#e74c3c';
    ctx.shadowBlur = 30;
    const text = countdown <= 0.5 ? 'GO!' : Math.ceil(countdown).toString();
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.shadowBlur = 0;
}

// ── Game Loop ──
function gameLoop() {
    requestAnimationFrame(gameLoop);

    if (gameState === 'menu') {
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        return;
    }

    if (gameState !== 'racing') return;

    // Countdown
    if (countdown > 0) {
        countdownTimer++;
        if (countdownTimer >= 60) { countdownTimer = 0; countdown--; }
    } else {
        raceTime++;
    }

    // Update all cars
    for (const car of allCars) car.update();

    // Crash mode collision detection
    if (raceMode === 'crash') {
        handleCrashCollisions();
        updateCrashParticles();

        // Check crash mode end — last car standing
        const alive = allCars.filter(c => !c.dead);
        if (playerCar.dead || alive.length <= 1) {
            endRace();
            return;
        }
    }

    // Check race end (non-crash modes)
    if (raceMode !== 'crash') {
        if (playerCar.finished) {
            endRace();
            return;
        }
        if (raceMode === 'race') {
            const allAIDone = aiCars.every(c => c.finished);
            if (allAIDone && !playerCar.finished) {
                playerCar.finished = true;
                playerCar.finishTime = raceTime;
                endRace();
                return;
            }
        }
    }

    // Draw
    if (raceMode === 'crash') {
        drawArena();
    } else {
        drawTrack();
    }
    for (const car of allCars) car.draw();
    if (raceMode === 'crash') {
        drawCrashParticles();
        drawHealthBars();
        // Cars remaining counter
        const alive = allCars.filter(c => !c.dead).length;
        ctx.font = 'bold 20px "Segoe UI",sans-serif'; ctx.textAlign = 'center';
        ctx.fillStyle = '#e74c3c'; ctx.fillText(alive + ' cars remaining', canvas.width / 2, 30);
    } else {
        drawMinimap();
    }
    drawCountdown();
    updateHUD();
}

function endRace() {
    gameState = 'result';
    document.getElementById('hud').style.display = 'none';
    document.getElementById('result-screen').classList.remove('hidden');
    if (raceMode === 'crash') {
        if (!playerCar.dead) {
            document.getElementById('result-text').textContent = 'LAST CAR STANDING!';
        } else {
            const alive = allCars.filter(c => !c.dead).length;
            document.getElementById('result-text').textContent = `WRECKED! ${alive} car${alive !== 1 ? 's' : ''} left`;
        }
        document.getElementById('result-time').textContent = `Survived: ${formatTime(raceTime)}`;
    } else if (raceMode === 'race') {
        const pos = getPlayerPosition();
        document.getElementById('result-text').textContent = pos === '1st' ? 'YOU WIN!' : `You finished ${pos}`;
        document.getElementById('result-time').textContent = `Time: ${formatTime(playerCar.finishTime || raceTime)}`;
    } else {
        document.getElementById('result-text').textContent = 'TIME TRIAL COMPLETE';
        document.getElementById('result-time').textContent = `Time: ${formatTime(playerCar.finishTime || raceTime)}`;
    }
}

function startRace(mode) {
    raceMode = mode;
    if (mode === 'timetrial') {
        // Remove AI in time trial
        aiCars.length = 0;
        allCars.length = 0;
        allCars.push(playerCar);
    } else {
        // Rebuild AI cars
        aiCars.length = 0;
        allCars.length = 0;
        allCars.push(playerCar);
        for (let i = 0; i < AI_COUNT; i++) {
            const car = new Car(AI_COLORS[i % AI_COLORS.length], false);
            aiCars.push(car);
            allCars.push(car);
        }
    }
    crashParticles.length = 0;
    resetRace();
    gameState = 'racing';
    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('result-screen').classList.add('hidden');
    document.getElementById('hud').style.display = 'flex';
}

// ── Event Listeners ──
document.getElementById('start-race-btn').addEventListener('click', () => startRace('race'));
document.getElementById('start-time-btn').addEventListener('click', () => startRace('timetrial'));
document.getElementById('start-crash-btn').addEventListener('click', () => startRace('crash'));
document.getElementById('restart-btn').addEventListener('click', () => {
    document.getElementById('result-screen').classList.add('hidden');
    startRace(raceMode);
});

gameLoop();
