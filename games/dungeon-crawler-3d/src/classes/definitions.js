// ═══════════════════════════════════════════════════════════════
//  CHARACTER DEFINITIONS — clean slate, add new characters here
// ═══════════════════════════════════════════════════════════════

export const CLASSES = {
    placeholder: {
        name: 'Fighter', type: 'basic', maxHp: 100, speed: 3.0, attackRange: 35,
        attackDamage: 10, attackSpeed: 350, attackType: 'melee', color: '#00ffcc',
        specialCooldown: 5000, specialName: 'Punch', weaponType: 'fist',
        abilities: { z: 'Punch', x: 'Kick', c: 'Slam', v: 'Power Up', f: 'Dash' },
        abilityCooldowns: { z: 3000, x: 4000, c: 6000, v: 15000, f: 2000 }
    },
};
