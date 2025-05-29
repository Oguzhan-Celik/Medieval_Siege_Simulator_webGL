import * as THREE from "three";
import { Utils } from "../../utils.js";
import { Validation } from "../../validation.js";

export class CollisionDetector {
  constructor() {
    this.boundingBoxCache = new Map();
    this.cacheTimeout = 100; // Cache timeout in ms
    this.lastCacheUpdate = 0;
    this.debugMode = false;
  }
  getCollisionTargets(scene) {
    const targets = [];
    console.log("🎯 Scanning scene for collision targets...");

    scene.traverse((object) => {
      // Skip projectiles entirely - both active and inactive
      if (object.userData?.isProjectile) {
        console.log("   ⚡ Skipping projectile from collision targets");
        return;
      }

      // Check for objects with collision data
      if (object.userData && object.userData.type) {
        const targetData = {
          mesh: object,
          type: object.userData.type,
          position: object.position,
          boundingBox: this.getBoundingBox(object),
        };

        targets.push(targetData);
        console.log(
          `   ✓ Found collision target: ${object.userData.type} at`,
          object.position
        );
      }

      // Also check for named objects that should be collision targets
      if (object.name) {
        switch (object.name) {
          case "ground":
            targets.push({
              mesh: object,
              type: "ground",
              position: object.position,
              boundingBox: this.getBoundingBox(object),
            });
            console.log(
              `   ✓ Found ground collision target at`,
              object.position
            );
            break;
          case "wall":
          case "tower":
          case "siegeTower":
            if (!object.userData.type) {
              // Avoid duplicates
              targets.push({
                mesh: object,
                type: object.name,
                position: object.position,
                boundingBox: this.getBoundingBox(object),
              });
              console.log(
                `   ✓ Found named collision target: ${object.name} at`,
                object.position
              );
            }
            break;
        }
      }
    });

    console.log(`🎯 Total collision targets found: ${targets.length}`);
    return targets;
  }

  checkProjectileTargetCollision(projectile, target) {
    if (!projectile || !target || !target.mesh) {
      return false;
    }

    const projectilePos = projectile.position.clone();
    const targetPos = target.position || target.mesh.position;
    const velocity = projectile.userData?.velocity;

    // Scale radius based on velocity for faster projectiles
    const baseRadius = projectile.userData?.radius || 0.3;
    const velocityScale = velocity
      ? Math.min(velocity.length() * 0.1, 1.5)
      : 1.0;
    const projectileRadius = baseRadius * velocityScale;

    // For walls and towers, use precise box collision
    if (target.type === "wall" || target.type === "tower") {
      const box = target.boundingBox || this.getBoundingBox(target.mesh);
      return this.checkSphereBoxCollision(projectilePos, projectileRadius, box);
    }

    // For other objects, use sphere collision with improved radius calculation
    const collisionRadius = this.getCollisionRadius(target.type);
    const distance = projectilePos.distanceTo(targetPos);
    const totalRadius = collisionRadius + projectileRadius;

    // Log collision check for debugging
    console.log(`🔍 Collision check:`, {
      projectile: projectilePos,
      target: targetPos,
      distance: distance.toFixed(2),
      totalRadius: totalRadius.toFixed(2),
      targetType: target.type,
      collision: distance <= totalRadius,
    });

    return distance <= totalRadius;
  }

  getCollisionRadius(targetType) {
    const radii = {
      barrel: 1.0,
      wall: 2.0,
      tower: 3.0,
      siegeTower: 2.5,
      ground: 0.5,
      default: 1.0,
    };

    return Validation.sanitizeNumber(radii[targetType] || radii.default, 1.0);
  }

  getBoundingBox(object) {
    if (!object) return null;

    // Use cache for performance
    const objectId = object.uuid;
    const now = Date.now();

    if (
      this.boundingBoxCache.has(objectId) &&
      now - this.lastCacheUpdate < this.cacheTimeout
    ) {
      return this.boundingBoxCache.get(objectId);
    }

    const box = new THREE.Box3().setFromObject(object);

    // Validate box min/max
    box.min = Validation.sanitizeVector3(box.min);
    box.max = Validation.sanitizeVector3(box.max);

    this.boundingBoxCache.set(objectId, box);
    this.lastCacheUpdate = now;

    return box;
  }

  isOutOfBounds(position, bounds = null) {
    position = Validation.sanitizeVector3(position);

    const defaultBounds = {
      x: { min: -50, max: 50 },
      y: { min: -10, max: 100 },
      z: { min: -50, max: 50 },
    };

    const activeBounds = bounds || defaultBounds;

    const outOfBounds =
      position.x < activeBounds.x.min ||
      position.x > activeBounds.x.max ||
      position.y < activeBounds.y.min ||
      position.y > activeBounds.y.max ||
      position.z < activeBounds.z.min ||
      position.z > activeBounds.z.max;

    if (outOfBounds && this.debugMode) {
      console.log(`🚫 Projectile out of bounds:`, {
        position: position.toArray(),
        bounds: activeBounds,
      });
    }

    return outOfBounds;
  }

  // Sphere vs Box collision
  checkSphereBoxCollision(spherePos, sphereRadius, box) {
    if (!spherePos || !box) return false;

    spherePos = Validation.sanitizeVector3(spherePos);
    sphereRadius = Validation.sanitizeNumber(sphereRadius, 1.0);

    const closestPoint = box.clampPoint(spherePos, new THREE.Vector3());
    closestPoint.copy(Validation.sanitizeVector3(closestPoint));

    const distance = spherePos.distanceTo(closestPoint);
    return Validation.sanitizeNumber(distance, Infinity) <= sphereRadius;
  }

  // Ray casting for collision prediction
  checkRaycastCollision(projectile, targets) {
    const raycaster = new THREE.Raycaster();
    const velocity = projectile.userData.velocity;

    if (!velocity || velocity.length() === 0) return null;

    const direction = velocity.clone().normalize();
    raycaster.set(projectile.position, direction);

    const meshes = targets.map((target) => target.mesh).filter((mesh) => mesh);
    const intersects = raycaster.intersectObjects(meshes, true);

    if (intersects.length > 0) {
      const intersection = intersects[0];
      const distance = intersection.distance;
      const speed = velocity.length();
      const timeToImpact = distance / speed;

      console.log(`🎯 Raycast collision predicted:`, {
        target: intersection.object.userData?.type || "unknown",
        distance: distance.toFixed(2),
        timeToImpact: timeToImpact.toFixed(3),
      });

      // Only report collision if it's very close (within next frame)
      if (timeToImpact < 0.1) {
        return intersection;
      }
    }

    return null;
  }

  // Visualization helper
  visualizeCollisionBounds(target, scene) {
    const geometry = new THREE.SphereGeometry(
      this.getCollisionRadius(target.type),
      8,
      6
    );
    const material = new THREE.MeshBasicMaterial({
      color: 0xff0000,
      wireframe: true,
      transparent: true,
      opacity: 0.3,
    });

    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(target.position || target.mesh.position);
    sphere.name = `collision_bounds_${target.type}`;

    scene.add(sphere);

    // Remove after 2 seconds
    setTimeout(() => {
      scene.remove(sphere);
    }, 2000);
  }

  clearCache() {
    this.boundingBoxCache.clear();
    console.log("🧹 Collision detector cache cleared");
  }
}
