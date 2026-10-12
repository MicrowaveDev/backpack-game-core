function clamp(value, { min = -Infinity, max = Infinity } = {}) {
  return Math.max(min, Math.min(max, value));
}

/** Add signed equipment bonuses before applying product-defined stat limits. */
export function deriveCombatantStats({
  baseStats,
  artifactTotals = {},
  statClamps = {},
  healthBonusStat = null,
  healthBonusClamp = {}
}) {
  const healthBonus = healthBonusStat
    ? clamp(artifactTotals[healthBonusStat] ?? 0, healthBonusClamp)
    : 0;
  const stats = {
    maxHealth: baseStats.health + healthBonus,
    attack: baseStats.attack + (artifactTotals.damage ?? 0),
    defense: baseStats.defense + (artifactTotals.armor ?? 0),
    speed: baseStats.speed + (artifactTotals.speed ?? 0),
    stunChance: (baseStats.stunChance ?? 0) + (artifactTotals.stunChance ?? 0)
  };
  for (const key of Object.keys(stats)) {
    stats[key] = clamp(stats[key], statClamps[key]);
  }
  return { ...stats, currentHealth: stats.maxHealth };
}
