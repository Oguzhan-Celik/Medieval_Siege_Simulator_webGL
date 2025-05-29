import * as THREE from "three";
import { Validation } from "./validation.js";

export class PhysicsEngine {
  constructor(scene) {
    this.scene = scene;
    this.gravity = -9.81;
    this.physicsObjects = [];
    this.collisionBounds = {
      ground: 0,
      walls: {
        minX: -50,
        maxX: 50,
        minZ: -50,
        maxZ: 50,
      },
    };
  }

  // Add object to physics simulation
  addObject(object, properties = {}) {
    const physicsData = {
      object: object,
      velocity: Validation.sanitizeVector3(
        properties.velocity,
        new THREE.Vector3(0, 0, 0)
      ),
      acceleration: Validation.sanitizeVector3(
        properties.acceleration,
        new THREE.Vector3(0, 0, 0)
      ),
      mass: Validation.sanitizeNumber(properties.mass, 1),
      restitution: Validation.sanitizeNumber(properties.restitution, 0.6),
      friction: Validation.sanitizeNumber(properties.friction, 0.8),
      isStatic: properties.isStatic || false,
      hasGravity: properties.hasGravity !== false,
      radius: Validation.sanitizeNumber(properties.radius, 1),
      collisionType: properties.collisionType || "sphere",
      onCollision: properties.onCollision || null,
      isActive: true,
    };

    this.physicsObjects.push(physicsData);
    return physicsData;
  }

  // Remove object from physics simulation
  removeObject(object) {
    const index = this.physicsObjects.findIndex((p) => p.object === object);
    if (index > -1) {
      this.physicsObjects.splice(index, 1);
    }
  }

  // Main physics update loop
  update(deltaTime) {
    // Clamp deltaTime to prevent instability
    deltaTime = Math.min(deltaTime, 1 / 30);

    this.scene.traverse((object) => {
      if (
        object.userData?.isProjectile &&
        object.userData.active &&
        !object.userData.hasCollided
      ) {
        const velocity = object.userData.velocity;
        const lastY = object.position.y;

        // Apply gravity
        velocity.y += object.userData.gravity * deltaTime;

        // Update position based on velocity
        object.position.x += velocity.x * deltaTime;
        object.position.y += velocity.y * deltaTime;
        object.position.z += velocity.z * deltaTime;

        // Ground collision check
        const groundHeight = 0.3;
        if (object.position.y <= groundHeight) {
          // Ensure we don't go below ground
          object.position.y = groundHeight;

          const speed = velocity.length();
          // Only bounce if moving fast enough and not too many bounces
          const maxBounces = object.userData.maxBounces || 3;

          if (
            speed > 1.0 &&
            (!object.userData.bounces || object.userData.bounces < maxBounces)
          ) {
            // Bounce with energy loss
            velocity.y = Math.abs(velocity.y) * 0.5; // Increased energy loss
            velocity.x *= 0.7; // More friction
            velocity.z *= 0.7;
            object.userData.bounces = (object.userData.bounces || 0) + 1;

            // Log bounce for debugging
            console.log("Bounce:", {
              bounceCount: object.userData.bounces,
              speed: speed.toFixed(2),
              newVelocity: velocity.toArray().map((v) => v.toFixed(2)),
            });

            // Trigger collision effect on each significant bounce
            if (object.userData.onCollision) {
              object.userData.onCollision("ground", {
                position: object.position.clone(),
                velocity: velocity.clone(),
                force: speed / 10,
              });
            }
          } else {
            // Stop if moving too slow or too many bounces
            velocity.set(0, 0, 0);
            object.userData.active = false;
            object.userData.hasCollided = true;

            // Final impact effect
            if (object.userData.onCollision) {
              object.userData.onCollision("ground", {
                position: object.position.clone(),
                velocity: velocity.clone(),
                force: speed / 10,
                final: true,
              });
            }

            console.log("Projectile stopped:", {
              reason: speed <= 1.0 ? "low speed" : "max bounces reached",
              finalSpeed: speed.toFixed(2),
              bounces: object.userData.bounces,
            });
          }
        }

        // Debug output
        console.log("Projectile physics:", {
          position: object.position.toArray().map((v) => v.toFixed(2)),
          velocity: velocity.toArray().map((v) => v.toFixed(2)),
          active: object.userData.active,
          bounces: object.userData.bounces || 0,
        });
      }
    });

    // Update other physics objects
    this.physicsObjects.forEach((physicsObj) => {
      if (!physicsObj.isActive || physicsObj.isStatic) return;

      this.updateVelocity(physicsObj, deltaTime);
      this.updatePosition(physicsObj, deltaTime);
      this.checkCollisions(physicsObj);
      this.applyConstraints(physicsObj);
    });

    // Check inter-object collisions
    this.checkInterObjectCollisions();
  }

  updateVelocity(physicsData, deltaTime) {
    if (!physicsData || !physicsData.velocity) return;

    // Apply gravity
    if (physicsData.hasGravity) {
      physicsData.acceleration.y = this.gravity;
    }

    // Update velocity with acceleration
    const deltaV = physicsData.acceleration.clone().multiplyScalar(deltaTime);
    physicsData.velocity.add(deltaV);

    // Validate and sanitize velocity
    physicsData.velocity = Validation.sanitizeVector3(physicsData.velocity);

    // Apply air resistance
    const airResistance = 0.99;
    physicsData.velocity.multiplyScalar(airResistance);
  }

  updatePosition(physicsData, deltaTime) {
    if (!physicsData || !physicsData.object || !physicsData.velocity) return;

    // Update position with velocity
    const deltaPosition = physicsData.velocity
      .clone()
      .multiplyScalar(deltaTime);

    // Validate delta position before applying
    const sanitizedDelta = Validation.sanitizeVector3(deltaPosition);
    physicsData.object.position.add(sanitizedDelta);

    // Validate final position
    physicsData.object.position.copy(
      Validation.sanitizeVector3(physicsData.object.position)
    );
  }

  checkCollisions(physicsData) {
    const pos = physicsData.object.position;
    const vel = physicsData.velocity;

    // Ground collision
    if (pos.y - physicsData.radius <= this.collisionBounds.ground) {
      pos.y = this.collisionBounds.ground + physicsData.radius;

      if (vel.y < 0) {
        vel.y = -vel.y * physicsData.restitution;

        // Apply friction when bouncing on ground
        vel.x *= physicsData.friction;
        vel.z *= physicsData.friction;

        // Stop very small bounces
        if (Math.abs(vel.y) < 0.5) {
          vel.y = 0;
        }
      }

      // Trigger collision callback
      if (physicsData.onCollision) {
        physicsData.onCollision("ground", physicsData);
      }
    }

    // Wall collisions
    const walls = this.collisionBounds.walls;

    // Left/Right walls
    if (pos.x - physicsData.radius <= walls.minX) {
      pos.x = walls.minX + physicsData.radius;
      vel.x = Math.abs(vel.x) * physicsData.restitution;
    } else if (pos.x + physicsData.radius >= walls.maxX) {
      pos.x = walls.maxX - physicsData.radius;
      vel.x = -Math.abs(vel.x) * physicsData.restitution;
    }

    // Front/Back walls
    if (pos.z - physicsData.radius <= walls.minZ) {
      pos.z = walls.minZ + physicsData.radius;
      vel.z = Math.abs(vel.z) * physicsData.restitution;
    } else if (pos.z + physicsData.radius >= walls.maxZ) {
      pos.z = walls.maxZ - physicsData.radius;
      vel.z = -Math.abs(vel.z) * physicsData.restitution;
    }
  }

  checkInterObjectCollisions() {
    for (let i = 0; i < this.physicsObjects.length; i++) {
      for (let j = i + 1; j < this.physicsObjects.length; j++) {
        const objA = this.physicsObjects[i];
        const objB = this.physicsObjects[j];

        if (!objA.isActive || !objB.isActive) continue;

        const distance = objA.object.position.distanceTo(objB.object.position);
        const minDistance = objA.radius + objB.radius;

        if (distance < minDistance) {
          this.resolveCollision(objA, objB, distance, minDistance);
        }
      }
    }
  }

  resolveCollision(objA, objB, distance, minDistance) {
    // Calculate collision normal
    const normal = new THREE.Vector3()
      .subVectors(objB.object.position, objA.object.position)
      .normalize();

    // Separate objects
    const overlap = minDistance - distance;
    const separation = normal.clone().multiplyScalar(overlap * 0.5);

    if (!objA.isStatic) objA.object.position.sub(separation);
    if (!objB.isStatic) objB.object.position.add(separation);

    // Calculate relative velocity
    const relativeVelocity = new THREE.Vector3().subVectors(
      objB.velocity,
      objA.velocity
    );

    const velocityAlongNormal = relativeVelocity.dot(normal);

    // Don't resolve if velocities are separating
    if (velocityAlongNormal > 0) return;

    // Calculate restitution
    const restitution = Math.min(objA.restitution, objB.restitution);

    // Calculate impulse scalar
    let impulseScalar = -(1 + restitution) * velocityAlongNormal;
    impulseScalar /= 1 / objA.mass + 1 / objB.mass;

    // Apply impulse
    const impulse = normal.clone().multiplyScalar(impulseScalar);

    if (!objA.isStatic) {
      objA.velocity.sub(impulse.clone().multiplyScalar(1 / objA.mass));
    }
    if (!objB.isStatic) {
      objB.velocity.add(impulse.clone().multiplyScalar(1 / objB.mass));
    }

    // Trigger collision callbacks
    if (objA.onCollision) objA.onCollision("object", objB);
    if (objB.onCollision) objB.onCollision("object", objA);
  }

  applyConstraints(physicsData) {
    // Stop very slow moving objects
    if (
      physicsData.velocity.length() < 0.1 &&
      physicsData.object.position.y <=
        this.collisionBounds.ground + physicsData.radius + 0.1
    ) {
      physicsData.velocity.set(0, 0, 0);
    }

    // Prevent objects from going underground
    if (physicsData.object.position.y < this.collisionBounds.ground) {
      physicsData.object.position.y =
        this.collisionBounds.ground + physicsData.radius;
      physicsData.velocity.y = 0;
    }
  }

  // Utility methods
  applyForce(object, force) {
    const physicsData = this.physicsObjects.find((p) => p.object === object);
    if (physicsData) {
      const acceleration = force.clone().divideScalar(physicsData.mass);
      physicsData.acceleration.add(acceleration);
    }
  }

  applyImpulse(object, impulse) {
    const physicsData = this.physicsObjects.find((p) => p.object === object);
    if (physicsData) {
      const deltaVelocity = impulse.clone().divideScalar(physicsData.mass);
      physicsData.velocity.add(deltaVelocity);
    }
  }

  setVelocity(object, velocity) {
    const physicsData = this.physicsObjects.find((p) => p.object === object);
    if (physicsData) {
      physicsData.velocity.copy(velocity);
    }
  }

  getVelocity(object) {
    const physicsData = this.physicsObjects.find((p) => p.object === object);
    return physicsData ? physicsData.velocity.clone() : new THREE.Vector3();
  }

  // Projectile-specific methods
  launchProjectile(object, initialVelocity, properties = {}) {
    const physicsProperties = {
      velocity: initialVelocity.clone(),
      mass: properties.mass || 1,
      radius: properties.radius || 0.5,
      restitution: properties.restitution || 0.3,
      friction: properties.friction || 0.9,
      hasGravity: true,
      onCollision: properties.onCollision,
      ...properties,
    };

    return this.addObject(object, physicsProperties);
  }

  // Explosion effect
  createExplosion(position, force, radius) {
    this.physicsObjects.forEach((physicsData) => {
      const distance = physicsData.object.position.distanceTo(position);

      if (distance < radius && !physicsData.isStatic) {
        const direction = new THREE.Vector3()
          .subVectors(physicsData.object.position, position)
          .normalize();

        const explosionForce = direction.multiplyScalar(
          force * (1 - distance / radius)
        );

        this.applyImpulse(physicsData.object, explosionForce);
      }
    });
  }

  // Clean up inactive objects
  cleanup() {
    this.physicsObjects = this.physicsObjects.filter((physicsData) => {
      // Remove objects that are too far away or inactive
      const pos = physicsData.object.position;
      const maxDistance = 100;

      if (pos.length() > maxDistance || !physicsData.isActive) {
        return false;
      }

      return true;
    });
  }

  reset() {
    this.physicsObjects = [];
  }

  // Debug visualization
  getDebugInfo() {
    return {
      activeObjects: this.physicsObjects.length,
      totalVelocity: this.physicsObjects.reduce(
        (sum, obj) => sum + obj.velocity.length(),
        0
      ),
    };
  }
}
