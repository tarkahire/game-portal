// ═══════════════════════════════════════════════════════════════
//  BLOX FRUITS — 15 fruits with stats + ability metadata
// ═══════════════════════════════════════════════════════════════

export const CLASSES = {
    dough: {
        name: 'Dough', type: 'special', maxHp: 120, speed: 2.7, attackRange: 35, attackDamage: 10, attackSpeed: 200, attackType: 'melee', color: '#f5f0e0', specialCooldown: 6000, specialName: 'Roller Donut', weaponType: 'fist',
        abilities: { z: 'Roller Donut', x: 'Restless Dough Barrage', c: 'Dough Fist Fusillade', v: 'Unstoppable Dough', f: 'Dough Flight' },
        abilityCooldowns: { z: 6000, x: 8000, c: 12000, v: 15000, f: 1000 }
    },
    dragon: {
        name: 'Dragon', type: 'beast', maxHp: 150, speed: 2.3, attackRange: 40, attackDamage: 14, attackSpeed: 350, attackType: 'melee', color: '#ff6600', specialCooldown: 5000, specialName: 'Fire Breath', weaponType: 'claw',
        abilities: { z: 'Fire Breath', x: 'Dragon Claw', c: 'Fire Shower', v: 'Dragon Transform', f: 'Dragon Flight' },
        abilityCooldowns: { z: 5000, x: 7000, c: 10000, v: 20000, f: 1000 }
    },
    leopard: {
        name: 'Leopard', type: 'beast', maxHp: 100, speed: 3.8, attackRange: 30, attackDamage: 13, attackSpeed: 250, attackType: 'melee', color: '#64ffda', specialCooldown: 4000, specialName: 'Prowl', weaponType: 'claw',
        abilities: { z: 'Prowl Punch', x: 'Spiraling Frenzy', c: 'Predator Leap', v: 'Leopard Transform', f: 'Leopard Rush' },
        abilityCooldowns: { z: 4000, x: 6000, c: 8000, v: 20000, f: 1000 }
    },
    buddha: {
        name: 'Buddha', type: 'beast', maxHp: 200, speed: 1.8, attackRange: 60, attackDamage: 12, attackSpeed: 400, attackType: 'melee', color: '#ffd600', specialCooldown: 5000, specialName: 'Impact', weaponType: 'fist',
        abilities: { z: 'Impact Fist', x: 'Shift', c: 'Heavenly Stomp', v: 'Buddha Transform', f: 'Zen Dash' },
        abilityCooldowns: { z: 5000, x: 6000, c: 10000, v: 20000, f: 2000 }
    },
    light: {
        name: 'Light', type: 'elemental', maxHp: 80, speed: 4.5, attackRange: 180, attackDamage: 12, attackSpeed: 300, attackType: 'melee', color: '#ffeb3b', specialCooldown: 4000, specialName: 'Light Beam', weaponType: 'orb',
        abilities: { z: 'Light Beam', x: 'Barrage of Light', c: 'Light Speed Kick', v: 'Divine Arrow', f: 'Light Flight' },
        abilityCooldowns: { z: 4000, x: 6000, c: 8000, v: 12000, f: 1000 }
    },
    dark: {
        name: 'Dark', type: 'elemental', maxHp: 90, speed: 2.8, attackRange: 150, attackDamage: 13, attackSpeed: 350, attackType: 'melee', color: '#1a1a2e', specialCooldown: 5000, specialName: 'Dark Vortex', weaponType: 'orb',
        abilities: { z: 'Dimensional Slash', x: 'Dark Vortex', c: 'Black Hole', v: 'World of Darkness', f: 'Dark Flight' },
        abilityCooldowns: { z: 5000, x: 7000, c: 10000, v: 15000, f: 1000 }
    },
    flame: {
        name: 'Flame', type: 'elemental', maxHp: 90, speed: 3.0, attackRange: 150, attackDamage: 11, attackSpeed: 350, attackType: 'melee', color: '#ff5722', specialCooldown: 4000, specialName: 'Fire Bullets', weaponType: 'orb',
        abilities: { z: 'Fire Bullets', x: 'Fire Column', c: 'Fire Fist', v: 'Flame Destroyer', f: 'Flame Flight' },
        abilityCooldowns: { z: 4000, x: 6000, c: 8000, v: 12000, f: 1000 }
    },
    ice: {
        name: 'Ice', type: 'elemental', maxHp: 95, speed: 2.8, attackRange: 150, attackDamage: 11, attackSpeed: 380, attackType: 'melee', color: '#4fc3f7', specialCooldown: 5000, specialName: 'Ice Spears', weaponType: 'orb',
        abilities: { z: 'Ice Spears', x: 'Glacial Surge', c: 'Ice Bird', v: 'Absolute Zero', f: 'Ice Flight' },
        abilityCooldowns: { z: 5000, x: 7000, c: 10000, v: 15000, f: 1000 }
    },
    magma: {
        name: 'Magma', type: 'elemental', maxHp: 110, speed: 2.4, attackRange: 140, attackDamage: 14, attackSpeed: 400, attackType: 'melee', color: '#ff3d00', specialCooldown: 5000, specialName: 'Magma Fist', weaponType: 'fist',
        abilities: { z: 'Magma Fist', x: 'Magma Eruption', c: 'Magma Hound', v: 'Volcanic Storm', f: 'Magma Flight' },
        abilityCooldowns: { z: 5000, x: 7000, c: 10000, v: 15000, f: 1000 }
    },
    phoenix: {
        name: 'Phoenix', type: 'beast', maxHp: 100, speed: 3.0, attackRange: 140, attackDamage: 10, attackSpeed: 380, attackType: 'melee', color: '#00bcd4', specialCooldown: 5000, specialName: 'Blue Flames', weaponType: 'orb',
        abilities: { z: 'Blue Flames', x: 'Flame Gatling', c: 'Regeneration Flame', v: 'Phoenix Transform', f: 'Phoenix Flight' },
        abilityCooldowns: { z: 5000, x: 7000, c: 8000, v: 20000, f: 1000 }
    },
    rumble: {
        name: 'Rumble', type: 'elemental', maxHp: 85, speed: 3.5, attackRange: 170, attackDamage: 12, attackSpeed: 350, attackType: 'melee', color: '#ffd740', specialCooldown: 4000, specialName: 'Thunder Bolt', weaponType: 'orb',
        abilities: { z: 'Thunder Bolt', x: 'Lightning Storm', c: 'Sky Judgement', v: 'Thunderstorm', f: 'Rumble Flight' },
        abilityCooldowns: { z: 4000, x: 6000, c: 10000, v: 14000, f: 1000 }
    },
    quake: {
        name: 'Quake', type: 'natural', maxHp: 130, speed: 2.4, attackRange: 35, attackDamage: 16, attackSpeed: 450, attackType: 'melee', color: '#ffab00', specialCooldown: 5000, specialName: 'Quake Punch', weaponType: 'fist',
        abilities: { z: 'Quake Punch', x: 'Quake Erupt', c: 'Sea Quake', v: 'Tsunami', f: 'Quake Dash' },
        abilityCooldowns: { z: 5000, x: 7000, c: 10000, v: 15000, f: 3000 }
    },
    venom: {
        name: 'Venom', type: 'natural', maxHp: 120, speed: 2.6, attackRange: 140, attackDamage: 13, attackSpeed: 400, attackType: 'melee', color: '#76ff03', specialCooldown: 5000, specialName: 'Poison Daggers', weaponType: 'claw',
        abilities: { z: 'Poison Daggers', x: 'Toxic Fog', c: 'Venom Shower', v: 'Hydra Transform', f: 'Venom Dash' },
        abilityCooldowns: { z: 5000, x: 7000, c: 10000, v: 20000, f: 2000 }
    },
    spirit: {
        name: 'Spirit', type: 'natural', maxHp: 95, speed: 2.8, attackRange: 150, attackDamage: 12, attackSpeed: 400, attackType: 'melee', color: '#ff8a65', specialCooldown: 5000, specialName: 'Spirit Bomb', weaponType: 'orb',
        abilities: { z: 'Spirit Bomb', x: 'Ice Spirit', c: 'Fire Spirit', v: 'Spirit Convergence', f: 'Spirit Flight' },
        abilityCooldowns: { z: 5000, x: 6000, c: 6000, v: 14000, f: 1000 }
    },
    sound: {
        name: 'Sound', type: 'natural', maxHp: 90, speed: 3.0, attackRange: 140, attackDamage: 11, attackSpeed: 380, attackType: 'melee', color: '#e040fb', specialCooldown: 4000, specialName: 'Sound Blast', weaponType: 'orb',
        abilities: { z: 'Sound Blast', x: 'Rhythmic Barrage', c: 'Tempo Charge', v: 'Fortissimo', f: 'Sound Dash' },
        abilityCooldowns: { z: 4000, x: 6000, c: 8000, v: 14000, f: 2000 }
    },
};
