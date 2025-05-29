import { Utils } from "../utils.js";
import * as THREE from "three";
import { Validation } from "../validation.js"; // Assuming Validation might be useful
import { materials } from "../materials.js";

// Texture Loader for smoke particle
const textureLoader = new THREE.TextureLoader();
let smokeParticleTexture = null;
textureLoader.load(
  "textures/particles/smokeparticle.png",
  function (texture) {
    smokeParticleTexture = texture;
    console.log("Smoke particle texture loaded successfully.");
  },
  undefined, // onProgress callback not needed
  function (err) {
    console.error(
      "An error occurred loading the smoke particle texture: ",
      err
    );
  }
);

export class EffectsManager {
  constructor(scene) {
    this.scene = scene;
    this.animationTime = 0; // General timer for effects if needed

    // Throttling for frequent effects
    this.lastDustPosition = new THREE.Vector3();
    this.lastDustTime = 0;
    this.lastCraterPosition = new THREE.Vector3();
    this.lastCraterTime = 0;
    this.MIN_DUST_DISTANCE_SQR = 2.0 * 2.0; // Squared distance for efficiency
    this.MIN_DUST_INTERVAL = 200; // ms
    this.MIN_CRATER_DISTANCE_SQR = 4.0 * 4.0;
    this.MIN_CRATER_INTERVAL = 700;
  }

  async createExplosionEffect(position, scale = 1.0) {
    try {
      const explosionVolume = Utils.clamp(0.6 + scale * 0.4, 0.5, 1.0);
      await Utils.playSound("sounds/effects/explosion", explosionVolume);
    } catch (error) {
      console.warn("Failed to play explosion sound:", error);
    }

    const posVec =
      position instanceof THREE.Vector3
        ? position
        : new THREE.Vector3(position.x, position.y, position.z);

    // 1. Main Flash Light (Reduced intensity and duration slightly)
    const flashLight = new THREE.PointLight(
      0xffeeb8,
      4 * scale,
      25 * scale,
      1.8
    );
    flashLight.position.copy(posVec);
    this.scene.add(flashLight);
    let lightTime = 0;
    const flashDuration = 120 + 80 * scale; // Shorter flash
    const animateLight = () => {
      lightTime += 16;
      const progress = lightTime / flashDuration;
      if (progress >= 1) {
        if (flashLight.parent) this.scene.remove(flashLight);
        return;
      }
      flashLight.intensity = 4 * scale * (1 - Utils.easeOutQuad(progress));
      requestAnimationFrame(animateLight);
    };
    animateLight();

    // 2. Shockwave Ring (Simplified: faster fade, potentially smaller max radius)
    const shockwaveMaxRadiusBase = 7; // Reduced base max radius
    const shockwaveGeometry = new THREE.RingGeometry(
      0.1 * scale,
      0.8 * scale,
      24,
      1,
      0,
      Math.PI * 2
    ); // Fewer segments
    const shockwaveMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });
    const shockwave = new THREE.Mesh(shockwaveGeometry, shockwaveMaterial);
    shockwave.position.copy(posVec);
    shockwave.position.y += 0.1 * scale;
    shockwave.rotation.x = -Math.PI / 2;
    this.scene.add(shockwave);

    // 3. Core Explosion Particles (Fireball - Reduced count)
    const coreParticleCount = Math.floor(Utils.clamp(30 * scale, 15, 50)); // Reduced from 60
    const coreParticles = Utils.createParticleSystem(
      coreParticleCount,
      null,
      0.4 * scale
    ); // Slightly smaller base size
    if (coreParticles && coreParticles.material) {
      coreParticles.material.color.setHex(0xff6600);
      coreParticles.material.blending = THREE.AdditiveBlending;
      coreParticles.position.copy(posVec);
      this.scene.add(coreParticles);
    }

    // 4. Smoke Plume (Reduced count, uses texture)
    const smokeParticleCount = Math.floor(Utils.clamp(25 * scale, 10, 40)); // Reduced from 40
    const smokeParticles = Utils.createParticleSystem(
      smokeParticleCount,
      smokeParticleTexture,
      1.8 * scale
    ); // Larger base size for textured smoke
    if (smokeParticles && smokeParticles.material) {
      smokeParticles.material.color.setHex(0x444444); // Slightly lighter dark smoke if texture has alpha
      smokeParticles.material.opacity = 0.4; // Texture will handle visual density
      smokeParticles.material.transparent = true; // Ensure transparency for texture
      smokeParticles.material.depthWrite = false; // Good for transparent particles
      smokeParticles.position.copy(posVec);
      this.scene.add(smokeParticles);
    }

    // 5. Debris (Reduced count)
    if (scale >= 0.8) {
      this.createGenericDebrisEffect(
        posVec,
        Math.floor(Utils.clamp(scale * 3, 2, 8)),
        scale * 0.25,
        "stone"
      );
    }

    if (coreParticles || smokeParticles) {
      // Animate if at least one particle system exists
      this.animateExplosion(
        coreParticles,
        smokeParticles,
        shockwave,
        scale,
        posVec,
        shockwaveMaxRadiusBase
      );
    } else {
      if (shockwave.parent) this.scene.remove(shockwave);
    }
  }

  animateExplosion(
    core,
    smoke,
    shockwave,
    scale,
    origin,
    shockwaveMaxRadiusBase
  ) {
    let time = 0;
    const maxTime = 1200 + 400 * scale; // Shorter overall duration

    const coreParticleData =
      core && core.geometry
        ? this.initParticleVelocities(core, 2.5 * scale, 1.2 * scale)
        : []; // Reduced speeds
    const smokeParticleData =
      smoke && smoke.geometry
        ? this.initParticleVelocities(smoke, 1.5 * scale, 2.0 * scale, 0.4)
        : []; // Reduced speeds

    const shockwaveMaxRadius = shockwaveMaxRadiusBase * scale;

    const animate = () => {
      time += 16.67;
      const deltaTime = 0.01667;
      const progress = Math.min(time / maxTime, 1);

      if (core && core.geometry && core.material) {
        this.updateAnimatedParticles(
          core,
          coreParticleData,
          deltaTime,
          0.07 * scale,
          0.97
        ); // Slightly increased gravity/drag
        core.material.opacity = Math.max(0, (1 - progress) * (1 - progress));
        const coreScale =
          Utils.easeOutQuad(Math.min(progress * 3.5, 1)) *
          (1 + (1 - progress) * 1.5);
        core.scale.setScalar(coreScale * scale * 0.6);
      }

      if (smoke && smoke.geometry && smoke.material) {
        this.updateAnimatedParticles(
          smoke,
          smokeParticleData,
          deltaTime,
          -0.15 * scale,
          0.95
        ); // Smoke rises faster, more drag
        smoke.material.opacity = Math.max(0, (1 - progress) * 0.5); // Texture will help with visual density
        const smokeScale =
          Utils.easeOutQuad(Math.min(progress * 1.2, 1)) * (1 + progress * 2.0);
        smoke.scale.setScalar(smokeScale * scale);
      }

      const shockwaveProgress = Math.min(time / (maxTime * 0.25), 1); // Faster shockwave animation
      if (shockwave.parent) {
        if (shockwaveProgress < 1) {
          const currentRadius =
            Utils.easeOutCubic(shockwaveProgress) * shockwaveMaxRadius;
          shockwave.scale.set(currentRadius, currentRadius, currentRadius);
          shockwave.material.opacity =
            0.5 * (1 - shockwaveProgress * shockwaveProgress); // Faster fade
        } else {
          this.scene.remove(shockwave);
        }
      }

      if (progress >= 1) {
        if (core && core.parent) this.scene.remove(core);
        if (smoke && smoke.parent) this.scene.remove(smoke);
        if (shockwave.parent) this.scene.remove(shockwave);
        return;
      }

      requestAnimationFrame(animate);
    };
    animate();
  }

  initParticleVelocities(
    particleSystem,
    initialSpeedRange,
    upwardBias = 0,
    spreadFactor = 1
  ) {
    if (
      !particleSystem ||
      !particleSystem.geometry ||
      !particleSystem.geometry.attributes.position
    ) {
      return [];
    }
    const positions = particleSystem.geometry.attributes.position;
    const velocities = [];
    for (let i = 0; i < positions.count; i++) {
      const speed = Math.random() * initialSpeedRange;
      const velocity = new THREE.Vector3(
        (Math.random() - 0.5) * 2 * spreadFactor,
        (Math.random() - 0.5) * 2 * spreadFactor + upwardBias,
        (Math.random() - 0.5) * 2 * spreadFactor
      )
        .normalize()
        .multiplyScalar(speed);
      velocities.push(velocity);
    }
    return velocities;
  }

  updateAnimatedParticles(
    particleSystem,
    velocities,
    deltaTime,
    gravityY,
    dragFactor
  ) {
    if (
      !particleSystem ||
      !particleSystem.geometry ||
      !particleSystem.geometry.attributes.position ||
      velocities.length === 0
    ) {
      return;
    }
    const positions = particleSystem.geometry.attributes.position;
    if (positions.count !== velocities.length) {
      return;
    }
    for (let i = 0; i < positions.count; i++) {
      if (!velocities[i]) continue;
      velocities[i].y -= gravityY * deltaTime;
      velocities[i].multiplyScalar(dragFactor);

      positions.setXYZ(
        i,
        positions.getX(i) + velocities[i].x * deltaTime,
        positions.getY(i) + velocities[i].y * deltaTime,
        positions.getZ(i) + velocities[i].z * deltaTime
      );
    }
    positions.needsUpdate = true;
  }

  async createDustEffect(position, force = 1.0) {
    const posVec =
      position instanceof THREE.Vector3
        ? position.clone()
        : new THREE.Vector3(position.x, position.y, position.z);
    const now = Date.now();

    if (this.lastDustPosition && this.lastDustTime) {
      const timeDiff = now - this.lastDustTime;
      const distanceSqr = posVec.distanceToSquared(this.lastDustPosition);
      if (
        timeDiff < this.MIN_DUST_INTERVAL &&
        distanceSqr < this.MIN_DUST_DISTANCE_SQR
      ) {
        return;
      }
    }
    this.lastDustPosition.copy(posVec);
    this.lastDustTime = now;

    const particleCount = Math.floor(Utils.clamp(force * 20, 10, 40)); // Reduced particle count
    const baseSize = Utils.clamp(force * 0.6, 0.4, 1.2); // Slightly larger for texture

    const dust = Utils.createParticleSystem(
      particleCount,
      smokeParticleTexture,
      baseSize
    ); // Use smoke texture
    if (!dust || !dust.material) return;

    dust.material.color.setHSL(0.1, 0.15, 0.6 + Math.random() * 0.1); // More greyish-brown
    dust.material.opacity = 0.0;
    dust.material.transparent = true;
    dust.material.depthWrite = false;
    dust.material.blending = THREE.NormalBlending;
    dust.position.copy(posVec);
    dust.position.y += 0.15 * force;
    this.scene.add(dust);

    const particleData = this.initParticleVelocities(
      dust,
      0.8 * force,
      0.6 * force,
      1.0
    );
    let time = 0;
    const duration = 1000 + force * 500; // Shorter duration

    const animateDust = () => {
      time += 16.67;
      const deltaTime = 0.01667;
      const progress = Math.min(time / duration, 1);

      this.updateAnimatedParticles(
        dust,
        particleData,
        deltaTime,
        0.25 * force,
        0.96
      ); // Slightly more gravity

      if (progress < 0.4) {
        dust.material.opacity = Utils.easeOutQuad(progress / 0.4) * 0.5; // Max opacity 0.5
      } else {
        dust.material.opacity =
          Utils.easeInQuad(1 - (progress - 0.4) / 0.6) * 0.5;
      }

      const currentScale = 1 + Utils.easeOutQuad(progress) * 0.3 * force;
      dust.scale.setScalar(currentScale);

      if (progress >= 1) {
        if (dust.parent) this.scene.remove(dust);
        return;
      }
      requestAnimationFrame(animateDust);
    };
    animateDust();
  }

  createGenericDebrisEffect(position, count, scale, materialType = "stone") {
    const baseSize = 0.2 * scale;
    let debrisMaterial;

    if (!materials.initialized) {
      console.warn(
        "Materials not initialized. Skipping generic debris effect."
      );
      return;
    }

    switch (materialType) {
      case "wood":
        debrisMaterial = materials.wood
          ? materials.wood.clone()
          : new THREE.MeshStandardMaterial({ color: 0x8b4513 });
        break;
      case "metal":
        debrisMaterial = materials.metal
          ? materials.metal.clone()
          : new THREE.MeshStandardMaterial({ color: 0x808080 });
        break;
      case "stone":
      default:
        debrisMaterial = materials.stone
          ? materials.stone.clone()
          : new THREE.MeshStandardMaterial({ color: 0x696969 });
        break;
    }
    if (debrisMaterial) {
      // Check if material was successfully created/cloned
      debrisMaterial.color.multiplyScalar(0.8 + Math.random() * 0.2);
    } else {
      // Fallback if cloning failed for some reason
      debrisMaterial = new THREE.MeshStandardMaterial({ color: 0x555555 });
    }

    for (let i = 0; i < count; i++) {
      const size = baseSize * (0.5 + Math.random() * 0.8);
      let debrisGeo;
      const type = Math.random();
      if (type < 0.5) debrisGeo = new THREE.BoxGeometry(size, size, size);
      else if (type < 0.8)
        debrisGeo = new THREE.DodecahedronGeometry(size / 1.5, 0);
      else debrisGeo = new THREE.TetrahedronGeometry(size / 1.3, 0);

      Validation.validateGeometry(debrisGeo);
      const debris = new THREE.Mesh(debrisGeo, debrisMaterial);

      debris.position.copy(position);
      debris.position.add(
        new THREE.Vector3(
          (Math.random() - 0.5) * 0.5 * scale,
          Math.random() * 0.5 * scale,
          (Math.random() - 0.5) * 0.5 * scale
        )
      );

      debris.rotation.set(
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2,
        Math.random() * Math.PI * 2
      );
      Utils.enableShadows(debris);
      this.scene.add(debris);

      this.animateDebris(debris, {
        initialVelocity: {
          x: (Math.random() - 0.5) * 5 * scale, // Reduced velocity
          y: Math.random() * 4 * scale + 1.5 * scale,
          z: (Math.random() - 0.5) * 5 * scale,
        },
        rotationSpeed: {
          x: (Math.random() - 0.5) * Math.PI * 1.5,
          y: (Math.random() - 0.5) * Math.PI * 1.5,
          z: (Math.random() - 0.5) * Math.PI * 1.5,
        },
        bounce: 0.25 + Math.random() * 0.15, // Less bounce
        life: 2500 + Math.random() * 1500, // Shorter life
      });
    }
  }

  async createStoneDebrisEffect(position) {
    try {
      await Utils.playSound("sounds/effects/stone_impact", 0.7);
    } catch (error) {
      console.warn("Failed to play stone break sound:", error);
    }
    this.createGenericDebrisEffect(
      position,
      Utils.randomInt(4, 7),
      0.9,
      "stone"
    ); // Reduced count & scale
    this.createDustEffect(position, 1.0); // Slightly less dust
  }

  async createWoodDebrisEffect(position) {
    const debrisCount = Utils.randomInt(5, 8); // Reduced count
    for (let i = 0; i < debrisCount; i++) {
      const isSplinter = Math.random() > 0.5;
      const length = Utils.randomRange(0.25, 0.7);
      const width = isSplinter
        ? Utils.randomRange(0.04, 0.08)
        : Utils.randomRange(0.15, 0.3);
      const depth = isSplinter
        ? Utils.randomRange(0.04, 0.08)
        : Utils.randomRange(0.15, 0.3);

      const debris = Utils.createBox(width, length, depth, 0x8b4513);
      if (materials.wood && materials.initialized) {
        debris.material = materials.wood.clone();
        debris.material.color.multiplyScalar(0.7 + Math.random() * 0.3);
      }

      debris.position.copy(position);
      debris.position.x += Utils.randomRange(-0.7, 0.7);
      debris.position.y += Utils.randomRange(0.25, 1.2);
      debris.position.z += Utils.randomRange(-0.7, 0.7);

      debris.rotation.x = Math.random() * Math.PI;
      debris.rotation.y = Math.random() * Math.PI;
      debris.rotation.z = Math.random() * Math.PI;

      Utils.enableShadows(debris);
      this.scene.add(debris);
      this.animateDebris(debris, {
        bounce: 0.15,
        life: 2000 + Math.random() * 1000, // Shorter life
        initialVelocity: {
          x: (Math.random() - 0.5) * 3.5,
          y: Math.random() * 3.5 + 1.5,
          z: (Math.random() - 0.5) * 3.5,
        },
        rotationSpeed: {
          x: (Math.random() - 0.5) * Math.PI * 2.5,
          y: (Math.random() - 0.5) * Math.PI * 2.5,
          z: (Math.random() - 0.5) * Math.PI * 2.5,
        },
      });
    }
    this.createDustEffect(position, 0.6);
  }

  async createSiegeHitEffect(position) {
    try {
      await Utils.playSound("sounds/effects/metal_clang", 0.8);
    } catch (error) {
      console.warn("Failed to play spark sound:", error);
    }

    const sparkCount = Utils.randomInt(10, 20); // Reduced count
    const sparks = Utils.createParticleSystem(sparkCount, null, 0.07);
    if (!sparks || !sparks.material) return;

    sparks.material.color.setHex(0xffddaa); // Slightly less intense yellow
    sparks.material.blending = THREE.AdditiveBlending;
    sparks.position.copy(position);
    this.scene.add(sparks);

    const particleData = this.initParticleVelocities(sparks, 4, 0.4, 1.2); // Reduced speed
    let time = 0;
    const duration = 500 + Math.random() * 300; // Shorter duration

    const animateSparks = () => {
      time += 16.67;
      const deltaTime = 0.01667;
      const progress = Math.min(time / duration, 1);

      this.updateAnimatedParticles(sparks, particleData, deltaTime, 2.2, 0.94); // Slightly more gravity/drag

      sparks.material.opacity = Math.max(0, 1 - progress * progress * progress); // Faster fade

      if (progress >= 1) {
        if (sparks.parent) this.scene.remove(sparks);
        return;
      }
      requestAnimationFrame(animateSparks);
    };
    animateSparks();
  }

  async createCraterEffect(position, force) {
    const posVec =
      position instanceof THREE.Vector3
        ? position.clone()
        : new THREE.Vector3(position.x, position.y, position.z);
    const now = Date.now();

    if (this.lastCraterPosition && this.lastCraterTime) {
      const timeDiff = now - this.lastCraterTime;
      const distanceSqr = posVec.distanceToSquared(this.lastCraterPosition);
      if (
        timeDiff < this.MIN_CRATER_INTERVAL &&
        distanceSqr < this.MIN_CRATER_DISTANCE_SQR
      ) {
        return;
      }
    }
    this.lastCraterPosition.copy(posVec);
    this.lastCraterTime = now;

    try {
      await Utils.playSound(
        "sounds/effects/impact",
        Utils.clamp(force * 0.4, 0.3, 0.8)
      );
    } catch (error) {
      console.warn("Failed to play crater sound:", error);
    }

    const craterSize = Utils.clamp(force * 0.5, 0.4, 2.0); // Reduced max size
    const craterDepth = craterSize * 0.25;

    const depressionGeo = new THREE.CircleGeometry(craterSize, 24); // Fewer segments
    const depressionMat = new THREE.MeshLambertMaterial({
      color: 0x4a4238,
      transparent: true,
      opacity: 0.65,
    });
    const depression = new THREE.Mesh(depressionGeo, depressionMat);
    depression.rotation.x = -Math.PI / 2;
    depression.position.copy(posVec);
    depression.position.y = 0.01;
    this.scene.add(depression);

    const rimGeo = new THREE.RingGeometry(
      craterSize * 0.7,
      craterSize * 1.1,
      24
    ); // Fewer segments
    const rimMat = new THREE.MeshStandardMaterial({
      color: 0x5c5346,
      roughness: 0.85, // Slightly rougher
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75,
    });
    const rim = new THREE.Mesh(rimGeo, rimMat);
    rim.rotation.x = -Math.PI / 2;
    rim.position.copy(posVec);
    rim.position.y = 0.015 + craterDepth * 0.15; // Lower rim
    this.scene.add(rim);

    // Reduced debris for crater
    this.createGenericDebrisEffect(
      posVec,
      Math.floor(Utils.clamp(force * 2, 1, 5)),
      0.08 * force,
      "stone"
    );

    const duration = 6000 + force * 1500; // Slightly shorter duration
    let time = 0;

    const animateCrater = () => {
      time += 100;
      const progress = Math.min(time / duration, 1);
      const opacity = Utils.easeInCubic(1 - progress);

      depression.material.opacity = opacity * 0.65;
      rim.material.opacity = opacity * 0.75;

      if (progress >= 1) {
        if (depression.parent) this.scene.remove(depression);
        if (rim.parent) this.scene.remove(rim);
        return;
      }
      requestAnimationFrame(animateCrater);
    };
    animateCrater();
  }

  animateDebris(debris, params = {}) {
    const velocity = new THREE.Vector3(
      params.initialVelocity?.x || Utils.randomRange(-2, 2),
      params.initialVelocity?.y || Utils.randomRange(2, 5),
      params.initialVelocity?.z || Utils.randomRange(-2, 2)
    );
    const rotationSpeed = new THREE.Vector3(
      params.rotationSpeed?.x || Utils.randomRange(-Math.PI, Math.PI),
      params.rotationSpeed?.y || Utils.randomRange(-Math.PI, Math.PI),
      params.rotationSpeed?.z || Utils.randomRange(-Math.PI, Math.PI)
    );
    const bounceFactor = params.bounce || 0.4;
    const groundFriction = 0.85;
    const airDrag = 0.985;
    const gravity = 9.81;
    const lifespan = params.life || Utils.randomRange(3000, 6000);

    let timeAlive = 0;
    let isResting = false;
    let restTime = 0;

    const animateFrame = () => {
      const deltaTime = 0.01667;
      timeAlive += 16.67;

      if (isResting) {
        restTime += 16.67;
        if (restTime > 1500) {
          if (debris.material.transparent === false)
            debris.material.transparent = true;
          debris.material.opacity = Math.max(0, debris.material.opacity - 0.02);
          if (debris.material.opacity <= 0) {
            if (debris.parent) this.scene.remove(debris);
            if (debris.geometry) debris.geometry.dispose();
            if (
              debris.material &&
              debris.material !== materials.wood &&
              debris.material !== materials.stone &&
              debris.material !== materials.metal
            ) {
              debris.material.dispose();
            }
            return;
          }
        }
      } else {
        velocity.y -= gravity * deltaTime;
        velocity.multiplyScalar(airDrag);

        debris.position.add(velocity.clone().multiplyScalar(deltaTime));

        const speed = velocity.length();
        const rotationScale = Math.min(speed * 0.2, 1.0);

        debris.rotation.x += rotationSpeed.x * deltaTime * rotationScale;
        debris.rotation.y += rotationSpeed.y * deltaTime * rotationScale;
        debris.rotation.z += rotationSpeed.z * deltaTime * rotationScale;

        const debrisRadius =
          (debris.geometry.parameters.width ||
            debris.geometry.parameters.radius ||
            0.1) * 0.5;

        if (debris.position.y - debrisRadius <= 0.0) {
          debris.position.y = debrisRadius;
          if (Math.abs(velocity.y) > 0.2) {
            velocity.y *= -bounceFactor;
            velocity.x *= 1 - (1 - groundFriction) * (1 - bounceFactor);
            velocity.z *= 1 - (1 - groundFriction) * (1 - bounceFactor);
            rotationSpeed.multiplyScalar(0.8);
            if (speed > 1.0)
              this.createDustEffect(debris.position.clone().setY(0), 0.1);
          } else {
            velocity.y = 0;
            velocity.x *= groundFriction;
            velocity.z *= groundFriction;
            rotationSpeed.multiplyScalar(0.9);
          }
          if (velocity.lengthSq() < 0.01) {
            isResting = true;
            if (debris.material) debris.material.opacity = 1.0;
          }
        }
      }

      if (timeAlive > lifespan && !isResting) {
        isResting = true;
        restTime = 1501;
        if (debris.material) debris.material.opacity = 1.0;
      }

      if (debris.parent) {
        requestAnimationFrame(animateFrame);
      }
    };
    animateFrame();
  }

  createDamageParticles(position, damage) {
    const particleCount = Math.floor(Utils.clamp(damage / 8, 3, 10)); // Reduced count
    const baseSize = Utils.clamp(damage / 60, 0.08, 0.3); // Reduced size
    const hitSparks = Utils.createParticleSystem(particleCount, null, baseSize);
    if (!hitSparks || !hitSparks.material) return;

    const r = 1.0;
    const g = Utils.clamp(1.0 - damage / 100, 0, 0.5);
    const b = Utils.clamp(1.0 - damage / 100, 0, 0.2);
    hitSparks.material.color.setRGB(r, g, b);
    hitSparks.material.blending = THREE.AdditiveBlending;

    hitSparks.position.copy(position);
    this.scene.add(hitSparks);

    const particleData = this.initParticleVelocities(hitSparks, 1.5, 0.3); // Reduced speed
    let time = 0;
    const duration = 300 + Math.random() * 200; // Shorter duration

    const animateHit = () => {
      time += 16.67;
      const deltaTime = 0.01667;
      const progress = Math.min(time / duration, 1);

      this.updateAnimatedParticles(
        hitSparks,
        particleData,
        deltaTime,
        0.8,
        0.95
      );
      hitSparks.material.opacity = Math.max(0, 1 - progress * progress);

      if (progress >= 1) {
        if (hitSparks.parent) this.scene.remove(hitSparks);
        return;
      }
      requestAnimationFrame(animateHit);
    };
    animateHit();
  }

  updateFireEffect(fireObject, torchLight, torchSliderValue) {
    this.animationTime += 0.01667;

    if (fireObject && fireObject.particles && fireObject.particles.update) {
      fireObject.particles.update(0.01667);

      const torchGroup = torchLight.parent;
      if (!torchGroup) return;

      const lights = torchGroup.children.filter((child) => child.isPointLight);

      if (lights.length > 0) {
        const baseIntensity = Utils.map(torchSliderValue, 0, 100, 0.1, 3.0);

        lights.forEach((light, index) => {
          const timeOffset = index * 0.77;
          let flicker =
            Math.sin((this.animationTime * 5 + timeOffset) * 2.1) * 0.15;
          flicker +=
            Math.sin((this.animationTime * 2 + timeOffset) * 1.3) * 0.25;
          flicker += (Math.random() - 0.5) * 0.1;

          let currentIntensity;
          if (light === torchLight) {
            currentIntensity = baseIntensity * (0.8 + flicker * 0.5);
            light.intensity = Utils.clamp(currentIntensity, 0.1, 3.5);
          } else {
            currentIntensity =
              baseIntensity * (0.3 + flicker * 0.3) * (1.0 - index * 0.1);
            light.intensity = Utils.clamp(currentIntensity, 0.05, 1.5);
          }

          const normalizedIntensity = Utils.map(
            light.intensity,
            0.05,
            3.5,
            0,
            1
          );
          const r = 1.0;
          const g = Utils.lerp(0.4, 0.8, normalizedIntensity);
          const b = Utils.lerp(0.1, 0.3, normalizedIntensity);
          light.color.setRGB(r, g, b);

          if (light.shadow && light === torchLight) {
            light.shadow.radius = Utils.map(light.intensity, 0.1, 3.5, 3, 1);
            light.shadow.bias = -0.001 - normalizedIntensity * 0.001;
          }
        });
      }
    }
  }
}
