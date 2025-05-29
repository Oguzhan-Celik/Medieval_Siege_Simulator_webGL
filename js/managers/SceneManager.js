import { Utils } from "../utils.js";
import * as THREE from "three";
import { materials } from "../materials.js";
import { Torch } from "../objects/torch.js";

export class SceneManager {
  constructor(scene) {
    this.scene = scene;
    this.noiseTexture = this.createNoiseTexture();
  }

  createNoiseTexture() {
    // Create a procedural noise texture for the island
    const size = 512;
    const data = new Uint8Array(size * size * 4);

    for (let i = 0; i < size; i++) {
      for (let j = 0; j < size; j++) {
        const x = i / size;
        const y = j / size;

        // Generate noise using simple fractal noise
        let noise = 0;
        let amplitude = 1;
        let frequency = 1;

        for (let octave = 0; octave < 4; octave++) {
          noise +=
            amplitude *
            (Math.sin(x * frequency * Math.PI * 8) *
              Math.cos(y * frequency * Math.PI * 8));
          frequency *= 2;
          amplitude *= 0.5;
        }

        noise = (noise + 1) * 0.5; // Normalize to 0-1

        const index = (i * size + j) * 4;
        data[index] = noise * 255; // R
        data[index + 1] = noise * 255; // G
        data[index + 2] = noise * 255; // B
        data[index + 3] = 255; // A
      }
    }

    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.needsUpdate = true;
    return texture;
  }

  createGround() {
    // Create simple flat ground first
    const groundGeometry = new THREE.PlaneGeometry(200, 200);
    const ground = new THREE.Mesh(groundGeometry, materials.dirt);
    ground.geometry.setAttribute(
      "uv2",
      new THREE.Float32BufferAttribute(ground.geometry.attributes.uv.array, 2)
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    ground.name = "ground";
    this.scene.add(ground);

    // Create infinite sea
    this.createInfiniteSea();

    // Add enhanced rock decorations
    this.addIslandRocks();
  }

  createInfiniteSea() {
    // Create large sea plane that extends beyond view
    const seaGeometry = new THREE.PlaneGeometry(1000, 1000);
    const seaMaterial = new THREE.MeshLambertMaterial({
      color: 0x006994,
      transparent: false,
      opacity: 1.0,
    });

    const sea = new THREE.Mesh(seaGeometry, seaMaterial);
    sea.rotation.x = -Math.PI / 2;
    sea.position.y = -0.1; // Just below ground level
    sea.receiveShadow = true;

    this.scene.add(sea);
  }

  addIslandRocks() {
    // Add varied rock formations
    for (let i = 0; i < 40; i++) {
      // Create more complex rock shapes
      const rockType = Math.random();
      let rockGeometry;

      if (rockType < 0.4) {
        // Jagged rocks
        rockGeometry = new THREE.ConeGeometry(
          Utils.randomRange(0.1, 0.4),
          Utils.randomRange(0.2, 0.6),
          Utils.randomRange(5, 8)
        );
      } else if (rockType < 0.7) {
        // Boulder rocks
        rockGeometry = new THREE.SphereGeometry(Utils.randomRange(1, 3), 14, 6);
      } else {
        // Cubic rocks
        rockGeometry = new THREE.BoxGeometry(
          Utils.randomRange(0.2, 0.5),
          Utils.randomRange(0.1, 0.4),
          Utils.randomRange(0.2, 0.5)
        );
      }

      const rock = new THREE.Mesh(rockGeometry, materials.groundRock);

      // Position rocks within island bounds but avoid center
      const angle = Math.random() * Math.PI * 2;
      const distance = Utils.randomRange(20, 80);
      rock.position.x = Math.cos(angle) * distance;
      rock.position.z = Math.sin(angle) * distance;
      rock.position.y = 0.05;

      // Random rotations for natural look
      rock.rotation.x = Utils.randomRange(-0.2, 0.2);
      rock.rotation.y = Utils.randomRange(0, Math.PI);
      rock.rotation.z = Utils.randomRange(0.5, 1.0);

      Utils.enableShadows(rock, true, true);
      this.scene.add(rock);
    }
  }

  createMedievalSquare(offset_x = 0, offset_z = 0) {
    // Enhanced walls with battlements and details
    for (let i = 0; i < 4; i++) {
      this.createDetailedWall(i, offset_x, offset_z);
    }

    // Enhanced towers with more detail
    for (let i = 0; i < 4; i++) {
      this.createDetailedTower(i, offset_x, offset_z);
    }
  }

  createDetailedWall(index, offset_x = 0, offset_z = 0) {
    const angle = Utils.degToRad(index * 90);
    const wallX = Math.sin(angle) * 30 + offset_x;
    const wallZ = Math.cos(angle) * 30 + offset_z;

    // Create a group to hold the wall and its decorations
    const wallGroup = new THREE.Group();
    wallGroup.position.set(wallX, 0, wallZ);
    wallGroup.rotation.y = angle;
    wallGroup.userData = { type: "wall" };

    // Main wall
    const wallGeometry = new THREE.BoxGeometry(52, 10, 3);
    const wall = new THREE.Mesh(wallGeometry, materials.stoneWall);
    wall.position.set(0, 5, 0);
    Utils.enableShadows(wall, true, true);
    wallGroup.add(wall);

    // Battlements
    for (let j = 0; j < 7; j++) {
      const battlement = new THREE.Mesh(
        new THREE.BoxGeometry(3, 2, 2.5),
        materials.stoneWall
      );

      const offset = (j - 3) * 8;
      battlement.position.set(offset, 11, 0);
      Utils.enableShadows(battlement, true, true);
      wallGroup.add(battlement);
    }

    this.scene.add(wallGroup);

    // Create gate for one wall
    if (index === 1) {
      this.createGate(1, offset_x, offset_z);
    }
  }

  createDetailedTower(index, offset_x = 0, offset_z = 0) {
    const angle = Utils.degToRad(index * 90 + 45);
    const towerX = Math.cos(angle) * 42 + offset_x;
    const towerZ = Math.sin(angle) * 42 + offset_z;

    // Create a group to hold the tower and its decorations
    const towerGroup = new THREE.Group();
    towerGroup.position.set(towerX, 0, towerZ);
    towerGroup.userData = { type: "tower" };

    // Main tower
    const towerGeometry = new THREE.CylinderGeometry(4, 4.5, 15, 12);
    const tower = new THREE.Mesh(towerGeometry, materials.stoneWall);
    tower.position.set(0, 7.5, 0);
    Utils.enableShadows(tower, true, true);
    towerGroup.add(tower);

    // Tower roof
    const roofGeometry = new THREE.ConeGeometry(5, 4, 12);
    const roof = new THREE.Mesh(roofGeometry, materials.asphalt);
    roof.position.set(0, 17, 0);
    Utils.enableShadows(roof, true, true);
    towerGroup.add(roof);

    // Tower windows
    for (let j = 0; j < 3; j++) {
      const windowAngle = (j * Math.PI * 2) / 3;
      const window = new THREE.Mesh(
        new THREE.BoxGeometry(0.8, 1.5, 0.3),
        new THREE.MeshLambertMaterial({ color: 0x000000 })
      );

      window.position.set(
        Math.cos(windowAngle) * 3.8,
        10,
        Math.sin(windowAngle) * 3.8
      );

      towerGroup.add(window);
    }

    // Tower battlements
    for (let j = 0; j < 8; j++) {
      if (j % 2 === 0) {
        const battlement = new THREE.Mesh(
          new THREE.BoxGeometry(1, 1.5, 1),
          materials.stoneWall
        );

        const battlementAngle = (j * Math.PI * 2) / 8;
        battlement.position.set(
          Math.cos(battlementAngle) * 4.2,
          15.5,
          Math.sin(battlementAngle) * 4.2
        );

        Utils.enableShadows(battlement, true, true);
        towerGroup.add(battlement);
      }
    }

    this.scene.add(towerGroup);
  }

  createGate(index, offset_x = 0, offset_z = 0) {
    const angle = Utils.degToRad(index * 90);
    const wallX = Math.sin(angle) * 30 + offset_x;
    const wallZ = Math.cos(angle) * 30 + offset_z;

    // Create a group to hold the gate and its parts
    const gateGroup = new THREE.Group();
    gateGroup.position.set(wallX, 0, wallZ);
    gateGroup.userData = { type: "gate" };

    // Create main gate structure
    const gateGeometry = new THREE.BoxGeometry(3.1, 8, 6);
    const gate = new THREE.Mesh(gateGeometry, materials.stoneWall);
    gate.position.set(0, 4, 0);
    Utils.enableShadows(gate, true, true);
    gateGroup.add(gate);

    // Gate door
    const doorGeometry = new THREE.BoxGeometry(0.3, 6, 4);
    const door = new THREE.Mesh(doorGeometry, materials.wood);
    door.position.set(-1.5, 3, 0);
    Utils.enableShadows(door, true, true);
    gateGroup.add(door);

    // Gate door2
    const doorGeometry2 = new THREE.BoxGeometry(0.3, 6, 4);
    const door2 = new THREE.Mesh(doorGeometry2, materials.wood);
    door2.position.set(1.5, 3, 0);
    Utils.enableShadows(door2, true, true);
    gateGroup.add(door2);

    this.scene.add(gateGroup);
  }

  createTorch() {
    const torch = new Torch(this.scene);
    const lights = torch.getLights();
    const fireEffects = torch.getFireEffects();

    return {
      torch: torch.getMesh(),
      light: lights.main,
      ambientLight: lights.ambient,
      fire: fireEffects,
    };
  }

  // Animation update method - removed sea animation
  update(time) {
    // Future animations can be added here
  }

  checkObjectCollisions() {
    // Find torch object in scene
    const torch = this.scene.children.find(
      (child) => child.userData.type === "torch"
    );

    // Check torch collision with other objects
    if (torch && this.selectedObject !== torch) {
      const torchPos = torch.position;

      // Check if torch is too close to walls or towers
      this.scene.children.forEach((child) => {
        if (child.userData.type === "wall" || child.userData.type === "tower") {
          const distance = Utils.distance3D(torchPos, child.position);
          if (distance < 5) {
            // Push torch away slightly
            const direction = Utils.normalize2D({
              x: torchPos.x - child.position.x,
              z: torchPos.z - child.position.z,
            });

            torch.position.x += direction.x * 0.1;
            torch.position.z += direction.z * 0.1;
          }
        }
      });
    }
  }
}
