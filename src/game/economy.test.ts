import { describe, it, expect } from 'vitest';
import {
  emptyBag,
  canCraft,
  applyCraft,
  applyHarvest,
  tradeBuy,
  tradeSell,
  transferResource,
  RECIPES,
} from './economy';

describe('economy craft/trade/harvest', () => {
  it('harvests into the bag', () => {
    const bag = applyHarvest(emptyBag(), { scrap: 3, circuits: 1 });
    expect(bag.scrap).toBe(3);
    expect(bag.circuits).toBe(1);
  });

  it('blocks craft without mats', () => {
    const recipe = RECIPES[0];
    expect(canCraft(emptyBag(), 1000, recipe)).toBe(false);
  });

  it('crafts a weapon recipe and spends mats + cash', () => {
    const recipe = RECIPES.find((r) => r.id === 'craft_pistol')!;
    const bag = applyHarvest(emptyBag(), { scrap: 10, circuits: 5 });
    const result = applyCraft(bag, 500, recipe);
    expect(result).not.toBeNull();
    expect(result!.bag.scrap).toBe(6);
    expect(result!.bag.circuits).toBe(3);
    expect(result!.money).toBe(400);
  });

  it('buys and sells at asymmetric prices', () => {
    let bag = emptyBag();
    let money = 200;
    const bought = tradeBuy(bag, money, 'scrap', 2);
    expect(bought).not.toBeNull();
    bag = bought!.bag;
    money = bought!.money;
    expect(bag.scrap).toBe(2);
    const sold = tradeSell(bag, money, 'scrap', 1);
    expect(sold!.bag.scrap).toBe(1);
    expect(sold!.money).toBeGreaterThan(money - 40);
  });

  it('transfers resources between bag and stash', () => {
    const bag = applyHarvest(emptyBag(), { scrap: 3 });
    const stash = emptyBag();
    const moved = transferResource(bag, stash, 'scrap', 2);
    expect(moved).not.toBeNull();
    expect(moved!.from.scrap).toBe(1);
    expect(moved!.to.scrap).toBe(2);
    // Round trip back.
    const back = transferResource(moved!.to, moved!.from, 'scrap', 2);
    expect(back!.from.scrap).toBe(0);
    expect(back!.to.scrap).toBe(3);
  });

  it('rejects transfers with insufficient quantity', () => {
    expect(transferResource(emptyBag(), emptyBag(), 'scrap', 1)).toBeNull();
    const bag = applyHarvest(emptyBag(), { scrap: 1 });
    expect(transferResource(bag, emptyBag(), 'scrap', 0)).toBeNull();
    expect(transferResource(bag, emptyBag(), 'scrap', 2)).toBeNull();
  });
});
