import * as THREE from "three";
import { Utils } from "../utils.js";
import { materials } from "../materials.js";
import { Validation } from "../validation.js";

export class Catapult {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.arm = null;
    this.bucket = null;
    this.wheels = [];
    this.projectile = null;
    this.isLoaded = false;
    this.isAnimating = false;
    this.animationTime = 0;
    this.isFiringSequence = false; // Flag to manage projectile release during animation

    this.moveSpeed = 4;
    this.rotationSpeed = 1.2;

    // Resting/Cocked position: Arm pulled back, bucket relatively low but not clipping.
    // Positive X rotation on the arm group makes its +Z end (bucket) go down.
    this.originalRotation = Math.PI / 3.5; // Approx 51 degrees down from horizontal. Adjust as needed.

    // Release position: Arm swings forward, bucket is at an upward angle.
    // Negative X rotation on the arm group makes its +Z end (bucket) go up.
    this.releaseRotation = -Math.PI / 4; // Approx 45 degrees up from horizontal.

    this.create();
  }

  create() {
    this.mesh = new THREE.Group();
    this.mesh.userData = { type: "catapult", draggable: true };

    const baseGeometry = new THREE.BoxGeometry(4, 1, 3);
    const base = new THREE.Mesh(baseGeometry, materials.wood);
    base.geometry.setAttribute(
      "uv2",
      new THREE.Float32BufferAttribute(base.geometry.attributes.uv.array, 2)
    );
    base.position.y = 0.5;
    base.castShadow = true;
    base.receiveShadow = true;
    this.mesh.add(base);

    const pillarMaterial = materials.wood;
    const pillarRadiusTop = 0.2;
    const pillarRadiusBottom = 0.3;
    const pillarHeight = 3.5;

    for (let i = 0; i < 2; i++) {
      const sideFactor = i === 0 ? -1 : 1;
      const frontPillar = new THREE.Mesh(
        new THREE.CylinderGeometry(
          pillarRadiusTop,
          pillarRadiusBottom,
          pillarHeight,
          8
        ),
        pillarMaterial
      );
      frontPillar.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(
          frontPillar.geometry.attributes.uv.array,
          2
        )
      );
      frontPillar.position.set(1.2 * sideFactor, pillarHeight / 2 + 0.5, -0.8);
      frontPillar.rotation.z = THREE.MathUtils.degToRad(10 * sideFactor);
      frontPillar.castShadow = true;
      this.mesh.add(frontPillar);

      const backPillar = new THREE.Mesh(
        new THREE.CylinderGeometry(
          pillarRadiusTop,
          pillarRadiusBottom,
          pillarHeight,
          8
        ),
        pillarMaterial
      );
      backPillar.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(
          backPillar.geometry.attributes.uv.array,
          2
        )
      );
      backPillar.position.set(1.2 * sideFactor, pillarHeight / 2 + 0.5, 0.8);
      backPillar.rotation.z = THREE.MathUtils.degToRad(10 * sideFactor);
      backPillar.castShadow = true;
      this.mesh.add(backPillar);

      const crossbeamPillar = new THREE.Mesh(
        new THREE.BoxGeometry(0.3, 0.3, 1.8),
        pillarMaterial
      );
      crossbeamPillar.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(
          crossbeamPillar.geometry.attributes.uv.array,
          2
        )
      );
      crossbeamPillar.position.set(
        1.2 * sideFactor,
        pillarHeight * 0.7 + 0.5,
        0
      );
      crossbeamPillar.rotation.z = THREE.MathUtils.degToRad(10 * sideFactor);
      crossbeamPillar.castShadow = true;
      this.mesh.add(crossbeamPillar);
    }

    const axleGeometry = new THREE.CylinderGeometry(0.25, 0.25, 3, 8);
    const axle = new THREE.Mesh(axleGeometry, materials.metal);
    axle.geometry.setAttribute(
      "uv2",
      new THREE.Float32BufferAttribute(axle.geometry.attributes.uv.array, 2)
    );
    axle.rotation.z = Math.PI / 2;
    axle.position.y = pillarHeight * 0.8 + 0.5;
    axle.castShadow = true;
    this.mesh.add(axle);

    this.arm = new THREE.Group();
    const armLength = 6;
    const armGeometry = new THREE.BoxGeometry(0.4, 0.4, armLength);
    const armMeshVisual = new THREE.Mesh(armGeometry, materials.wood);
    armMeshVisual.geometry.setAttribute(
      "uv2",
      new THREE.Float32BufferAttribute(
        armMeshVisual.geometry.attributes.uv.array,
        2
      )
    );
    armMeshVisual.position.z = 0;
    armMeshVisual.castShadow = true;
    this.arm.add(armMeshVisual);

    const bucketSideGeometry = new THREE.BoxGeometry(1, 0.5, 0.1);
    const bucketBaseGeometry = new THREE.BoxGeometry(1, 0.1, 1);

    this.bucket = new THREE.Group();
    const bucketMaterial = materials.wood;
    const bucketBase = new THREE.Mesh(bucketBaseGeometry, bucketMaterial);
    bucketBase.geometry.setAttribute(
      "uv2",
      new THREE.Float32BufferAttribute(
        bucketBase.geometry.attributes.uv.array,
        2
      )
    );
    this.bucket.add(bucketBase);
    const side1 = new THREE.Mesh(bucketSideGeometry, bucketMaterial);
    side1.geometry.setAttribute(
      "uv2",
      new THREE.Float32BufferAttribute(side1.geometry.attributes.uv.array, 2)
    );
    side1.position.set(-0.5 + 0.05, 0.25, 0);
    this.bucket.add(side1);
    const side2 = side1.clone();
    side2.position.x = 0.5 - 0.05;
    this.bucket.add(side2);
    const side3 = new THREE.Mesh(
      new THREE.BoxGeometry(0.1, 0.5, 1 - 0.1),
      bucketMaterial
    );
    side3.geometry.setAttribute(
      "uv2",
      new THREE.Float32BufferAttribute(side3.geometry.attributes.uv.array, 2)
    );
    side3.position.set(0, 0.25, -0.5 + 0.05);
    this.bucket.add(side3);
    const side4 = side3.clone();
    side4.position.z = 0.5 - 0.05;
    this.bucket.add(side4);
    this.bucket.position.z = armLength / 2 - 0.5;
    this.bucket.castShadow = true;
    this.arm.add(this.bucket);

    const weightGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const weight = new THREE.Mesh(weightGeometry, materials.stone);
    weight.geometry.setAttribute(
      "uv2",
      new THREE.Float32BufferAttribute(weight.geometry.attributes.uv.array, 2)
    );
    weight.position.z = -armLength / 2 + 0.6;
    weight.castShadow = true;
    this.arm.add(weight);

    this.arm.position.y = axle.position.y;
    this.arm.position.z = 0;
    this.arm.rotation.x = this.originalRotation;
    this.mesh.add(this.arm);

    this.createWheels();
    this.mesh.position.set(-15, 0, -15);
    this.scene.add(this.mesh);
    this.loadProjectile();
  }

  createWheels() {
    const wheelRadius = 0.7;
    const wheelThickness = 0.3;
    const wheelPositions = [
      { x: -1.6, z: -1.0, y: wheelRadius },
      { x: 1.6, z: -1.0, y: wheelRadius },
      { x: -1.6, z: 1.0, y: wheelRadius },
      { x: 1.6, z: 1.0, y: wheelRadius },
    ];
    wheelPositions.forEach((pos) => {
      const wheelGeometry = new THREE.CylinderGeometry(
        wheelRadius,
        wheelRadius,
        wheelThickness,
        16
      );
      const wheel = new THREE.Mesh(wheelGeometry, materials.wood);
      wheel.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(wheel.geometry.attributes.uv.array, 2)
      );
      wheel.position.set(pos.x, pos.y, pos.z);
      wheel.rotation.z = Math.PI / 2;
      wheel.castShadow = true;
      const bandGeometry = new THREE.TorusGeometry(
        wheelRadius * 0.9,
        0.05,
        8,
        32
      );
      const band = new THREE.Mesh(bandGeometry, materials.metal);
      band.rotation.x = Math.PI / 2;
      wheel.add(band);
      this.mesh.add(wheel);
      this.wheels.push(wheel);
    });
  }

  loadProjectile() {
    if (!this.isLoaded && this.bucket) {
      const geometry = new THREE.SphereGeometry(0.4, 12, 12);
      Validation.validateGeometry(geometry);
      this.projectile = new THREE.Mesh(geometry, materials.stone);
      this.projectile.geometry.setAttribute(
        "uv2",
        new THREE.Float32BufferAttribute(
          this.projectile.geometry.attributes.uv.array,
          2
        )
      );
      this.projectile.castShadow = true;
      this.projectile.userData = {
        type: "projectile",
        isProjectile: true,
        active: false,
        hasCollided: false,
        radius: 0.4,
        velocity: new THREE.Vector3(0, 0, 0),
        mass: 1,
        bounces: 0,
        maxBounces: 3,
        gravity: -9.81,
        damage: 50,
        onCollision: null,
      };
      this.projectile.position.set(0, 0.15, 0);
      this.bucket.add(this.projectile);
      this.isLoaded = true;
    }
  }

  fire(tension) {
    if (!this.isLoaded || this.isAnimating) {
      // Only check isLoaded and isAnimating here
      return;
    }
    this.isAnimating = true;
    this.animationTime = 0;
    this.isFiringSequence = true; // Set flag to release projectile during animation
    this.currentTension = tension; // Store tension for use in update
  }

  update(deltaTime, keys, selectedObject) {
    if (this.isAnimating) {
      this.animationTime += deltaTime;
      const progress = Math.min(this.animationTime / 0.4, 1); // 0.4 second animation

      const currentArmRotation = THREE.MathUtils.lerp(
        this.originalRotation,
        this.releaseRotation,
        this.easeOutQuart(progress)
      );
      this.arm.rotation.x = currentArmRotation;

      // Check if it's time to release the projectile
      // Release slightly before or at the peak of the swing (e.g., progress > 0.7 or when arm angle is near release)
      if (this.isFiringSequence && this.projectile && progress >= 0.75) {
        // Adjust progress threshold as needed
        const worldPos = new THREE.Vector3();
        const worldQuat = new THREE.Quaternion();
        this.projectile.getWorldPosition(worldPos);
        this.projectile.getWorldQuaternion(worldQuat);

        this.bucket.remove(this.projectile);
        this.scene.add(this.projectile);

        this.projectile.position.copy(worldPos);
        this.projectile.quaternion.copy(worldQuat);

        const power = Utils.calculateCatapultPower(this.currentTension); // Use stored tension
        const launchAngle = Math.PI / 4;

        const catapultForward = new THREE.Vector3(0, 0, -1);
        catapultForward.applyQuaternion(this.mesh.quaternion);

        const catapultRight = new THREE.Vector3(1, 0, 0).applyQuaternion(
          this.mesh.quaternion
        );
        const launchRotation = new THREE.Quaternion().setFromAxisAngle(
          catapultRight,
          launchAngle
        );
        const finalLaunchDirection = catapultForward
          .clone()
          .applyQuaternion(launchRotation);

        this.projectile.userData.velocity =
          finalLaunchDirection.multiplyScalar(power);
        this.projectile.userData.active = true;
        this.projectile.userData.hasCollided = false;
        this.projectile.userData.bounces = 0;

        this.isLoaded = false; // Projectile is launched
        this.isFiringSequence = false; // Prevent multiple releases
      }

      if (progress >= 1) {
        this.isAnimating = false;
        setTimeout(() => {
          this.resetArm();
          this.loadProjectile();
        }, 800);
      }
    }

    if (selectedObject === this.mesh) {
      if (keys["KeyI"]) this.move("forward", deltaTime);
      if (keys["KeyK"]) this.move("backward", deltaTime);
      if (keys["KeyJ"]) this.move("left", deltaTime);
      if (keys["KeyL"]) this.move("right", deltaTime);
      if (keys["KeyU"]) this.rotate(-1, deltaTime);
      if (keys["KeyO"]) this.rotate(1, deltaTime);
    }
  }

  move(direction, deltaTime) {
    const moveDistance = this.moveSpeed * deltaTime;
    let actuallyMoved = false;
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(this.mesh.quaternion);
    forward.y = 0;
    forward.normalize();
    const right = new THREE.Vector3(1, 0, 0);
    right.applyQuaternion(this.mesh.quaternion);
    right.y = 0;
    right.normalize();

    switch (direction) {
      case "forward":
        this.mesh.position.add(forward.multiplyScalar(moveDistance));
        actuallyMoved = true;
        break;
      case "backward":
        this.mesh.position.add(forward.multiplyScalar(-moveDistance));
        actuallyMoved = true;
        break;
      case "left":
        this.mesh.position.add(right.multiplyScalar(-moveDistance));
        actuallyMoved = true;
        break;
      case "right":
        this.mesh.position.add(right.multiplyScalar(moveDistance));
        actuallyMoved = true;
        break;
    }

    if (actuallyMoved && this.wheels.length > 0) {
      const wheelRadius = this.wheels[0].geometry.parameters.radiusTop || 0.7;
      const wheelRotationSpeed = moveDistance / wheelRadius;
      this.wheels.forEach((wheel) => {
        let effectiveRotationFactor = 0;
        if (direction === "forward") effectiveRotationFactor = 1;
        else if (direction === "backward") effectiveRotationFactor = -1;
        // For strafing, wheels currently don't have a specific rotation logic here.
        // You could add a slight roll or keep them static.
        if (effectiveRotationFactor !== 0) {
          wheel.rotation.x += wheelRotationSpeed * effectiveRotationFactor;
        }
      });
    }
  }

  rotate(direction, deltaTime) {
    const rotateAngle = this.rotationSpeed * deltaTime * direction;
    this.mesh.rotation.y += rotateAngle;
  }

  easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4);
  }

  resetArm() {
    if (!this.isAnimating) {
      this.arm.rotation.x = this.originalRotation;
    }
  }

  reset() {
    if (this.arm) {
      this.arm.rotation.x = this.originalRotation;
    }
    if (this.projectile) {
      if (this.projectile.parent === this.bucket) {
        this.bucket.remove(this.projectile);
      } else if (this.projectile.parent === this.scene) {
        this.scene.remove(this.projectile);
      }
      if (this.projectile.geometry) this.projectile.geometry.dispose();
      if (this.projectile.material) this.projectile.material.dispose();
      this.projectile = null;
    }
    this.isLoaded = false;
    this.isAnimating = false;
    this.isFiringSequence = false; // Reset this flag too
    this.animationTime = 0;
    this.mesh.position.set(-15, 0, -15);
    this.mesh.rotation.set(0, 0, 0);
    this.wheels.forEach((wheel) => {
      if (wheel.geometry.parameters.radiusTop) {
        wheel.rotation.x = 0;
      }
    });
    this.loadProjectile();
  }

  getActiveProjectile() {
    if (
      this.projectile &&
      this.projectile.userData.active &&
      !this.projectile.userData.hasCollided
    ) {
      return this.projectile;
    }
    return null;
  }

  isReadyToFire() {
    return this.isLoaded && !this.isAnimating;
  }
}
