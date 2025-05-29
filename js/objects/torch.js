import * as THREE from "three";
import { Utils } from "../utils.js";
import { materials } from "../materials.js";
import { TorchParticles } from "./particles/TorchParticles.js";

export class Torch {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.mainLight = null;
    this.ambientLight = null;
    this.flameParticles = null;

    this.create();
  }

  create() {
    // Create more detailed handle
    const handleGeometry = new THREE.CylinderGeometry(0.12, 0.08, 3, 8);
    const handle = new THREE.Mesh(handleGeometry, materials.wood);
    handle.position.y = 1.5;
    handle.castShadow = true;
    this.group.add(handle);

    // Create decorative metal ring
    const ringGeometry = new THREE.TorusGeometry(0.15, 0.03, 8, 16);
    const ring = new THREE.Mesh(ringGeometry, materials.metal);
    ring.position.y = 2.8;
    ring.castShadow = true;
    this.group.add(ring);

    // Create particle system for flames
    this.flameParticles = new TorchParticles(
      this.group,
      new THREE.Vector3(0, 3, 0)
    ); // Multi-point lighting system for more realistic flame illumination
    // Main center light
    this.mainLight = new THREE.PointLight(0xff4500, 2.5, 25);
    this.mainLight.position.y = 3.1;
    this.mainLight.castShadow = true;
    this.mainLight.shadow.mapSize.width = 2048;
    this.mainLight.shadow.mapSize.height = 2048;
    this.mainLight.shadow.camera.near = 0.1;
    this.mainLight.shadow.camera.far = 35;
    this.mainLight.shadow.radius = 1;
    this.mainLight.shadow.bias = -0.0001;
    this.group.add(this.mainLight);

    // Additional flame lights for better distribution
    this.flameLight1 = new THREE.PointLight(0xff6000, 1.5, 15);
    this.flameLight1.position.set(0.2, 3.2, 0);
    this.group.add(this.flameLight1);

    this.flameLight2 = new THREE.PointLight(0xff6000, 1.5, 15);
    this.flameLight2.position.set(-0.2, 3.2, 0);
    this.group.add(this.flameLight2);

    this.flameLight3 = new THREE.PointLight(0xff6000, 1.5, 15);
    this.flameLight3.position.set(0, 3.2, 0.2);
    this.group.add(this.flameLight3);

    this.flameLight4 = new THREE.PointLight(0xff6000, 1.5, 15);
    this.flameLight4.position.set(0, 3.2, -0.2);
    this.group.add(this.flameLight4);

    // Upper glow light
    this.upperLight = new THREE.PointLight(0xff8c00, 1, 10);
    this.upperLight.position.y = 3.4;
    this.group.add(this.upperLight);

    this.group.position.set(0, 0, 0);
    this.group.userData = { type: "torch", draggable: true };
    this.scene.add(this.group);
  }

  setPosition(x, y, z) {
    this.group.position.set(x, y, z);
  }

  getPosition() {
    return this.group.position;
  }

  getMesh() {
    return this.group;
  }
  getLights() {
    return {
      main: this.mainLight,
      flameLight1: this.flameLight1,
      flameLight2: this.flameLight2,
      flameLight3: this.flameLight3,
      flameLight4: this.flameLight4,
      upper: this.upperLight,
    };
  }

  getFireEffects() {
    return {
      particles: this.flameParticles,
    };
  }

  update(deltaTime) {
    if (this.flameParticles) {
      this.flameParticles.update(deltaTime);
    }
  }
}
