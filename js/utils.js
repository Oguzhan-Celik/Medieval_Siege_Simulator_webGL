import * as THREE from "three";
import { Validation } from "./validation.js";

export class Utils {
  // Mathematical utilities
  static clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  static lerp(start, end, factor) {
    return start + (end - start) * factor;
  }

  static smoothstep(edge0, edge1, x) {
    const t = this.clamp((x - edge0) / (edge1 - edge0), 0, 1);
    return t * t * (3 - 2 * t);
  }

  static map(value, inMin, inMax, outMin, outMax) {
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }

  static degToRad(degrees) {
    return degrees * (Math.PI / 180);
  }

  static radToDeg(radians) {
    return (radians * 180) / Math.PI;
  }

  static randomRange(min, max) {
    const val = Math.random() * (max - min) + min;
    return Validation.sanitizeNumber(val, (max + min) / 2);
  }

  static randomInt(min, max) {
    const val = Math.floor(Math.random() * (max - min + 1)) + min;
    return Validation.sanitizeNumber(val, Math.floor((max + min) / 2));
  }

  // Vector utilities
  static distance2D(pos1, pos2) {
    pos1 = Validation.sanitizeVector3(pos1);
    pos2 = Validation.sanitizeVector3(pos2);
    const dx = pos1.x - pos2.x;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dz * dz);
  }

  static distance3D(pos1, pos2) {
    pos1 = Validation.sanitizeVector3(pos1);
    pos2 = Validation.sanitizeVector3(pos2);
    const dx = pos1.x - pos2.x;
    const dy = pos1.y - pos2.y;
    const dz = pos1.z - pos2.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  static normalize2D(vector) {
    if (!vector) return { x: 0, z: 0 };

    const x = Validation.sanitizeNumber(vector.x, 0);
    const z = Validation.sanitizeNumber(vector.z, 0);
    const length = Math.sqrt(x * x + z * z);

    if (length === 0) return { x: 0, z: 0 };
    return {
      x: Validation.sanitizeNumber(x / length, 0),
      z: Validation.sanitizeNumber(z / length, 0),
    };
  }

  static angleBetween2D(pos1, pos2) {
    return Math.atan2(pos2.z - pos1.z, pos2.x - pos1.x);
  }

  static rotateVector2D(vector, angle) {
    if (!vector) return { x: 0, z: 0 };

    const x = Validation.sanitizeNumber(vector.x, 0);
    const z = Validation.sanitizeNumber(vector.z, 0);
    const sanitizedAngle = Validation.sanitizeNumber(angle, 0);

    const cos = Math.cos(sanitizedAngle);
    const sin = Math.sin(sanitizedAngle);

    return {
      x: Validation.sanitizeNumber(x * cos - z * sin, 0),
      z: Validation.sanitizeNumber(x * sin + z * cos, 0),
    };
  }

  // Physics utilities
  static calculateTrajectory(initialVelocity, angle, gravity = 9.8) {
    const vx = initialVelocity * Math.cos(angle);
    const vy = initialVelocity * Math.sin(angle);
    const timeOfFlight = (2 * vy) / gravity;
    const range = vx * timeOfFlight;
    const maxHeight = (vy * vy) / (2 * gravity);

    return {
      timeOfFlight,
      range,
      maxHeight,
      initialVelocityX: vx,
      initialVelocityY: vy,
    };
  }

  static getPositionAtTime(initialPos, initialVel, time, gravity = 9.8) {
    return {
      x: initialPos.x + initialVel.x * time,
      y: initialPos.y + initialVel.y * time - 0.5 * gravity * time * time,
      z: initialPos.z + initialVel.z * time,
    };
  }

  // Collision detection utilities
  static sphereToSphere(pos1, radius1, pos2, radius2) {
    const distance = this.distance3D(pos1, pos2);
    return distance < radius1 + radius2;
  }

  static pointInSphere(point, sphereCenter, radius) {
    return this.distance3D(point, sphereCenter) <= radius;
  }

  static boxToBox(pos1, size1, pos2, size2) {
    return (
      Math.abs(pos1.x - pos2.x) < (size1.x + size2.x) / 2 &&
      Math.abs(pos1.y - pos2.y) < (size1.y + size2.y) / 2 &&
      Math.abs(pos1.z - pos2.z) < (size1.z + size2.z) / 2
    );
  }

  // Color utilities
  static hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  }

  static rgbToHex(r, g, b) {
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
  }

  static lerpColor(color1, color2, factor) {
    const c1 = new THREE.Color(color1);
    const c2 = new THREE.Color(color2);
    return c1.lerp(c2, factor);
  }

  // Animation utilities
  static easeInQuad(t) {
    return t * t;
  }

  static easeOutQuad(t) {
    return t * (2 - t);
  }

  static easeInOutQuad(t) {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  static easeInCubic(t) {
    return t * t * t;
  }

  static easeOutCubic(t) {
    return --t * t * t + 1;
  }

  static bounce(t) {
    if (t < 1 / 2.75) {
      return 7.5625 * t * t;
    } else if (t < 2 / 2.75) {
      return 7.5625 * (t -= 1.5 / 2.75) * t + 0.75;
    } else if (t < 2.5 / 2.75) {
      return 7.5625 * (t -= 2.25 / 2.75) * t + 0.9375;
    } else {
      return 7.5625 * (t -= 2.625 / 2.75) * t + 0.984375;
    }
  }

  // Geometry utilities
  static createBox(width, height, depth, color = 0xffffff) {
    width = Validation.sanitizeNumber(width, 1);
    height = Validation.sanitizeNumber(height, 1);
    depth = Validation.sanitizeNumber(depth, 1);

    const geometry = new THREE.BoxGeometry(width, height, depth);
    Validation.validateGeometry(geometry);
    const material = new THREE.MeshLambertMaterial({ color });
    return new THREE.Mesh(geometry, material);
  }

  static createCylinder(
    radiusTop,
    radiusBottom,
    height,
    color = 0xffffff,
    segments = 8
  ) {
    radiusTop = Validation.sanitizeNumber(radiusTop, 0.5);
    radiusBottom = Validation.sanitizeNumber(radiusBottom, 0.5);
    height = Validation.sanitizeNumber(height, 1);
    segments = Validation.sanitizeNumber(segments, 8);

    const geometry = new THREE.CylinderGeometry(
      radiusTop,
      radiusBottom,
      height,
      segments
    );
    Validation.validateGeometry(geometry);
    const material = new THREE.MeshLambertMaterial({ color });
    return new THREE.Mesh(geometry, material);
  }

  static createSphere(radius, color = 0xffffff, segments = 8) {
    radius = Validation.sanitizeNumber(radius, 0.5);
    segments = Validation.sanitizeNumber(segments, 8);

    const geometry = new THREE.SphereGeometry(radius, segments, segments);
    Validation.validateGeometry(geometry);
    const material = new THREE.MeshLambertMaterial({ color });
    return new THREE.Mesh(geometry, material);
  }

  // Mesh utilities
  static centerMesh(mesh) {
    if (!mesh || !mesh.geometry) return;

    Validation.validateGeometry(mesh.geometry);
    const box = new THREE.Box3().setFromObject(mesh);
    const center = box.getCenter(new THREE.Vector3());
    mesh.position.sub(center);
  }

  static scaleMesh(mesh, scale) {
    if (typeof scale === "number") {
      mesh.scale.set(scale, scale, scale);
    } else {
      mesh.scale.copy(scale);
    }
  }

  static enableShadows(mesh, cast = true, receive = true) {
    mesh.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = cast;
        child.receiveShadow = receive;
      }
    });
  }

  // Game utilities
  static formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, "0")}:${remainingSeconds
      .toString()
      .padStart(2, "0")}`;
  }

  static formatNumber(num, decimals = 0) {
    return num.toFixed(decimals);
  }

  static getRandomMedievalName() {
    const names = [
      "Stoneheart",
      "Ironfist",
      "Dragonbane",
      "Stormwind",
      "Goldbeard",
      "Shadowblade",
      "Fireborn",
      "Iceguard",
      "Thunderstrike",
      "Battleaxe",
      "Moonwhisper",
      "Sunforge",
      "Starbreaker",
      "Nightfall",
      "Dawnbringer",
    ];
    return names[Math.floor(Math.random() * names.length)];
  }

  // Performance utilities
  static throttle(func, limit) {
    let inThrottle;
    return function () {
      const args = arguments;
      const context = this;
      if (!inThrottle) {
        func.apply(context, args);
        inThrottle = true;
        setTimeout(() => (inThrottle = false), limit);
      }
    };
  }

  static debounce(func, wait, immediate) {
    let timeout;
    return function () {
      const context = this;
      const args = arguments;
      const later = function () {
        timeout = null;
        if (!immediate) func.apply(context, args);
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) func.apply(context, args);
    };
  }

  // Local storage utilities (with fallback for memory)
  static saveToStorage(key, data) {
    try {
      if (typeof Storage !== "undefined") {
        localStorage.setItem(key, JSON.stringify(data));
        return true;
      }
    } catch (e) {
      console.warn("Storage not available, using memory storage");
    }
    // Fallback to memory storage
    if (!this._memoryStorage) this._memoryStorage = {};
    this._memoryStorage[key] = data;
    return false;
  }

  static loadFromStorage(key, defaultValue = null) {
    try {
      if (typeof Storage !== "undefined") {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
      }
    } catch (e) {
      console.warn("Storage not available, using memory storage");
    }
    // Fallback to memory storage
    if (!this._memoryStorage) this._memoryStorage = {};
    return this._memoryStorage[key] || defaultValue;
  }

  // Sound System
  static audioContext = null;
  static soundBuffers = new Map();
  static activeAudio = new Map();
  static masterVolume = null;
  static backgroundMusicLoop = null;
  static ambientSoundTimer = null;
  static async initializeBackgroundAudio() {
    await this.initAudio();

    // Only start background music if it's not already playing
    const musicPath =
      "sounds/music/561394__migfus20__fantasy-background-music-loop.mp3";
    if (!this.backgroundMusicLoop || !this.activeAudio.has(musicPath)) {
      const musicSource = await this.playSound(musicPath, 0.5, true);
      this.backgroundMusicLoop = musicSource;
    }

    // Setup ambient sound loop only if it's not already running
    if (!this.ambientSoundTimer) {
      const playAmbient = async () => {
        await this.playSound(
          "sounds/ambient/345852__hargissssound__spring-birds-loop-with-low-cut-new-jersey.wav",
          0.3,
          false
        );
      };

      // Play ambient sound immediately and then every 3 minutes
      playAmbient();
      this.ambientSoundTimer = setInterval(playAmbient, 3 * 60 * 1000);
    }
  }
  static cleanupBackgroundAudio() {
    // Stop background music
    const musicPath =
      "sounds/music/561394__migfus20__fantasy-background-music-loop.mp3";
    this.stopSound(musicPath);
    this.backgroundMusicLoop = null;

    // Stop ambient sound and clear timer
    const ambientPath =
      "sounds/ambient/345852__hargissssound__spring-birds-loop-with-low-cut-new-jersey.wav";
    this.stopSound(ambientPath);
    if (this.ambientSoundTimer) {
      clearInterval(this.ambientSoundTimer);
      this.ambientSoundTimer = null;
    }
  }

  static initializeSoundSystem() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
      this.soundBuffers = new Map();
      this.activeAudio = new Map();
      this.masterVolume = this.audioContext.createGain();
      this.masterVolume.connect(this.audioContext.destination);
    }
  }
  static async initAudio() {
    if (!this.audioContext) {
      this.initializeSoundSystem();
    }

    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
        console.log("🎵 AudioContext resumed successfully");
      } catch (error) {
        console.warn("⚠️ Could not resume AudioContext:", error);
        return false;
      }
    }
    return true;
  }

  static async loadSound(soundName) {
    if (this.soundBuffers.has(soundName)) {
      return this.soundBuffers.get(soundName);
    }

    const fileName = soundName.includes(".") ? soundName : `${soundName}.wav`;

    try {
      const response = await fetch(fileName);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);
      this.soundBuffers.set(soundName, audioBuffer);
      return audioBuffer;
    } catch (error) {
      console.warn(`Failed to load sound ${fileName}:`, error);
      return null;
    }
  }

  static async playSound(soundName, volume = 1.0, loop = false) {
    try {
      await this.initAudio();

      const buffer = await this.loadSound(soundName);
      if (!buffer) {
        console.warn(`Could not play sound ${soundName} - loading failed`);
        return null;
      }

      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();

      source.buffer = buffer;
      source.loop = loop;

      gainNode.gain.value = this.clamp(volume, 0, 1);

      source.connect(gainNode);
      gainNode.connect(this.masterVolume);

      source.start(0);

      this.activeAudio.set(soundName, { source, gainNode });

      source.onended = () => {
        if (!loop) {
          this.activeAudio.delete(soundName);
        }
      };

      return source;
    } catch (error) {
      console.warn(`Error playing sound ${soundName}:`, error);
      return null;
    }
  }

  static stopSound(soundName) {
    const audio = this.activeAudio.get(soundName);
    if (audio) {
      try {
        audio.source.stop();
      } catch (error) {
        console.warn(`Error stopping sound ${soundName}:`, error);
      }
      this.activeAudio.delete(soundName);
    }
  }

  static setVolume(soundName, volume) {
    const audio = this.activeAudio.get(soundName);
    if (audio) {
      audio.gainNode.gain.value = this.clamp(volume, 0, 1);
    }
  }

  static setMasterVolume(volume) {
    if (this.masterVolume) {
      this.masterVolume.gain.value = this.clamp(volume, 0, 1);
    }
  }

  static stopAllSounds() {
    for (const [soundName] of this.activeAudio) {
      this.stopSound(soundName);
    }
  }

  static async preloadSounds(soundNames) {
    await this.initAudio();
    const loadPromises = soundNames.map((name) => this.loadSound(name));
    await Promise.all(loadPromises);
  }

  // Particle system utilities
  static createParticleSystem(count, texture, size = 1) {
    count = Validation.sanitizeNumber(count, 100);
    size = Validation.sanitizeNumber(size, 1);

    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    const spread = 20; // Maximum spread of particles

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;

      // Generate positions in a more controlled way
      const theta = Math.random() * Math.PI * 2;
      const r = Math.random() * spread;
      positions[i3] = Validation.sanitizeNumber(Math.cos(theta) * r, 0);
      positions[i3 + 1] = Validation.sanitizeNumber(
        (Math.random() - 0.5) * spread,
        0
      );
      positions[i3 + 2] = Validation.sanitizeNumber(Math.sin(theta) * r, 0);

      // Set safe default colors
      colors[i3] = Validation.sanitizeNumber(Math.random(), 0.5);
      colors[i3 + 1] = Validation.sanitizeNumber(Math.random(), 0.5);
      colors[i3 + 2] = Validation.sanitizeNumber(Math.random(), 0.5);

      // Set safe size
      sizes[i] = Validation.sanitizeNumber(
        size * (0.5 + Math.random() * 0.5),
        size * 0.5
      );
    }

    particles.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    particles.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    particles.setAttribute("size", new THREE.BufferAttribute(sizes, 1));

    // Validate the geometry before creating the mesh
    Validation.validateGeometry(particles);

    // Create material with safe defaults
    const material = new THREE.PointsMaterial({
      size: size,
      sizeAttenuation: true,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
    });

    if (texture) {
      material.map = texture;
    }

    const points = new THREE.Points(particles, material);

    // Double-check the final geometry
    Validation.validateGeometry(points.geometry);

    return points;
  }

  // Debugging utilities
  static drawWireframeBox(scene, position, size, color = 0x00ff00) {
    const geometry = new THREE.BoxGeometry(size.x, size.y, size.z);
    const edges = new THREE.EdgesGeometry(geometry);
    const material = new THREE.LineBasicMaterial({ color });
    const wireframe = new THREE.LineSegments(edges, material);
    wireframe.position.copy(position);
    scene.add(wireframe);
    return wireframe;
  }

  static drawDebugSphere(scene, position, radius, color = 0xff0000) {
    const geometry = new THREE.SphereGeometry(radius, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color,
      wireframe: true,
      transparent: true,
      opacity: 0.5,
    });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.copy(position);
    scene.add(sphere);
    return sphere;
  }

  // Medieval-specific utilities
  static calculateCatapultPower(tension) {
    // Convert tension percentage to actual power values with reduced power range
    let minPower = 10; // Reduced from 10
    let maxPower = 30; // Reduced from 100

    // Add non-linear scaling for more control at lower tensions
    let normalizedTension = this.easeInQuad(tension / 100);
    return this.map(normalizedTension, 0, 1, minPower, maxPower);
  }

  static calculateWindEffect(windStrength, windDirection, velocity) {
    // Validate inputs
    windStrength = Validation.sanitizeNumber(windStrength, 0);
    windDirection = Validation.sanitizeNumber(windDirection, 0);
    velocity = Validation.sanitizeVector3(velocity, new THREE.Vector3());

    let windForce = {
      x: Validation.sanitizeNumber(Math.cos(windDirection) * windStrength, 0),
      z: Validation.sanitizeNumber(Math.sin(windDirection) * windStrength, 0),
    };

    const speedFactor = Validation.sanitizeNumber(velocity.length() * 0.1, 0);
    const baseWindMultiplier = 0.5;

    return {
      x: Validation.sanitizeNumber(
        velocity.x + windForce.x * (baseWindMultiplier + speedFactor),
        velocity.x
      ),
      y: Validation.sanitizeNumber(
        velocity.y + Math.sin(windDirection * 0.7) * windStrength * 0.25,
        velocity.y
      ),
      z: Validation.sanitizeNumber(
        velocity.z + windForce.z * (baseWindMultiplier + speedFactor),
        velocity.z
      ),
    };
  }

  static generateMedievalTexture(size, baseColor) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    // Create stone-like texture
    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, size, size);

    // Add noise
    for (let i = 0; i < size * size * 0.1; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const brightness = Math.random() * 60 - 30;
      ctx.fillStyle = `rgba(${brightness > 0 ? 255 : 0}, ${
        brightness > 0 ? 255 : 0
      }, ${brightness > 0 ? 255 : 0}, ${Math.abs(brightness) / 255})`;
      ctx.fillRect(x, y, 1, 1);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  static setMusicVolume(volume) {
    if (this.backgroundMusicLoop) {
      const audio = this.activeAudio.get(
        "sounds/music/561394__migfus20__fantasy-background-music-loop.mp3"
      );
      if (audio) {
        audio.gainNode.gain.value = this.clamp(volume, 0, 1);
      }
    }
  }

  static setAmbientVolume(volume) {
    const ambientSound =
      "sounds/ambient/345852__hargissssound__spring-birds-loop-with-low-cut-new-jersey.wav";
    const audio = this.activeAudio.get(ambientSound);
    if (audio) {
      audio.gainNode.gain.value = this.clamp(volume, 0, 1);
    }
  }
}
