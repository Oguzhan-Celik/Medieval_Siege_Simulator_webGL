import * as THREE from "three";
import { Utils } from "../../utils.js";

export class TorchParticles {
  constructor(parent, position) {
    this.parent = parent;
    this.position = position;
    this.particles = [];
    this.particleSystem = null;
    this.particlesPerSecond = 100; // Increased for more dense effect
    this.particleDeathAge = 1.0; // Shorter lifetime for faster movement
    this.particleSize = 0.15; // Smaller particles for more detail
    this.time = 0;

    this.initialize();
  }

  initialize() {
    // Create particle geometry
    const particleCount = Math.ceil(
      this.particlesPerSecond * this.particleDeathAge
    );
    const geometry = new THREE.BufferGeometry();

    // Create arrays for particle attributes
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const opacities = new Float32Array(particleCount);
    const ages = new Float32Array(particleCount);

    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute("size", new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute("opacity", new THREE.BufferAttribute(opacities, 1));
    geometry.setAttribute("age", new THREE.BufferAttribute(ages, 1));

    // Create material with custom shader
    const material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        pointTexture: {
          value: new THREE.TextureLoader().load(
            "textures/particles/smokeparticle.png"
          ),
        },
      },
      vertexShader: `
                attribute float size;
                attribute float opacity;
                attribute float age;
                attribute vec3 color;
                varying float vOpacity;
                varying vec3 vColor;
                void main() {
                    vOpacity = opacity;
                    vColor = color;
                    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
                    gl_Position = projectionMatrix * mvPosition;
                    gl_PointSize = size * (300.0 / -mvPosition.z);
                }
            `,
      fragmentShader: `
                uniform sampler2D pointTexture;
                varying float vOpacity;
                varying vec3 vColor;
                void main() {
                    vec4 texColor = texture2D(pointTexture, gl_PointCoord);
                    gl_FragColor = vec4(vColor, vOpacity) * texColor;
                }
            `,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    this.particleSystem = new THREE.Points(geometry, material);
    this.particleSystem.position.copy(this.position);
    this.parent.add(this.particleSystem);

    // Initialize particles
    for (let i = 0; i < particleCount; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        age: this.particleDeathAge,
        color: new THREE.Color(),
        size: 0,
        opacity: 0,
      });
    }
  }

  spawnParticle() {
    const particle = this.particles.find((p) => p.age >= this.particleDeathAge);
    if (!particle) return;

    // Reset particle properties
    const radius = 0.1;
    const angle = Math.random() * Math.PI * 2;

    particle.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius
    );
    particle.velocity.set(
      (Math.random() - 0.5) * 0.15, // Reduced spread
      0.8 + Math.random() * 0.7, // Faster upward movement
      (Math.random() - 0.5) * 0.15 // Reduced spread
    );

    particle.age = 0;
    particle.size = this.particleSize * (0.3 + Math.random() * 0.4); // Smaller size variation
    particle.opacity = 0;

    // Start with darker orange color for smoke effect
    particle.color.setHSL(
      0.07 + Math.random() * 0.03, // Slightly more orange
      0.8, // Less saturated
      0.3 + Math.random() * 0.1 // Darker
    );
  }

  update(deltaTime) {
    this.time += deltaTime;

    // Spawn new particles
    const particlesToSpawn = Math.floor(this.particlesPerSecond * deltaTime);
    for (let i = 0; i < particlesToSpawn; i++) {
      this.spawnParticle();
    }

    const positions = this.particleSystem.geometry.attributes.position.array;
    const colors = this.particleSystem.geometry.attributes.color.array;
    const sizes = this.particleSystem.geometry.attributes.size.array;
    const opacities = this.particleSystem.geometry.attributes.opacity.array;
    const ages = this.particleSystem.geometry.attributes.age.array;

    // Update particles
    this.particles.forEach((particle, i) => {
      if (particle.age < this.particleDeathAge) {
        // Update position
        particle.position.add(
          particle.velocity.clone().multiplyScalar(deltaTime)
        );

        // Add some swirl
        const swirl = Math.sin(this.time * 2 + particle.position.y) * 0.1;
        particle.position.x += swirl * deltaTime;
        particle.position.z += swirl * deltaTime;

        // Update age
        particle.age += deltaTime;

        // Calculate lifecycle phase (0 to 1)
        const phase = particle.age / this.particleDeathAge; // Update size and opacity based on lifecycle
        particle.size = this.particleSize * (1 + phase * 2); // Grow more as they rise
        particle.opacity =
          phase < 0.1 ? phase * 10 : phase > 0.7 ? (1 - phase) * 3.33 : 1;

        // Shift color towards gray/smoke as particle rises
        const hue = 0.09 - phase * 0.003; // Lose color as it rises
        const saturation = Math.max(0, 0.8 - phase); // Desaturate over time
        const lightness = 0.3 + phase * 0.2; // Get slightly lighter
        particle.color.setHSL(hue, saturation, lightness);
      }

      // Update buffers
      const i3 = i * 3;
      positions[i3] = particle.position.x;
      positions[i3 + 1] = particle.position.y;
      positions[i3 + 2] = particle.position.z;

      colors[i3] = particle.color.r;
      colors[i3 + 1] = particle.color.g;
      colors[i3 + 2] = particle.color.b;

      sizes[i] = particle.size;
      opacities[i] = particle.opacity;
      ages[i] = particle.age;
    });

    // Mark buffers for update
    this.particleSystem.geometry.attributes.position.needsUpdate = true;
    this.particleSystem.geometry.attributes.color.needsUpdate = true;
    this.particleSystem.geometry.attributes.size.needsUpdate = true;
    this.particleSystem.geometry.attributes.opacity.needsUpdate = true;
    this.particleSystem.geometry.attributes.age.needsUpdate = true;
  }
}
