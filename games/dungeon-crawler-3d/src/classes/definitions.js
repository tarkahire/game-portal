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
};
