// Bot AI — wander, target nearest enemy, move toward and unleash abilities.
import { castAbility, castM1 } from './abilities.js';
import { ARENA_RADIUS, collidesCover } from './arena.js';

const ABILITY_KEYS = ['z', 'x', 'c', 'v', 'f'];

export class BotBrain {
    constructor(fighter) {
        this.fighter = fighter;
        this.target = null;
        this.repathTimer = 0;
        this.wanderAng = Math.random() * Math.PI * 2;
        this.nextAbilityAt = performance.now() + 800 + Math.random() * 1500;
        this.nextM1At = 0;
        this.dodgeUntil = 0;
    }

    pickTarget(fighters) {
        let best = null, bestD = Infinity;
        for (const f of fighters) {
            if (f === this.fighter || !f.alive) continue;
            const dx = f.x - this.fighter.x, dz = f.z - this.fighter.z;
            const d = dx * dx + dz * dz;
            if (d < bestD) { bestD = d; best = f; }
        }
        this.target = best;
    }

    tick(dt, ctx) {
        const f = this.fighter;
        if (!f.alive) return;

        // Re-pick target periodically
        this.repathTimer -= dt;
        if (!this.target || !this.target.alive || this.repathTimer <= 0) {
            this.pickTarget(ctx.fighters);
            this.repathTimer = 1.5 + Math.random();
        }

        // Storm avoidance: if outside the safe zone, head toward center
        const distFromCenter = Math.hypot(f.x, f.z);
        const stormR = ctx.stormRadius ?? ARENA_RADIUS;
        const inStorm = distFromCenter > stormR - 1;

        let mvX = 0, mvZ = 0;

        if (inStorm) {
            // Run toward center
            const len = distFromCenter || 1;
            mvX = -f.x / len;
            mvZ = -f.z / len;
        } else if (this.target) {
            const dx = this.target.x - f.x, dz = this.target.z - f.z;
            const dist = Math.hypot(dx, dz);
            const idealRange = 5 + Math.random() * 4; // strafe at 5-9
            if (dist > idealRange + 1) {
                mvX = dx / (dist || 1);
                mvZ = dz / (dist || 1);
            } else if (dist < idealRange - 2) {
                mvX = -dx / (dist || 1);
                mvZ = -dz / (dist || 1);
            } else {
                // Strafe
                mvX = -dz / (dist || 1) * (Math.sin(performance.now() * 0.001 + this.wanderAng) > 0 ? 1 : -1);
                mvZ =  dx / (dist || 1) * (Math.sin(performance.now() * 0.001 + this.wanderAng) > 0 ? 1 : -1);
            }
            // Face target
            f.yaw = Math.atan2(dx, dz);
        } else {
            // Wander
            this.wanderAng += (Math.random() - 0.5) * 0.4;
            mvX = Math.sin(this.wanderAng);
            mvZ = Math.cos(this.wanderAng);
        }

        // Apply movement (collision-checked)
        const speed = f.speed * (performance.now() < f.buffUntil ? 1.2 : 1);
        const nx = f.x + mvX * speed * dt;
        const nz = f.z + mvZ * speed * dt;
        if (!collidesCover(ctx.cover, nx, f.z, 0.5)) f.x = nx;
        if (!collidesCover(ctx.cover, f.x, nz, 0.5)) f.z = nz;
        // Clamp to outer bounds (don't allow walking off-arena)
        const maxR = ARENA_RADIUS + 5;
        const r = Math.hypot(f.x, f.z);
        if (r > maxR) { f.x = f.x / r * maxR; f.z = f.z / r * maxR; }

        f.vx = mvX * speed;
        f.vz = mvZ * speed;
        f.mesh.position.set(f.x, 0, f.z);

        // Combat
        if (!this.target || !this.target.alive) return;
        const tdx = this.target.x - f.x, tdz = this.target.z - f.z;
        const tdist = Math.hypot(tdx, tdz);
        const dirX = tdx / (tdist || 1), dirZ = tdz / (tdist || 1);

        // M1 if in melee range
        if (tdist < 2.4 && performance.now() > this.nextM1At) {
            castM1(f, { ...ctx, dirX, dirZ });
            this.nextM1At = performance.now() + f.character.attackSpeed + 80;
        }

        // Pick a random off-cooldown ability sometimes
        if (performance.now() > this.nextAbilityAt) {
            const choices = ABILITY_KEYS.filter(k => f.character.abilities[k] && f.canUse(k));
            if (choices.length > 0) {
                const slot = choices[Math.floor(Math.random() * choices.length)];
                const abilityName = f.character.abilities[slot];
                castAbility(abilityName, f, { ...ctx, dirX, dirZ });
                f.triggerCD(slot, f.character.abilityCooldowns[slot] || 5000);
            }
            this.nextAbilityAt = performance.now() + 1200 + Math.random() * 1800;
        }
    }
}
