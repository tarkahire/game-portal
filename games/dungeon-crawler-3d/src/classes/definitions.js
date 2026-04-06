// ═══════════════════════════════════════════════════════════════
//  CHARACTER DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export const CLASSES = {
    gojo: {
        name: 'Gojo Satoru', type: 'sorcerer', maxHp: 120, speed: 3.2, attackRange: 35,
        attackDamage: 14, attackSpeed: 300, attackType: 'melee', color: '#4fc3f7',
        specialCooldown: 5000, specialName: 'Infinity', weaponType: 'fist',
        abilities: { z: 'Blue', x: 'Red', c: 'Hollow Purple', v: 'Domain Expansion', f: 'Teleport' },
        abilityCooldowns: { z: 4000, x: 5000, c: 10000, v: 20000, f: 3000 }
    },
    sukuna: {
        name: 'Ryomen Sukuna', type: 'sorcerer', maxHp: 150, speed: 3.4, attackRange: 35,
        attackDamage: 18, attackSpeed: 250, attackType: 'melee', color: '#ff2244',
        specialCooldown: 5000, specialName: 'Malevolent Shrine', weaponType: 'fist',
        abilities: { z: 'Dismantle', x: 'Cleave', c: 'Fire Arrow', v: 'Malevolent Shrine', f: 'Dash' },
        abilityCooldowns: { z: 3000, x: 4000, c: 8000, v: 20000, f: 2500 }
    },
    toji: {
        name: 'Toji Fushiguro', type: 'assassin', maxHp: 140, speed: 4.0, attackRange: 40,
        attackDamage: 20, attackSpeed: 200, attackType: 'melee', color: '#2a6e3f',
        specialCooldown: 4000, specialName: 'Heavenly Restriction', weaponType: 'spear',
        abilities: { z: 'Inverted Spear', x: 'Chain Strike', c: 'Playful Cloud', v: 'Heavenly Restriction', f: 'Flash Step' },
        abilityCooldowns: { z: 3000, x: 3500, c: 7000, v: 18000, f: 2000 }
    },
    brook: {
        name: 'Brook', type: 'swordsman', maxHp: 100, speed: 3.6, attackRange: 38,
        attackDamage: 16, attackSpeed: 220, attackType: 'melee', color: '#88ccff',
        specialCooldown: 4000, specialName: 'Soul King', weaponType: 'sword',
        abilities: { z: 'Hanauta Sancho', x: 'Soul Solid', c: 'Blizzard Slice', v: 'Soul King', f: 'Dash' },
        abilityCooldowns: { z: 3000, x: 4000, c: 8000, v: 18000, f: 2500 }
    },
};
