// ═══════════════════════════════════════════════════════════════
//  CHARACTER DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const CLASSES = {
    gojo: {
        name: 'Gojo Satoru', type: 'sorcerer', maxHp: 120, speed: 3.2, attackRange: 35,
        attackDamage: 10, attackSpeed: 300, attackType: 'melee', color: '#4fc3f7',
        specialCooldown: 5000, specialName: 'Infinity', weaponType: 'fist',
        abilities: { z: 'Blue', x: 'Red', c: 'Hollow Purple', v: 'Domain Expansion', f: 'Teleport' },
        abilityCooldowns: { z: 4000, x: 5000, c: 10000, v: 20000, f: 3000 }
    },
    sukuna: {
        name: 'Ryomen Sukuna', type: 'sorcerer', maxHp: 150, speed: 3.4, attackRange: 35,
        attackDamage: 12, attackSpeed: 250, attackType: 'melee', color: '#ff2244',
        specialCooldown: 5000, specialName: 'Malevolent Shrine', weaponType: 'fist',
        abilities: { z: 'Dismantle', x: 'Cleave', c: 'Fire Arrow', v: 'Malevolent Shrine', f: 'Dash' },
        abilityCooldowns: { z: 3000, x: 4000, c: 8000, v: 20000, f: 2500 }
    },
    toji: {
        name: 'Toji Fushiguro', type: 'assassin', maxHp: 140, speed: 4.0, attackRange: 40,
        attackDamage: 14, attackSpeed: 200, attackType: 'melee', color: '#2a6e3f',
        specialCooldown: 4000, specialName: 'Heavenly Restriction', weaponType: 'spear',
        abilities: { z: 'Inverted Spear', x: 'Chain Strike', c: 'Playful Cloud', v: 'Heavenly Restriction', f: 'Flash Step' },
        abilityCooldowns: { z: 3000, x: 3500, c: 7000, v: 18000, f: 2000 }
    },
    brook: {
        name: 'Brook', type: 'swordsman', maxHp: 100, speed: 3.6, attackRange: 38,
        attackDamage: 11, attackSpeed: 220, attackType: 'melee', color: '#88ccff',
        specialCooldown: 4000, specialName: 'Soul King', weaponType: 'sword',
        abilities: { z: 'Hanauta Sancho', x: 'Soul Solid', c: 'Blizzard Slice', v: 'Soul King', f: 'Dash' },
        abilityCooldowns: { z: 3000, x: 4000, c: 8000, v: 18000, f: 2500 }
    },
    denji: {
        name: 'Denji', type: 'devil', maxHp: 160, speed: 6.0, attackRange: 35,
        attackDamage: 13, attackSpeed: 240, attackType: 'melee', color: '#cc4400',
        specialCooldown: 4000, specialName: 'Chainsaw Devil', weaponType: 'chainsaw',
        abilities: { z: 'Chain Rip', x: 'Buzzsaw', c: 'Devil Charge', v: 'Full Devil', f: 'Chain Dash' },
        abilityCooldowns: { z: 3000, x: 4000, c: 8000, v: 18000, f: 2500 }
    },
    yoh: {
        name: 'Yoh Asakura', type: 'shaman', maxHp: 130, speed: 3.6, attackRange: 38,
        attackDamage: 11, attackSpeed: 220, attackType: 'melee', color: '#ff9800',
        specialCooldown: 4000, specialName: 'Spirit of Sword', weaponType: 'fist',
        abilities: { z: 'Celestial Slash', x: 'Buddha Giri', c: 'Double Medium', v: 'Fumon Tonkou', f: 'Spirit Dash' },
        abilityCooldowns: { z: 3500, x: 4500, c: 9000, v: 20000, f: 2500 }
    },
    ren: {
        name: 'Tao Ren', type: 'shaman', maxHp: 140, speed: 3.8, attackRange: 40,
        attackDamage: 12, attackSpeed: 210, attackType: 'melee', color: '#9c27b0',
        specialCooldown: 4000, specialName: 'Spirit of Thunder', weaponType: 'fist',
        abilities: { z: 'Rapid Tempo Assault', x: 'Eleki Bang', c: 'Heaven Shaking Thunder', v: 'Golden Thunder', f: 'Thunder Dash' },
        abilityCooldowns: { z: 3000, x: 4500, c: 9000, v: 20000, f: 2500 }
    },
    horohoro: {
        name: 'Horohoro', type: 'shaman', maxHp: 135, speed: 3.5, attackRange: 38,
        attackDamage: 10, attackSpeed: 230, attackType: 'melee', color: '#42a5f5',
        specialCooldown: 4000, specialName: 'Spirit of Ice', weaponType: 'fist',
        abilities: { z: 'Fist Slam', x: 'Ice Barrage', c: 'Blizzard', v: 'Avalanche', f: 'Ice Dash' },
        abilityCooldowns: { z: 4000, x: 5000, c: 10000, v: 20000, f: 2500 }
    },
    megumi: {
        name: 'Megumi Fushiguro', type: 'sorcerer', maxHp: 130, speed: 3.5, attackRange: 35,
        attackDamage: 11, attackSpeed: 240, attackType: 'melee', color: '#1a237e',
        specialCooldown: 5000, specialName: 'Ten Shadows', weaponType: 'fist',
        abilities: { z: 'Divine Dog', x: 'Mahoraga', c: 'Nue', v: 'Chimera Shadow Garden', f: 'Shadow Dash' },
        abilityCooldowns: { z: 4000, x: 18000, c: 8000, v: 20000, f: 2500 }
    },
    todo: {
        name: 'TODO', type: 'fighter', maxHp: 220, speed: 3.0, attackRange: 35,
        attackDamage: 3, attackSpeed: 320, attackType: 'melee', color: '#d4a070',
        specialCooldown: 0, specialName: 'Black Flash', weaponType: 'fist',
        abilities: { z: 'Black Flash', x: 'Face Slam', c: 'Boulder Kick' },
        abilityCooldowns: { z: 5000, x: 7000, c: 6000 }
    },
    yuta: {
        name: 'Yuta Okkotsu', type: 'sorcerer', maxHp: 135, speed: 3.6, attackRange: 38,
        attackDamage: 12, attackSpeed: 220, attackType: 'melee', color: '#5a8aff',
        specialCooldown: 5000, specialName: 'Cursed Queen Rika', weaponType: 'sword',
        abilities: {
            z: 'Rika',
            x: 'Cursed Speech',
            c: 'Black Flash',
            v: 'Reverse Cursed Technique',
            f: 'Flash Step'
        },
        abilityCooldowns: { z: 12000, x: 6000, c: 5000, v: 18000, f: 1500 }
    },
};
