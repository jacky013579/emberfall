// Level-up choices: the pool of upgrades, and dealing three distinct cards.
// Each upgrade is a small, named change, so a run's build is legible in the HUD.
export const UPGRADES = [
  { id: 'damage', name: 'Kindled Rounds', desc: '+25% bullet damage', apply: (p) => { p.damage *= 1.25; } },
  { id: 'rate', name: 'Rapid Lantern', desc: '+20% fire rate', apply: (p) => { p.fireInterval *= 0.83; } },
  { id: 'multi', name: 'Twin Flames', desc: '+1 projectile per shot', apply: (p) => { p.projectiles += 1; } },
  { id: 'pierce', name: 'Piercing Light', desc: 'Bullets pierce +1 enemy', apply: (p) => { p.pierce += 1; } },
  { id: 'speed', name: 'Swift Boots', desc: '+12% move speed', apply: (p) => { p.speed *= 1.12; } },
  { id: 'vitality', name: 'Ember Heart', desc: '+25 max HP and heal 25', apply: (p) => { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); } },
  { id: 'dash', name: 'Cinder Step', desc: 'Dash recharges 30% faster', apply: (p) => { p.dashCd = Math.max(0, p.dashCd * 0.7); } },
  { id: 'magnet', name: 'Lodestone', desc: '+60% ember pickup radius', apply: (p) => { p.magnet *= 1.6; } },
  { id: 'velocity', name: 'Long Burn', desc: '+20% bullet speed', apply: (p) => { p.bulletSpeed *= 1.2; } },
  { id: 'crit', name: 'Deadly Spark', desc: '+10% critical chance', apply: (p) => { p.crit = Math.min(0.6, p.crit + 0.1); } },
];

export function dealUpgrades(rng, count) {
  const pool = [...UPGRADES];
  const dealt = [];
  while (dealt.length < count && pool.length > 0) {
    const i = Math.floor(rng.next() * pool.length);
    dealt.push(pool.splice(i, 1)[0]);
  }
  return dealt;
}
