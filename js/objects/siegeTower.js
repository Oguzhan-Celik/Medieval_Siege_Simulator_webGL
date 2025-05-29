import * as THREE from "three";
import { materials } from "../materials.js";

export class SiegeTower {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.wheels = [];
    this.bridge = null;
    this.soldiers = [];
    this.bridgeExtended = false;
    this.moveSpeed = 5;
    this.rotationSpeed = 1.5; // Radians per second
    this.isPKeyPressed = false; // To handle single press for bridge toggle

    this.create();
  }

  create() {
    this.mesh = new THREE.Group();

    // Main tower structure
    this.createTowerBase();
    this.createTowerLevels();
    this.createWheels();
    this.createBridge();
    this.createSoldiers();
    this.createDetails();

    // Position the siege tower
    this.mesh.position.set(20, 0, 0);
    this.mesh.userData = { type: "siegeTower", draggable: true };
    this.scene.add(this.mesh);
  }

  createTowerBase() {
    // Main base structure
    const baseGeometry = new THREE.BoxGeometry(6, 8, 4);
    const base = new THREE.Mesh(baseGeometry, materials.wood);
    base.geometry.setAttribute(
      "uv2",
      new THREE.Float32BufferAttribute(base.geometry.attributes.uv.array, 2)
    );
    base.position.y = 4;
    base.castShadow = true;
    base.receiveShadow = true;
    this.mesh.add(base);

    // Support beams
    for (let i = 0; i < 4; i++) {
      const beamGeometry = new THREE.BoxGeometry(0.3, 8, 0.3);
      const beam = new THREE.Mesh(beamGeometry, materials.wood);
      beam.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(beam.geometry.attributes.uv.array, 2)
      );

      const x = i < 2 ? -2.5 : 2.5;
      const z = i % 2 === 0 ? -1.5 : 1.5;
      beam.position.set(x, 4, z);
      beam.castShadow = true;
      this.mesh.add(beam);
    }
  }

  createTowerLevels() {
    // Upper levels
    for (let level = 1; level <= 2; level++) {
      const levelGeometry = new THREE.BoxGeometry(5, 3, 3.5);
      const levelMesh = new THREE.Mesh(levelGeometry, materials.wood);
      levelMesh.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(
          levelMesh.geometry.attributes.uv.array,
          2
        )
      );
      levelMesh.position.y = 8 + level * 3;
      levelMesh.castShadow = true;
      levelMesh.receiveShadow = true;
      this.mesh.add(levelMesh);

      // Windows/archer slots
      for (let side = 0; side < 2; side++) {
        const windowGeometry = new THREE.BoxGeometry(0.2, 0.8, 0.3);
        const window = new THREE.Mesh(windowGeometry, materials.stone);
        window.geometry.setAttribute(
          "uv2",
          new THREE.Float32BufferAttribute(
            window.geometry.attributes.uv.array,
            2
          )
        );
        window.position.set(side === 0 ? -2.6 : 2.6, 8 + level * 3, 0);
        this.mesh.add(window);
      }

      // Metal reinforcement bands
      const bandGeometry = new THREE.BoxGeometry(5.2, 0.2, 3.7);
      const band = new THREE.Mesh(bandGeometry, materials.metal);
      band.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(band.geometry.attributes.uv.array, 2)
      );
      band.position.y = 8 + level * 3;
      band.castShadow = true;
      this.mesh.add(band);
    }

    // Roof
    const roofGeometry = new THREE.ConeGeometry(3, 2, 8);
    const roof = new THREE.Mesh(roofGeometry, materials.wood);
    roof.geometry.setAttribute(
      "uv2",
      new THREE.Float32BufferAttribute(roof.geometry.attributes.uv.array, 2)
    );
    roof.position.y = 15;
    roof.castShadow = true;
    this.mesh.add(roof);
  }

  createWheels() {
    // Large wheels for movement
    for (let i = 0; i < 4; i++) {
      const wheelGeometry = new THREE.CylinderGeometry(1.2, 1.2, 0.4, 16);
      const wheel = new THREE.Mesh(wheelGeometry, materials.metal);
      wheel.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(wheel.geometry.attributes.uv.array, 2)
      );

      const x = i < 2 ? -2.5 : 2.5;
      const z = i % 2 === 0 ? -1.5 : 1.5;
      wheel.position.set(x, 1.2, z);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;

      // Wheel spokes
      for (let j = 0; j < 8; j++) {
        const spokeGeometry = new THREE.BoxGeometry(0.15, 2.2, 0.15);
        const spoke = new THREE.Mesh(spokeGeometry, materials.wood);
        spoke.geometry.setAttribute(
          "uv2",
          new THREE.Float32BufferAttribute(
            spoke.geometry.attributes.uv.array,
            2
          )
        );
        spoke.position.set(0, 0, 0);
        spoke.rotation.x = (Math.PI / 4) * j;
        spoke.castShadow = true;
        wheel.add(spoke);
      }

      // Hub cap
      const hubGeometry = new THREE.CylinderGeometry(0.3, 0.3, 0.45, 16);
      const hub = new THREE.Mesh(hubGeometry, materials.metal);
      hub.geometry.setAttribute(
        "uv2",
        // Corrected line: Float33BufferAttribute to Float32BufferAttribute
        new THREE.Float32BufferAttribute(hub.geometry.attributes.uv.array, 2)
      );
      hub.rotation.x = Math.PI / 2;
      hub.castShadow = true;
      wheel.add(hub);

      this.wheels.push(wheel);
      this.mesh.add(wheel);
    }
  }

  createBridge() {
    // Drawbridge mechanism
    this.bridge = new THREE.Group();

    const bridgeGeometry = new THREE.BoxGeometry(4, 0.3, 8); // width, thickness, length
    const bridgeMesh = new THREE.Mesh(bridgeGeometry, materials.wood);
    bridgeMesh.geometry.setAttribute(
      "uv2",
      new THREE.Float32BufferAttribute(
        bridgeMesh.geometry.attributes.uv.array,
        2
      )
    );
    bridgeMesh.position.z = 4; // Positioned along its local Z axis (length of bridge)
    bridgeMesh.castShadow = true;
    this.bridge.add(bridgeMesh);

    // Bridge railings
    for (let side = 0; side < 2; side++) {
      const railingGeometry = new THREE.BoxGeometry(0.1, 1, 8); // width, height, length
      const railing = new THREE.Mesh(railingGeometry, materials.wood);
      railing.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(
          railing.geometry.attributes.uv.array,
          2
        )
      );
      // Position railings on the sides of the bridge floor
      railing.position.set(side === 0 ? -1.95 : 1.95, 0.5 + 0.15, 4); // x, y (half height of railing + half thickness of bridge), z
      this.bridge.add(railing);

      const reinforcementGeometry = new THREE.BoxGeometry(0.15, 1.1, 0.15);
      const reinforcement1 = new THREE.Mesh(
        reinforcementGeometry,
        materials.metal
      );
      reinforcement1.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(
          reinforcement1.geometry.attributes.uv.array,
          2
        )
      );
      reinforcement1.position.set(side === 0 ? -1.95 : 1.95, 0.5 + 0.15, 1);
      this.bridge.add(reinforcement1);

      const reinforcement2 = reinforcement1.clone();
      reinforcement2.position.set(side === 0 ? -1.95 : 1.95, 0.5 + 0.15, 7);
      this.bridge.add(reinforcement2);
    }

    // Position the bridge pivot point relative to the siege tower's main body
    this.bridge.position.set(0, 11, 2); // x, y (height on tower), z (front of tower base is at z=2, bridge pivots here)
    this.bridge.rotation.x = -Math.PI / 2; // Initially raised
    this.mesh.add(this.bridge);
  }

  createSoldiers() {
    // Simple soldier figures
    for (let i = 0; i < 6; i++) {
      const soldier = new THREE.Group();

      // Body
      const bodyGeometry = new THREE.CylinderGeometry(0.3, 0.4, 1.5, 8);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x4169e1,
        roughness: 0.7,
        metalness: 0.1,
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      soldier.add(body);

      // Head
      const headGeometry = new THREE.SphereGeometry(0.25, 8, 6);
      const headMaterial = new THREE.MeshStandardMaterial({
        color: 0xfdbcb4,
        roughness: 0.5,
        metalness: 0,
      });
      const head = new THREE.Mesh(headGeometry, headMaterial);
      head.position.y = 1;
      soldier.add(head);

      // Helmet
      const helmetGeometry = new THREE.SphereGeometry(0.28, 8, 6);
      const helmet = new THREE.Mesh(helmetGeometry, materials.metal);
      helmet.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(helmet.geometry.attributes.uv.array, 2)
      );
      helmet.position.y = 1.1;
      soldier.add(helmet);

      // Shield
      const shieldGeometry = new THREE.CylinderGeometry(0.5, 0.5, 0.1, 8);
      const shield = new THREE.Mesh(shieldGeometry, materials.wood);
      shield.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(shield.geometry.attributes.uv.array, 2)
      );
      shield.position.set(-0.6, 0.5, 0);
      shield.rotation.z = Math.PI / 2;
      soldier.add(shield);

      // Metal shield boss
      const bossGeometry = new THREE.SphereGeometry(0.15, 8, 8);
      const boss = new THREE.Mesh(bossGeometry, materials.metal);
      boss.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(boss.geometry.attributes.uv.array, 2)
      );
      boss.position.set(-0.65, 0.5, 0); // Position it slightly in front of the shield
      soldier.add(boss);

      // Spear shaft
      const spearShaftGeometry = new THREE.CylinderGeometry(0.02, 0.02, 2.3, 6);
      const spearShaft = new THREE.Mesh(spearShaftGeometry, materials.wood);
      spearShaft.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(
          spearShaft.geometry.attributes.uv.array,
          2
        )
      );
      spearShaft.position.set(0.6, 1, 0); // Adjusted y for holding spear
      soldier.add(spearShaft);

      // Spear head
      const spearHeadGeometry = new THREE.ConeGeometry(0.04, 0.2, 6);
      const spearHead = new THREE.Mesh(spearHeadGeometry, materials.metal);
      spearHead.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(
          spearHead.geometry.attributes.uv.array,
          2
        )
      );
      spearHead.position.set(0.6, 2.2, 0); // Position at the top of the shaft
      soldier.add(spearHead);

      // Position soldiers on different levels
      const level = Math.floor(i / 2);
      soldier.position.set(
        (i % 2 === 0 ? -1 : 1) * 1.5,
        9 + level * 3 - 0.75, // Adjusted y to stand on the level floor
        (Math.random() - 0.5) * 2 // Random z positioning on the platform
      );
      soldier.scale.set(0.8, 0.8, 0.8);

      this.mesh.add(soldier);
      this.soldiers.push(soldier);
    }
  }

  createDetails() {
    // Banners
    for (let i = 0; i < 2; i++) {
      const poleGeometry = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
      const poleMaterial = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
      const pole = new THREE.Mesh(poleGeometry, poleMaterial);
      pole.position.set(i === 0 ? -2 : 2, 12.5 + 1.5, 1.8); // Adjusted y, z
      this.mesh.add(pole);

      const bannerGeometry = new THREE.PlaneGeometry(1.5, 1);
      const bannerMaterial = new THREE.MeshLambertMaterial({
        color: 0x8b0000, // Dark red
        side: THREE.DoubleSide,
      });
      const banner = new THREE.Mesh(bannerGeometry, bannerMaterial);
      banner.position.set(i === 0 ? -2 : 2, 13 + 1.5, 1.8 + 0.05); // Slightly in front of pole
      banner.rotation.y = i === 0 ? Math.PI / 16 : -Math.PI / 16; // Slight angle
      this.mesh.add(banner);
    }

    // Ladder rungs on the back
    for (let i = 0; i < 10; i++) {
      // More rungs
      const rungGeometry = new THREE.BoxGeometry(1.5, 0.15, 0.15); // Thicker rungs
      const rungMaterial = new THREE.MeshLambertMaterial({ color: 0x654321 }); // Darker wood
      const rung = new THREE.Mesh(rungGeometry, rungMaterial);
      rung.position.set(0, 1 + i * 1.2, -2.05); // Adjusted spacing and z position
      this.mesh.add(rung);
    }

    // Reinforcement bands
    for (let i = 0; i < 3; i++) {
      const bandGeometry = new THREE.BoxGeometry(6.2, 0.2, 4.2);
      const bandMaterial = new THREE.MeshLambertMaterial({ color: 0x444444 });
      const band = new THREE.Mesh(bandGeometry, bandMaterial);
      band.position.y = 2 + i * 3;
      this.mesh.add(band);
    }
  }

  toggleBridge() {
    if (this.bridgeExtended) {
      this.retractBridge();
    } else {
      this.extendBridge();
    }
  }

  extendBridge() {
    if (!this.bridgeExtended && this.bridge) {
      this.bridgeExtended = true;

      const startRotation = this.bridge.rotation.x;
      const endRotation = 0; // Horizontal
      const duration = 1500; // 1.5 seconds
      const startTime = Date.now();

      const animateBridge = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = 1 - Math.pow(1 - progress, 3); // EaseOutCubic

        this.bridge.rotation.x = THREE.MathUtils.lerp(
          startRotation,
          endRotation,
          easedProgress
        );

        if (progress < 1) {
          requestAnimationFrame(animateBridge);
        }
      };
      animateBridge();
    }
  }

  retractBridge() {
    if (this.bridgeExtended && this.bridge) {
      this.bridgeExtended = false;

      const startRotation = this.bridge.rotation.x;
      const endRotation = -Math.PI / 2; // Vertical
      const duration = 1000; // 1 second
      const startTime = Date.now();

      const animateBridge = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easedProgress = Math.pow(progress, 2); // EaseInQuad

        this.bridge.rotation.x = THREE.MathUtils.lerp(
          startRotation,
          endRotation,
          easedProgress
        );

        if (progress < 1) {
          requestAnimationFrame(animateBridge);
        }
      };
      animateBridge();
    }
  }

  move(direction, deltaTime) {
    const moveDistance = this.moveSpeed * deltaTime;
    let actuallyMoved = false;

    // Get the tower's forward and right vectors
    const forward = new THREE.Vector3(0, 0, -1); // Default forward in local space
    forward.applyQuaternion(this.mesh.quaternion); // Transform by tower's rotation

    const right = new THREE.Vector3(1, 0, 0); // Default right in local space
    right.applyQuaternion(this.mesh.quaternion); // Transform by tower's rotation

    let moveDirectionFactor = 0;

    switch (direction) {
      case "forward": // Key I
        this.mesh.position.add(forward.multiplyScalar(moveDistance));
        moveDirectionFactor = 1;
        actuallyMoved = true;
        break;
      case "backward": // Key K
        this.mesh.position.add(forward.multiplyScalar(-moveDistance));
        moveDirectionFactor = -1;
        actuallyMoved = true;
        break;
      case "left": // Key J (strafe)
        this.mesh.position.add(right.multiplyScalar(-moveDistance));
        // For wheel animation during strafe, we can treat it like forward or ignore.
        // moveDirectionFactor = 1; // Or some other logic for wheel spin on strafe
        actuallyMoved = true;
        break;
      case "right": // Key L (strafe)
        this.mesh.position.add(right.multiplyScalar(moveDistance));
        // moveDirectionFactor = 1;
        actuallyMoved = true;
        break;
    }

    // Rotate wheels if moved forward or backward
    // For strafing, a simple forward/backward wheel animation might look odd.
    // We'll rotate based on forward/backward, or total movement magnitude if preferred.
    if (moveDirectionFactor !== 0) {
      const wheelRotationSpeed = (moveDistance / 1.2) * moveDirectionFactor; // 1.2 is wheel radius
      this.wheels.forEach((wheel) => {
        // Wheels are oriented to rotate around their local X-axis for forward movement
        wheel.children[0].rotation.x += wheelRotationSpeed; // Rotate the spokes group
      });
    } else if (actuallyMoved) {
      // Optional: animate wheels during strafe
      const wheelRotationSpeed = moveDistance / 1.2;
      this.wheels.forEach((wheel) => {
        // This is a simplification; true strafing wheel animation is complex.
        // Here, we just make them spin as if moving forward.
        wheel.children[0].rotation.x += wheelRotationSpeed;
      });
    }
  }

  rotate(direction, deltaTime) {
    const rotateAngle = this.rotationSpeed * deltaTime * direction;
    this.mesh.rotation.y += rotateAngle;
  }

  update(deltaTime, keys, selectedObject) {
    if (selectedObject === this.mesh) {
      // Movement
      if (keys["KeyI"]) this.move("forward", deltaTime);
      if (keys["KeyK"]) this.move("backward", deltaTime);
      if (keys["KeyJ"]) this.move("left", deltaTime);
      if (keys["KeyL"]) this.move("right", deltaTime);

      // Rotation
      if (keys["KeyU"]) this.rotate(-1, deltaTime); // Rotate left
      if (keys["KeyO"]) this.rotate(1, deltaTime); // Rotate right

      // Bridge toggle
      if (keys["KeyP"]) {
        if (!this.isPKeyPressed) {
          // Process only on key down
          this.toggleBridge();
          this.isPKeyPressed = true;
        }
      } else {
        this.isPKeyPressed = false; // Reset when key is released
      }
    }

    // Animate soldiers (simple bobbing motion)
    this.soldiers.forEach((soldier, index) => {
      const time = Date.now() * 0.001 + index; // Add index for variation
      soldier.position.y =
        9 + Math.floor(index / 2) * 3 - 0.75 + Math.sin(time) * 0.05; // Softer bob
      soldier.rotation.y = Math.sin(time * 0.5) * 0.05; // Softer sway
    });

    // Animate banners
    this.mesh.children.forEach((child) => {
      if (
        child.material &&
        child.material.color &&
        child.material.color.getHex() === 0x8b0000 && // Targeting red banners
        child.geometry &&
        child.geometry.type === "PlaneGeometry"
      ) {
        const time = Date.now() * 0.002; // Slower flutter
        child.rotation.y =
          Math.sin(time + (child.position.x > 0 ? Math.PI : 0)) * 0.05; // Add phase for variation
        child.rotation.z =
          Math.sin(time * 1.5 + (child.position.x > 0 ? Math.PI : 0)) * 0.025;
      }
    });
  }

  reset() {
    this.mesh.position.set(20, 0, 0);
    this.mesh.rotation.set(0, 0, 0);

    if (this.bridge) {
      this.bridge.rotation.x = -Math.PI / 2;
      this.bridgeExtended = false;
    }

    this.wheels.forEach((wheel) => {
      if (wheel.children[0]) {
        // Assuming spokes are the first child and carry the rotation
        wheel.children[0].rotation.x = 0;
      }
    });
    this.isPKeyPressed = false;
  }
}
