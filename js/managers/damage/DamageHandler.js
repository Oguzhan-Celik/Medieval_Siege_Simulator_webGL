import * as THREE from "three";
import { materials } from "../../materials.js";

export class DamageHandler {
  constructor(scene, effectsManager) {
    this.scene = scene;
    this.effectsManager = effectsManager;
  }

  applyDamageVisuals(target, damageDealt) {
    if (!target || !target.mesh) return;

    const mesh = target.mesh;
    if (!mesh.material || mesh.material.color === undefined) {
      // console.warn("Target mesh material or material.color is missing for damage visuals.", mesh.name, mesh.userData.type);
      return;
    }

    // Ensure health and maxHealth are present on the mesh's userData
    if (
      mesh.userData.health === undefined ||
      mesh.userData.maxHealth === undefined
    ) {
      // console.warn("Target mesh is missing health/maxHealth userData properties for damage visuals.", mesh.name, mesh.userData.type);
      return;
    }
    if (mesh.userData.maxHealth <= 0) {
      // console.warn("Target mesh maxHealth is zero or negative.", mesh.name, mesh.userData.type);
      return;
    }

    let needsCloning = !mesh.userData.hasClonedMaterialForDamageState;

    // Additional check: If the flag says it's cloned, but it's somehow still a direct reference to a global material, force cloning.
    // This handles edge cases or if state was improperly reset elsewhere.
    if (!needsCloning && mesh.userData.hasClonedMaterialForDamageState) {
      for (const key in materials) {
        // Check if materials[key] is a valid material object and not the 'initialized' flag or the initialize function
        if (
          materials.hasOwnProperty(key) &&
          typeof materials[key] === "object" &&
          materials[key] &&
          materials[key].isMaterial
        ) {
          if (mesh.material === materials[key]) {
            // console.warn(`Mesh ${mesh.name || 'unnamed'} (${mesh.uuid}) was flagged as having a cloned material, but it's still using the global material '${key}'. Forcing clone.`);
            needsCloning = true;
            // Reset flags to ensure original color is correctly captured from the (supposedly pristine) global material
            delete mesh.userData.hasClonedMaterialForDamageState;
            delete mesh.userData.originalMaterialBaseColorHex;
            break;
          }
        }
      }
    }

    if (needsCloning) {
      // Capture the original color hex from the material the mesh is CURRENTLY using.
      // This assumes that at the point of first needing a clone, mesh.material is either:
      // 1. A pristine shared global material (e.g., materials.wood).
      // 2. Or, if the sanity check above triggered, it's also a pristine shared global material.
      if (mesh.userData.originalMaterialBaseColorHex === undefined) {
        mesh.userData.originalMaterialBaseColorHex =
          mesh.material.color.getHex();
      }

      // Clone the current material to make it unique for this mesh instance.
      mesh.material = mesh.material.clone();
      mesh.userData.hasClonedMaterialForDamageState = true; // Mark that this mesh now has a unique material.
    }

    // Calculate color based on current health percentage, always starting from its true original color.
    const healthPercent = Math.max(
      0,
      mesh.userData.health / mesh.userData.maxHealth
    );

    // Retrieve the stored true original color for this instance.
    const baseColorForTint = new THREE.Color(
      mesh.userData.originalMaterialBaseColorHex
    );

    if (healthPercent < 1.0) {
      // Only apply tint if health is less than max (i.e., damaged)
      const tintStrength = (1.0 - healthPercent) * 0.7; // Max 70% interpolation towards red.
      baseColorForTint.lerp(new THREE.Color(0xff0000), tintStrength); // Interpolate towards red.
    }

    // Apply the calculated color to the mesh's unique material.
    mesh.material.color.copy(baseColorForTint);

    if (this.effectsManager && this.effectsManager.createDamageParticles) {
      this.effectsManager.createDamageParticles(
        mesh.position.clone().add(new THREE.Vector3(0, 2, 0)),
        damageDealt
      );
    }
  }

  explosionDamage(center, radius, maxDamage, targets) {
    const damagedTargetsInfo = [];
    targets.forEach((targetWrapper) => {
      if (
        !targetWrapper ||
        !targetWrapper.mesh ||
        !targetWrapper.mesh.position
      ) {
        damagedTargetsInfo.push({ target: targetWrapper, destroyed: false });
        return;
      }

      const mesh = targetWrapper.mesh;
      const distance = center.distanceTo(mesh.position);

      if (distance < radius) {
        const damageRatio = 1 - distance / radius;
        const damage = Math.floor(maxDamage * damageRatio);

        if (targetWrapper.type !== "ground") {
          // Example: Ground is not destructible by explosions
          // Ensure health and maxHealth are initialized on mesh.userData for explosion damage
          if (mesh.userData.health === undefined) {
            // Prioritize MESH.userData
            mesh.userData.maxHealth = this.getBaseHealthForExplosion(
              targetWrapper.type
            );
            mesh.userData.health = mesh.userData.maxHealth;
          }
          // If health was set (e.g. loaded) but maxHealth wasn't
          if (
            mesh.userData.maxHealth === undefined &&
            mesh.userData.health !== undefined
          ) {
            mesh.userData.maxHealth = Math.max(
              mesh.userData.health,
              this.getBaseHealthForExplosion(targetWrapper.type)
            );
          }

          mesh.userData.health -= damage;
          mesh.userData.health = Math.max(0, mesh.userData.health); // Clamp health at 0

          this.applyDamageVisuals(targetWrapper, damage); // Pass the wrapper

          if (mesh.userData.health <= 0) {
            // console.log(`${targetWrapper.type} destroyed by explosion.`);
            damagedTargetsInfo.push({ target: targetWrapper, destroyed: true });
            return; // Move to next target
          }
        }
      }
      damagedTargetsInfo.push({ target: targetWrapper, destroyed: false });
    });
    return damagedTargetsInfo;
  }

  // Helper to get base health for objects damaged by explosions.
  getBaseHealthForExplosion(targetType) {
    switch (targetType) {
      case "wall":
        return 200;
      case "tower":
        return 200;
      case "siegeTower":
        return 200;
      case "barrel":
        return 50; // Barrels are typically more fragile to secondary explosions
      default:
        return 100;
    }
  }
}
