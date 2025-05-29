import * as THREE from "three";
import { Utils } from "../utils.js";
import { CollisionDetector } from "./collision/CollisionDetector.js";
import { DamageHandler } from "./damage/DamageHandler.js";
import { ImpactEffects } from "./effects/ImpactEffects.js";

export class CollisionManager {
  constructor(scene, effectsManager) {
    this.scene = scene;
    this.effectsManager = effectsManager;
    this.collisionDetector = new CollisionDetector();
    this.damageHandler = new DamageHandler(scene, effectsManager);
    this.impactEffects = new ImpactEffects(effectsManager);
    this.debugMode = false; // Toggle for visualization
  }
  checkCollisions(projectiles, targets) {
    if (!projectiles || projectiles.length === 0) {
      console.log("🚫 No projectiles to check");
      return;
    }

    // Get or update collision targets
    targets = targets || this.collisionDetector.getCollisionTargets(this.scene);

    projectiles.forEach((projectile) => {
      if (!this.isValidProjectile(projectile)) return;

      // Check for predictive collisions first
      const predictedCollision = this.collisionDetector.checkRaycastCollision(
        projectile,
        targets
      );
      if (predictedCollision) {
        // Visualize predicted collision point if in debug mode
        if (this.debugMode) {
          this.visualizeCollisionPoint(predictedCollision.point);
        }
      }

      const projectilePos = projectile.position;

      // Ground collision check with improved threshold
      if (this.checkGroundCollision(projectile, projectilePos)) return;
      // Target collisions with visualization
      for (const target of targets) {
        if (!target || !target.mesh) continue;

        // Skip collision check if this specific target is being dragged
        if (target.mesh.userData?.isDragging) continue;

        // Visualize collision bounds in debug mode
        if (this.debugMode) {
          this.collisionDetector.visualizeCollisionBounds(target, this.scene);
        }

        if (
          this.collisionDetector.checkProjectileTargetCollision(
            projectile,
            target
          )
        ) {
          this.handleTargetCollision(projectile, target);
          return;
        }
      }

      // Boundary check with configurable bounds
      const worldBounds = {
        x: { min: -100, max: 100 },
        y: { min: -10, max: 100 },
        z: { min: -100, max: 100 },
      };

      if (this.collisionDetector.isOutOfBounds(projectilePos, worldBounds)) {
        this.handleOutOfBounds(projectile);
      }
    });
  }

  isValidProjectile(projectile) {
    if (!projectile || projectile.userData?.hasCollided) return false;
    if (!projectile.position || !projectile.userData?.velocity) return false;
    return true;
  }

  checkGroundCollision(projectile, position) {
    const projectileRadius = projectile.userData?.radius || 0.3;
    const groundThreshold = Math.max(projectileRadius * 1.5, 0.5);

    if (position.y <= groundThreshold) {
      const bounceCount = projectile.userData?.bounces || 0;
      const isFinalBounce = bounceCount >= 3;

      this.handleGroundCollision(projectile, position, {
        velocity: projectile.userData.velocity,
        force: projectile.userData.velocity?.length() || 0,
        bounceCount: bounceCount,
        final: isFinalBounce,
      });

      return true;
    }
    return false;
  }

  async handleGroundCollision(projectile, position, collisionData = null) {
    if (!projectile || projectile.userData.hasCollided) return;

    const velocity = collisionData?.velocity || projectile.userData.velocity;
    const impactSpeed =
      collisionData?.force || (velocity ? velocity.length() / 10 : 0);
    const isFinalCollision = collisionData?.final || false;

    if (impactSpeed > 0.3 || isFinalCollision) {
      const impactForce = Math.min(impactSpeed * 1.5, 2.0);

      if (this.effectsManager) {
        // Create dust effect for significant impacts
        if (impactForce > 0.8) {
          this.effectsManager.createDustEffect(position, impactForce * 0.6);

          // Create spread dust for stronger impacts
          if (impactForce > 1.2) {
            const spreadDistance = impactForce * 0.3;
            [-1, 1].forEach((offset) => {
              this.effectsManager.createDustEffect(
                {
                  x: position.x + offset * spreadDistance,
                  y: position.y + 0.2,
                  z: position.z,
                },
                impactForce * 0.4
              );
            });
          }
        }

        // Create crater for strong impacts or final stop
        if (impactForce > 1.2 || isFinalCollision) {
          // Lower threshold and ensure final gets a crater
          const craterScale = isFinalCollision ? 1.0 : 0.6; // Smaller craters for bounces
          const effectiveForce = isFinalCollision
            ? Math.max(impactForce, 1.5)
            : impactForce; // Ensure final stop has minimum force
          this.effectsManager.createCraterEffect(
            position,
            effectiveForce * craterScale
          );
        }
      }

      // Handle sound effects
      try {
        const currentBounceCount = collisionData?.bounceCount || 0;
        const bounceReduction = Math.pow(0.5, currentBounceCount);
        const volumeScale = Math.min(impactForce * 0.3, 0.8) * bounceReduction;

        if (volumeScale > 0.1) {
          await Utils.playSound(
            "sounds/effects/impact",
            Utils.clamp(volumeScale, 0.1, 0.8)
          );
        }
      } catch (error) {
        console.warn("Failed to play impact sound:", error);
      }
    }

    if (isFinalCollision) {
      this.deactivateProjectile(projectile);
    }
  }
  async handleTargetCollision(projectile, target) {
    if (
      !projectile ||
      projectile.userData.hasCollided ||
      target.mesh?.userData?.isDragging
    )
      return;

    const impactVelocity = projectile.userData.velocity?.length() || 0;
    const impactPoint = projectile.position.clone();
    const impactForce = Math.min(impactVelocity / 10, 3.0);

    // Calculate damage based on impact force and projectile properties
    const baseDamage = this.calculateDamage(projectile, impactForce);
    const damageDealt = this.applyDamage(target, baseDamage);

    // Log collision event
    console.log(`💥 Impact on ${target.type}:`, {
      force: impactForce.toFixed(2),
      velocity: impactVelocity.toFixed(2),
      damage: damageDealt.toFixed(2),
      remainingHealth: target.mesh.userData.health?.toFixed(2) || 0,
      position: impactPoint.toArray().map((v) => v.toFixed(2)),
    });

    // Handle visual and sound effects
    await this.handleImpactEffects(target, impactPoint, impactForce);

    // Check if target should be destroyed
    if (this.shouldDestroyTarget(target)) {
      await this.destroyTarget(target, target.mesh.position);
    } else {
      // Show damage indication if target survives
      this.showDamageIndication(target, damageDealt);
    }

    this.deactivateProjectile(projectile);
  }

  calculateDamage(projectile, impactForce) {
    const baseProjectileDamage = projectile.userData.damage || 50;
    const forceMultiplier = Math.pow(impactForce, 1.5); // Exponential damage scaling with force
    return baseProjectileDamage * forceMultiplier;
  }

  applyDamage(target, damage) {
    if (!target.mesh.userData.health) {
      this.initializeTargetHealth(target);
    }

    const resistance = this.getTargetResistance(target);
    const actualDamage = damage * (1 - resistance);

    target.mesh.userData.health = Math.max(
      0,
      target.mesh.userData.health - actualDamage
    );
    return actualDamage;
  }

  initializeTargetHealth(target) {
    const baseHealth = this.getBaseHealth(target.type);
    target.mesh.userData.health = baseHealth;
    target.mesh.userData.maxHealth = baseHealth;
  }

  getBaseHealth(targetType) {
    switch (targetType) {
      case "wall":
        return 200;
      case "tower":
        return 200;
      case "siegeTower":
        return 200;
      case "barrel":
        return 100;
      default:
        return 300;
    }
  }

  getTargetResistance(target) {
    const resistances = {
      wall: 0.3, // 30% damage reduction
      tower: 0.4, // 40% damage reduction
      siegeTower: 0.2, // 20% damage reduction
      barrel: 0, // No damage reduction
    };
    return resistances[target.type] || 0;
  }

  shouldDestroyTarget(target) {
    return target.mesh.userData.health <= 0;
  }

  showDamageIndication(target, damage) {
    if (!this.effectsManager) return;

    // Visual damage indication
    const healthPercent =
      target.mesh.userData.health / target.mesh.userData.maxHealth;
    const color = this.getDamageColor(healthPercent);

    // Handle both single meshes and groups
    const meshesToChange = [];
    const originalColors = [];

    if (target.mesh.type === "Group") {
      // If it's a group, find all meshes with materials
      target.mesh.traverse((child) => {
        if (child.isMesh && child.material && child.material.color) {
          meshesToChange.push(child);
          originalColors.push(child.material.color.clone());
        }
      });
    } else {
      // If it's a single mesh
      if (target.mesh.material && target.mesh.material.color) {
        meshesToChange.push(target.mesh);
        originalColors.push(target.mesh.material.color.clone());
      }
    }

    // Change color for all meshes
    meshesToChange.forEach((mesh) => {
      mesh.material.color.setHex(color);
    });

    // Create damage number particle
    this.effectsManager.createDamageParticles(
      target.mesh.position.clone().add(new THREE.Vector3(0, 2, 0)),
      damage
    );

    // Reset colors after a short delay
    setTimeout(() => {
      meshesToChange.forEach((mesh, index) => {
        if (mesh.material && mesh.material.color) {
          mesh.material.color.copy(originalColors[index]);
        }
      });
    }, 200);
  }

  getDamageColor(healthPercent) {
    if (healthPercent > 0.7) return 0xffcccc; // Light red
    if (healthPercent > 0.3) return 0xff6666; // Medium red
    return 0xff0000; // Bright red
  }

  handleImpactEffects(target, impactPoint, impactForce) {
    switch (target.type) {
      case "barrel":
        // Always treat as explosive and handle consistently
        this.triggerBarrelExplosion(
          { mesh: target.mesh, type: "barrel", explosive: true },
          target.mesh.position
        );
        break;

      case "wall":
      case "tower":
        this.handleStructureImpact(target, impactPoint, impactForce);
        break;

      case "siegeTower":
        this.handleSiegeTowerImpact(target, impactPoint, impactForce);
        break;
    }
  }
  handleBarrelImpact(target, impactPoint) {
    // Only trigger if barrel isn't already exploding
    if (target.mesh && !target.mesh.userData.isExploding) {
      this.triggerBarrelExplosion(target, target.mesh.position);
    }
  }

  handleStructureImpact(target, impactPoint, impactForce) {
    this.impactEffects.createStoneImpactEffect(impactPoint);

    if (this.effectsManager) {
      this.effectsManager.createDustEffect(impactPoint, impactForce * 0.7);
      if (impactForce > 1.5) {
        this.effectsManager.createStoneDebrisEffect(impactPoint);
      }
    }
  }

  handleSiegeTowerImpact(target, impactPoint, impactForce) {
    this.impactEffects.createMetalImpactEffect(impactPoint);
    if (this.effectsManager) {
      this.effectsManager.createSiegeHitEffect(impactPoint);
    }
  }

  handleOutOfBounds(projectile) {
    if (!projectile) return;
    this.deactivateProjectile(projectile);
  }

  deactivateProjectile(projectile) {
    projectile.userData.active = false;
    projectile.userData.hasCollided = true;

    setTimeout(() => {
      if (projectile.parent) {
        projectile.parent.remove(projectile);
      }
    }, 100);
  }
  async destroyTarget(target, position) {
    if (!target || !target.mesh) return;

    // Create destruction effects before removing from scene
    switch (target.type) {
      case "wall":
      case "tower":
        await this.impactEffects.createStoneDestructionEffect(position);
        this.createDestructionDebris(target, position, "stone");
        break;
      case "siegeTower":
        await this.impactEffects.createMetalDestructionEffect(position);
        this.createDestructionDebris(target, position, "metal");
        break;
      case "barrel":
        if (target.explosive) {
          await this.triggerBarrelExplosion(target, position);
        } else {
          await this.impactEffects.createWoodDestructionEffect(position);
          this.createDestructionDebris(target, position, "wood");
        }
        break;
    }

    // Remove the target from the scene
    if (this.scene && target.mesh.parent) {
      this.scene.remove(target.mesh);
    }

    // Trigger any additional destruction effects
    if (target.onDestroy) {
      target.onDestroy(target);
    }

    // Notify any listeners about the destruction
    this.dispatchDestructionEvent(target);
  }

  createDestructionDebris(target, position, materialType) {
    if (!this.effectsManager) return;

    const size = target.mesh.scale.length() / 3;
    const debrisCount = Math.floor(Utils.randomRange(4, 8) * size);

    for (let i = 0; i < debrisCount; i++) {
      const debrisSize = Utils.randomRange(0.2, 0.4) * size;
      const debris = Utils.createBox(
        debrisSize,
        debrisSize,
        debrisSize,
        this.getMaterialColor(materialType)
      );

      debris.position.copy(position);
      debris.position.add(
        new THREE.Vector3(
          Utils.randomRange(-0.5, 0.5),
          Utils.randomRange(0, 1),
          Utils.randomRange(-0.5, 0.5)
        )
      );

      this.effectsManager.animateDebris(debris, {
        initialVelocity: {
          x: Utils.randomRange(-3, 3),
          y: Utils.randomRange(4, 8),
          z: Utils.randomRange(-3, 3),
        },
        rotationSpeed: {
          x: Utils.randomRange(-0.2, 0.2),
          y: Utils.randomRange(-0.2, 0.2),
          z: Utils.randomRange(-0.2, 0.2),
        },
        bounce: Utils.randomRange(0.3, 0.5),
      });
    }
  }

  getMaterialColor(type) {
    switch (type) {
      case "stone":
        return 0x696969;
      case "metal":
        return 0x808080;
      case "wood":
        return 0x8b4513;
      default:
        return 0x808080;
    }
  }

  dispatchDestructionEvent(target) {
    const event = new CustomEvent("targetDestroyed", {
      detail: {
        type: target.type,
        position: target.mesh.position.clone(),
        userData: target.mesh.userData,
      },
    });
    window.dispatchEvent(event);
  }
  async triggerBarrelExplosion(barrel, position) {
    if (!barrel.mesh || !barrel.mesh.parent || barrel.mesh.userData?.isDragging)
      return;

    const targetBarrel = this.scene.children.find(
      (child) => child === barrel.mesh
    );
    if (targetBarrel?.userData?.isDragging) return;

    barrel.mesh.userData.isExploding = true;
    barrel.mesh.userData.explosive = true;

    this.handleChainReaction(barrel, position);

    if (this.effectsManager) {
      this.effectsManager.createExplosionEffect?.(position, 3.0);
    }

    try {
      await Utils.playSound("sounds/effects/explosion", 1.0);
    } catch (error) {
      console.warn("Failed to play explosion sound:", error);
    }

    if (this.scene) {
      this.scene.remove(barrel.mesh);
    }
  }
  async handleChainReaction(barrel, position) {
    const chainReactionRadius = 8;

    try {
      await Utils.playSound("sounds/effects/chain_reaction", 0.8);
    } catch (error) {
      console.warn("Failed to play chain reaction sound:", error);
    }

    if (this.effectsManager) {
      this.effectsManager.createDustEffect(position, 2.0);
      [-1, 1].forEach((offset) => {
        this.effectsManager.createDustEffect(
          {
            x: position.x + offset * 2,
            y: position.y + 0.2,
            z: position.z,
          },
          1.5
        );
      });
    }

    this.scene.children.forEach((child) => {
      if (
        child.userData?.type === "barrel" &&
        child !== barrel.mesh &&
        !child.userData.isExploding &&
        child.parent === this.scene
      ) {
        const distance = position.distanceTo(child.position);
        if (distance < chainReactionRadius) {
          child.userData.isExploding = true;

          const delay = 100 + Math.random() * 200;
          setTimeout(() => {
            if (child.parent === this.scene) {
              this.triggerBarrelExplosion(
                { mesh: child, type: "barrel", explosive: true },
                child.position
              );
            }
          }, delay);
        }
      }
    });

    const targets = this.collisionDetector.getCollisionTargets(this.scene);
    const damagedTargets = this.damageHandler.explosionDamage(
      position,
      chainReactionRadius,
      150,
      targets
    );

    damagedTargets?.forEach(({ target, destroyed }) => {
      if (destroyed) {
        this.destroyTarget(target, target.position);
      }
    });
  }

  visualizeCollisionPoint(point) {
    const geometry = new THREE.SphereGeometry(0.2, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      transparent: true,
      opacity: 0.5,
    });
    const marker = new THREE.Mesh(geometry, material);
    marker.position.copy(point);
    this.scene.add(marker);

    setTimeout(() => this.scene.remove(marker), 1000);
  }

  setDebugMode(enabled) {
    this.debugMode = enabled;
    console.log(`🔧 Collision debug mode: ${enabled ? "enabled" : "disabled"}`);
  }

  clearCache() {
    this.collisionDetector.clearCache();
  }
}
