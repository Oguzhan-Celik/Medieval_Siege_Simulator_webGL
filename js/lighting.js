import * as THREE from "three";

export class LightingSystem {
  constructor(scene) {
    this.scene = scene;
    this.ambientLight = null;
    this.directionalLight = null;
    this.pointLights = [];

    this.init();
  }

  init() {
    this.createAmbientLight();
    this.createDirectionalLight();
    this.createAtmosphericLights();
  }
  createAmbientLight() {
    // Very low ambient light for night scene
    this.ambientLight = new THREE.AmbientLight(0x101020, 0.1);
    this.scene.add(this.ambientLight);
  }

  createDirectionalLight() {
    // Main sun light with reduced intensity due to HDR
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    this.directionalLight.position.set(50, 100, 50);
    this.directionalLight.castShadow = true;

    // Configure shadow properties
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.directionalLight.shadow.camera.near = 1;
    this.directionalLight.shadow.camera.far = 200;
    this.directionalLight.shadow.camera.left = -50;
    this.directionalLight.shadow.camera.right = 50;
    this.directionalLight.shadow.camera.top = 50;
    this.directionalLight.shadow.camera.bottom = -50;
    this.directionalLight.shadow.bias = -0.0001;

    this.scene.add(this.directionalLight);

    // Optional: Add helper to visualize light direction (for debugging)
    // const helper = new THREE.DirectionalLightHelper(this.directionalLight, 5);
    // this.scene.add(helper);
  }

  createAtmosphericLights() {
    // Tower torch lights (atmospheric lighting around towers)
    const towerPositions = [
      { x: 42, z: 42 },
      { x: -42, z: 42 },
      { x: -42, z: -42 },
      { x: 42, z: -42 },
    ];

    towerPositions.forEach((pos, index) => {
      const torchLight = new THREE.PointLight(0xff6600, 0.8, 30);
      torchLight.position.set(pos.x, 8, pos.z);
      torchLight.castShadow = true;
      torchLight.shadow.mapSize.width = 512;
      torchLight.shadow.mapSize.height = 512;
      torchLight.shadow.camera.near = 0.1;
      torchLight.shadow.camera.far = 30;

      this.scene.add(torchLight);
      this.pointLights.push(torchLight);
    });

    // Mysterious blue light (magical atmosphere)
    const mysticalLight = new THREE.PointLight(0x4444ff, 0.5, 25);
    mysticalLight.position.set(0, 15, 0);
    this.scene.add(mysticalLight);
    this.pointLights.push(mysticalLight);
  }

  // Dynamic lighting effects
  update(deltaTime) {
    const time = Date.now() * 0.001;

    // Animate torch lights (flickering effect)
    this.pointLights.forEach((light, index) => {
      if (index < 4) {
        // Tower torches
        const baseIntensity = 0.8;
        const flickerAmount = 0.3;
        light.intensity =
          baseIntensity + Math.sin(time * 8 + index * 2) * flickerAmount * 0.1;

        // Slight color variation
        const colorShift = Math.sin(time * 6 + index) * 0.1;
        light.color.setRGB(1, 0.4 + colorShift, 0);
      }
    });

    // Animate mystical light
    if (this.pointLights[4]) {
      const mysticalLight = this.pointLights[4];
      mysticalLight.intensity = 0.5 + Math.sin(time * 2) * 0.2;
      mysticalLight.position.y = 15 + Math.sin(time * 1.5) * 2;

      // Color cycling
      const hue = (time * 0.1) % 1;
      mysticalLight.color.setHSL(hue * 0.3 + 0.6, 0.8, 0.6);
    }

    // Day/night cycle simulation (optional)
    this.updateDayNightCycle(time);
  }
  updateDayNightCycle(time) {
    // Simulate day/night cycle over 60 seconds
    const cycleTime = (time * 0.1) % (Math.PI * 2);
    const dayFactor = (Math.sin(cycleTime) + 1) * 0.5; // 0 to 1

    // Adjust ambient light more subtly since we have HDR lighting
    const minAmbient = 0.1;
    const maxAmbient = 0.3;
    this.ambientLight.intensity =
      minAmbient + (maxAmbient - minAmbient) * dayFactor;

    // Adjust directional light more subtly
    const minDirectional = 0.2;
    const maxDirectional = 0.8;
    this.directionalLight.intensity =
      minDirectional + (maxDirectional - minDirectional) * dayFactor;

    // Skip background color changes since we're using HDR environment map

    // Update fog to be more subtle and match the HDR atmosphere
    if (scene.fog) {
      scene.fog.color.setRGB(0.53, 0.81, 0.92);
      scene.fog.density = 0.02 + (1 - dayFactor) * 0.03;
    }
  }

  // Utility methods
  setAmbientIntensity(intensity) {
    if (this.ambientLight) {
      this.ambientLight.intensity = intensity;
    }
  }

  setDirectionalIntensity(intensity) {
    if (this.directionalLight) {
      this.directionalLight.intensity = intensity;
    }
  }

  addPointLight(position, color = 0xffffff, intensity = 1, distance = 50) {
    const light = new THREE.PointLight(color, intensity, distance);
    light.position.copy(position);
    light.castShadow = true;
    light.shadow.mapSize.width = 512;
    light.shadow.mapSize.height = 512;

    this.scene.add(light);
    this.pointLights.push(light);

    return light;
  }

  removePointLight(light) {
    const index = this.pointLights.indexOf(light);
    if (index > -1) {
      this.pointLights.splice(index, 1);
      this.scene.remove(light);
    }
  }

  // Lighting presets
  setPreset(preset) {
    switch (preset) {
      case "day":
        this.ambientLight.intensity = 0.6;
        this.directionalLight.intensity = 1.2;
        this.scene.background.setHex(0x87ceeb);
        break;
      case "night":
        this.ambientLight.intensity = 0.2;
        this.directionalLight.intensity = 0.3;
        this.scene.background.setHex(0x191970);
        break;
      case "dramatic":
        this.ambientLight.intensity = 0.3;
        this.directionalLight.intensity = 2.0;
        this.scene.background.setHex(0x2f2f2f);
        break;
      case "mystical":
        this.ambientLight.intensity = 0.4;
        this.ambientLight.color.setHex(0x6a5acd);
        this.directionalLight.intensity = 0.8;
        this.scene.background.setHex(0x483d8b);
        break;
    }
  }

  reset() {
    // Reset to default lighting
    this.ambientLight.intensity = 0.6;
    this.ambientLight.color.setHex(0x404040);
    this.directionalLight.intensity = 1.2;
    this.directionalLight.color.setHex(0xffffff);
    this.scene.background.setHex(0x87ceeb);

    if (this.scene.fog) {
      this.scene.fog.color.setHex(0x87ceeb);
    }
  }
}
