import { Utils } from "../../utils.js";

export class ImpactEffects {
  constructor(effectsManager) {
    this.effectsManager = effectsManager;
  }

  async createWoodImpactEffect(position) {
    if (this.effectsManager) {
      this.effectsManager.createWoodDebrisEffect?.(position);
    }
    try {
      await Utils.playSound("sounds/effects/wood_break", 0.7);
    } catch (error) {
      console.warn("Failed to play wood break sound:", error);
    }
  }

  async createMetalImpactEffect(position) {
    if (this.effectsManager) {
      this.effectsManager.createSiegeHitEffect?.(position);
    }
    try {
      await Utils.playSound("sounds/effects/metal_clang.mp3", 0.8);
    } catch (error) {
      console.warn("Failed to play metal clang sound:", error);
    }
  }

  async createStoneImpactEffect(position) {
    if (this.effectsManager) {
      this.effectsManager.createStoneDebrisEffect?.(position);
    }
    try {
      await Utils.playSound("sounds/effects/stone_impact", 0.9);
    } catch (error) {
      console.warn("Failed to play stone impact sound:", error);
    }
  }

  createGenericImpactEffect(position, force) {
    console.log(
      `Generic impact at (${position.x.toFixed(1)}, ${position.y.toFixed(
        1
      )}, ${position.z.toFixed(1)}) with force ${force.toFixed(1)}`
    );
  }

  async createStoneDestructionEffect(position) {
    if (this.effectsManager) {
      this.effectsManager.createStoneDebrisEffect?.(position);
      this.effectsManager.createDustEffect?.(position, 3.0);
    }
    try {
      await Utils.playSound("sounds/effects/structure_collapse", 1.0);
    } catch (error) {
      console.warn("Failed to play structure collapse sound:", error);
    }
  }

  async createMetalDestructionEffect(position) {
    if (this.effectsManager) {
      this.effectsManager.createSiegeHitEffect?.(position);
    }
    try {
      await Utils.playSound("sounds/effects/metal_destruction", 1.0);
    } catch (error) {
      console.warn("Failed to play metal destruction sound:", error);
    }
  }

  async createWoodDestructionEffect(position) {
    if (this.effectsManager) {
      this.effectsManager.createWoodDebrisEffect?.(position);
    }
    try {
      await Utils.playSound("sounds/effects/wood_break", 0.8);
    } catch (error) {
      console.warn("Failed to play wood break sound:", error);
    }
  }
}
