import * as THREE from "three";
import { materials } from "../materials.js";
import { Utils } from "../utils.js";
import { Validation } from "../validation.js";

export class Ammunition {
  constructor(scene) {
    this.scene = scene;
    this.barrels = [];
    this.stones = [];
    this.arrows = [];

    this.create();
  }

  create() {
    this.createBarrels();
    this.createStones();
    this.createArrows();
  }

  createBarrels() {
    // Explosive barrels
    for (let i = 0; i < 5; i++) {
      const barrelGeometry = new THREE.CylinderGeometry(1, 1.2, 2, 12);
      Validation.validateGeometry(barrelGeometry);

      const barrel = new THREE.Mesh(barrelGeometry, materials.wood);
      barrel.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(barrel.geometry.attributes.uv.array, 2)
      );

      // Validate and sanitize position
      const x = Utils.randomRange(-10, 10);
      const z = Utils.randomRange(-10, 10);
      barrel.position.set(x, 1, z);

      barrel.position.copy(
        Validation.sanitizeVector3(barrel.position, new THREE.Vector3(0, 1, 0))
      );

      barrel.castShadow = true;
      barrel.receiveShadow = true;
      barrel.userData = {
        type: "barrel",
        draggable: true,
        explosive: false,
        originalColor: 0x8b4513,
        isExploding: false,
        onExplode: (barrel) => {
          if (barrel.parent && !barrel.userData.isExploding) {
            barrel.userData.isExploding = true;
            const dummy = { mesh: barrel, type: "barrel", explosive: true };
            this.scene.collisionManager?.triggerBarrelExplosion(
              dummy,
              Validation.sanitizeVector3(barrel.position)
            );
          }
        },
      }; // Add metal bands
      for (let j = 0; j < 3; j++) {
        const bandGeometry = new THREE.TorusGeometry(1.1, 0.05, 8, 16);
        Validation.validateGeometry(bandGeometry);

        const band = new THREE.Mesh(bandGeometry, materials.metal);
        band.geometry.setAttribute(
          "uv2",
          new THREE.Float32BufferAttribute(band.geometry.attributes.uv.array, 2)
        );

        band.position.y = Validation.sanitizeNumber(-0.6 + j * 0.6, 0);
        band.rotation.x = Math.PI / 2;
        barrel.add(band);
      }

      this.scene.add(barrel);
      this.barrels.push(barrel);
    }
  }

  createStones() {
    // Base position for the stone pile
    const pileCenterX = 15;
    const pileCenterZ = -15;

    for (let i = 0; i < 15; i++) {
      const size = Math.random() * 0.3 + 0.2;
      const stoneGeometry = new THREE.SphereGeometry(size, 8, 6);
      Validation.validateGeometry(stoneGeometry); // It's good practice to validate geometry

      const stone = new THREE.Mesh(stoneGeometry, materials.stone);
      stone.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(stone.geometry.attributes.uv.array, 2)
      );

      // Calculate position for individual stone relative to the pile center
      const angle = (i / 15) * Math.PI * 2;
      const radiusFromPileCenter = Math.random() * 2 + 1; // How far from the center of the pile

      stone.position.set(
        pileCenterX + Math.cos(angle) * radiusFromPileCenter,
        size, // y position (height)
        pileCenterZ + Math.sin(angle) * radiusFromPileCenter
      );

      // Validate and sanitize the final position
      stone.position.copy(
        Validation.sanitizeVector3(
          stone.position,
          new THREE.Vector3(pileCenterX, size, pileCenterZ)
        )
      );

      stone.castShadow = true;
      stone.receiveShadow = true;

      // Set userData for individual stone
      stone.userData = {
        type: "stone", // Individual stone type
        draggable: true,
        // Add any other relevant properties for individual stones if needed
      };

      this.scene.add(stone);
      this.stones.push(stone); // Add individual stone to the array
    }
  }

  createArrows() {
    // Arrow bundle
    const arrowGroup = new THREE.Group();

    for (let i = 0; i < 20; i++) {
      const arrow = new THREE.Group(); // Shaft
      const shaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2, 8);
      const shaft = new THREE.Mesh(shaftGeometry, materials.wood);
      shaft.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(shaft.geometry.attributes.uv.array, 2)
      );
      arrow.add(shaft);

      // Arrowhead
      const headGeometry = new THREE.ConeGeometry(0.05, 0.2, 6);
      const head = new THREE.Mesh(headGeometry, materials.metal);
      head.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(head.geometry.attributes.uv.array, 2)
      );
      head.position.y = 1.1;
      arrow.add(head);

      // Fletching
      const fletchGeometry = new THREE.ConeGeometry(0.08, 0.3, 4);
      const fletchMaterial = new THREE.MeshLambertMaterial({ color: 0x228b22 });
      const fletch = new THREE.Mesh(fletchGeometry, fletchMaterial);
      fletch.position.y = -0.85;
      fletch.rotation.y = Math.PI;
      arrow.add(fletch);

      // Random positioning in bundle
      arrow.position.set(
        (Math.random() - 0.5) * 0.5,
        0,
        (Math.random() - 0.5) * 0.5
      );
      arrow.rotation.z = (Math.random() - 0.5) * 0.2;

      arrowGroup.add(arrow);
    }

    arrowGroup.position.set(15, 1, 15);
    arrowGroup.userData = { type: "arrows", draggable: true };
    this.scene.add(arrowGroup);
    this.arrows.push(arrowGroup);
  }
  explodeBarrel(barrel) {
    if (!barrel) return;

    // Remove barrel from the barrels array first
    const index = this.barrels.indexOf(barrel);
    if (index > -1) {
      this.barrels.splice(index, 1);
    }

    // Don't remove from scene here - let CollisionManager handle it

    // Create explosion effect
    const explosionGroup = new THREE.Group();

    // Main explosion sphere
    const explosionGeometry = new THREE.SphereGeometry(3, 8, 6);
    const explosionMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4500,
      transparent: true,
      opacity: 0.8,
    });
    const explosion = new THREE.Mesh(explosionGeometry, explosionMaterial);
    explosionGroup.add(explosion);

    // Particle effects
    for (let i = 0; i < 20; i++) {
      const particleGeometry = new THREE.SphereGeometry(0.1, 4, 4);
      const particleMaterial = new THREE.MeshBasicMaterial({
        color: Math.random() > 0.5 ? 0xff4500 : 0xffaa00,
      });
      const particle = new THREE.Mesh(particleGeometry, particleMaterial);

      particle.position.copy(barrel.position);
      particle.position.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 6,
          Math.random() * 3,
          (Math.random() - 0.5) * 6
        )
      );

      this.scene.add(particle);

      // Animate particle
      const startPos = particle.position.clone();
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 10,
        Math.random() * 8 + 2,
        (Math.random() - 0.5) * 10
      );

      const animateParticle = () => {
        velocity.y -= 0.2; // Gravity
        particle.position.add(velocity.clone().multiplyScalar(0.016));

        if (particle.position.y > 0) {
          requestAnimationFrame(animateParticle);
        } else {
          this.scene.remove(particle);
        }
      };

      requestAnimationFrame(animateParticle);
    }

    explosionGroup.position.copy(barrel.position);
    this.scene.add(explosionGroup);

    // Remove explosion effect after animation
    setTimeout(() => {
      this.scene.remove(explosionGroup);
    }, 1000);

    // Remove barrel
    this.scene.remove(barrel);
    const barelIndex = this.barrels.indexOf(barrel);
    if (barelIndex > -1) {
      this.barrels.splice(barelIndex, 1);
    }
  }
  checkCollisions(projectile) {
    if (!projectile || !projectile.userData.isProjectile) return;

    // Clean up any barrels that were removed from scene, exploding, or being dragged
    this.barrels = this.barrels.filter(
      (barrel) =>
        barrel.parent === this.scene &&
        !barrel.userData.isExploding &&
        !barrel.userData.isDragging
    );

    // Check collision with barrels
    this.barrels.forEach((barrel) => {
      if (!barrel.parent || barrel.userData.isExploding) return; // Skip if barrel was removed or exploding

      const distance = projectile.position.distanceTo(barrel.position);
      if (distance < 1.5) {
        // Remove projectile first
        if (projectile.parent) {
          projectile.parent.remove(projectile);
        }

        projectile.userData.hasCollided = true; // Mark as collided

        // Trigger barrel explosion through collision manager
        if (!barrel.userData.isExploding) {
          barrel.userData.isExploding = true; // Mark immediately to prevent duplicates

          // Ensure consistent state before triggering explosion
          if (barrel.userData.onExplode) {
            barrel.userData.onExplode(barrel);
          }
        }
      }
    });
  }
  update(deltaTime) {
    // Check for collisions with any active projectiles
    if (!this.scene) return;

    // Use a safer way to find projectiles - check only barrels for collisions
    const projectiles = [];
    this.scene.traverse((child) => {
      if (
        child.userData?.isProjectile &&
        child.userData.active &&
        !child.userData.hasCollided
      ) {
        projectiles.push(child);
      }
    });

    // Check each projectile against barrels
    projectiles.forEach((projectile) => {
      this.checkCollisions(projectile);
    });
  }

  reset() {
    // Remove existing ammunition
    this.barrels.forEach((barrel) => {
      if (
        barrel.userData &&
        barrel.userData.hasClonedMaterialForDamageState &&
        barrel.material
      ) {
        barrel.material.dispose();
      }
      this.scene.remove(barrel);
    });
    // Stones are now individual meshes
    this.stones.forEach((stone) => {
      if (
        stone.userData &&
        stone.userData.hasClonedMaterialForDamageState &&
        stone.material
      ) {
        stone.material.dispose();
      }
      this.scene.remove(stone);
    });
    this.arrows.forEach((arrowGroup) => {
      // Arrows are still groups
      arrowGroup.traverse((child) => {
        if (child.isMesh && child.material) {
          child.material.dispose();
        }
        if (child.geometry) {
          child.geometry.dispose();
        }
      });
      this.scene.remove(arrowGroup);
    });

    // Clear arrays
    this.barrels = [];
    this.stones = []; // Will store individual stone meshes
    this.arrows = [];

    // Recreate ammunition
    this.create();
  }
}
