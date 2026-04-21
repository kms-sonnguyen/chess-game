// tests/difficulty.test.ts
import { describe, it, expect } from 'vitest';
import { eloToSkill, computeEloChange, aiVirtualElo } from '../src/adaptive/difficulty';

describe('eloToSkill', () => {
  it('maps ELO < 400 to skill 0 depth 4', () => {
    expect(eloToSkill(200)).toEqual({ skill: 0, depth: 4 });
    expect(eloToSkill(399)).toEqual({ skill: 0, depth: 4 });
  });
  it('maps ELO 800-1000 to skill 5 depth 10', () => {
    expect(eloToSkill(850)).toEqual({ skill: 5, depth: 10 });
  });
  it('maps ELO 1600+ to skill 18 depth 18', () => {
    expect(eloToSkill(1800)).toEqual({ skill: 18, depth: 18 });
  });
});

describe('aiVirtualElo', () => {
  it('returns 200 for skill 0', () => expect(aiVirtualElo(0)).toBe(200));
  it('returns 950 for skill 5', () => expect(aiVirtualElo(5)).toBe(950));
  it('returns 2900 for skill 18', () => expect(aiVirtualElo(18)).toBe(2900));
});

describe('computeEloChange', () => {
  it('gives positive change on win against stronger opponent', () => {
    const delta = computeEloChange(800, 950, 'win');
    expect(delta).toBeGreaterThan(0);
  });
  it('gives negative change on loss against weaker opponent', () => {
    const delta = computeEloChange(1000, 800, 'loss');
    expect(delta).toBeLessThan(0);
  });
  it('gives small change on draw against equal opponent', () => {
    const delta = computeEloChange(1000, 1000, 'draw');
    expect(Math.abs(delta)).toBeLessThan(5);
  });
});
