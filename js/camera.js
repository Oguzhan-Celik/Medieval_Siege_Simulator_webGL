import * as THREE from "three";
import { Utils } from "./utils.js";

export class CameraController {
  constructor(camera) {
    this.camera = camera;
    this.position = new THREE.Vector3(0, 10, 20);
    this.target = new THREE.Vector3(0, 0, 0);

    // Spherical coordinates for orbit camera
    this.phi = 0; // Horizontal rotation (azimuth)
    this.theta = Math.PI / 6; // Vertical rotation (polar angle)
    this.radius = 25;

    // Camera constraints
    this.minRadius = 5;
    this.maxRadius = 100;
    this.minPolarAngle = 0.1; // Prevent gimbal lock
    this.maxPolarAngle = Math.PI / 2 - 0.1; // Control settings
    this.sensitivity = 0.005;
    this.moveSpeed = 15;
    this.zoomSpeed = 20;
    this.rotationSpeed = 2;

    // Input states
    this.isMouseDown = false;
    this.lastMouseX = 0;
    this.lastMouseY = 0;
    this.isGKeyPressed = false;

    // Follow system
    this.followTarget = null;
    this.followOffset = new THREE.Vector3(0, 5, 15);
    this.isFollowing = false;
    this.followSmoothness = 0.08; // Daha yumuşak takip için
    this.followMinDistance = 8; // Minimum takip mesafesi

    // Camera shake system
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTime = 0;
    this.baseTarget = new THREE.Vector3();

    // Smooth movement
    this.targetPosition = new THREE.Vector3();
    this.targetLookAt = new THREE.Vector3();
    this.smoothFactor = 0.1;

    // Zoom optimization
    this.zoomAcceleration = 1.0;
    this.zoomVelocity = 0;
    this.zoomDamping = 0.9;
    this.isZooming = false; // Initialize camera position
    this.updateCameraPosition();
    this.camera.position.copy(this.position);
    this.camera.lookAt(this.target);

    // Add wheel event listener to the renderer's DOM element
    document.addEventListener("wheel", this.handleWheel.bind(this), {
      passive: false,
    });

    console.log("🎥 Camera Controller initialized");
  }

  handleMouseMove(event, mousePos) {
    if (this.isMouseDown && !this.isFollowing) {
      const deltaX = event.clientX - this.lastMouseX;
      const deltaY = event.clientY - this.lastMouseY;

      // Apply sensitivity and invert Y for natural movement
      this.phi -= deltaX * this.sensitivity;
      this.theta = Utils.clamp(
        this.theta + deltaY * this.sensitivity,
        this.minPolarAngle,
        this.maxPolarAngle
      );

      // Normalize phi to prevent overflow
      this.phi = this.phi % (Math.PI * 2);
    }

    this.lastMouseX = event.clientX;
    this.lastMouseY = event.clientY;
  }

  handleMouseDown(event) {
    if (event.button === 1) {
      // Middle mouse button
      this.isMouseDown = true;
      this.lastMouseX = event.clientX;
      this.lastMouseY = event.clientY;
    }
  }

  handleMouseUp(event) {
    if (event.button === 1) {
      this.isMouseDown = false;
    }
  }
  handleWheel(event) {
    event.preventDefault();

    const oldRadius = this.radius;
    const zoomFactor = event.deltaY > 0 ? 1.1 : 0.9;

    // Calculate target radius with smooth transition
    const targetRadius = Utils.clamp(
      this.radius * zoomFactor,
      this.minRadius,
      this.maxRadius
    );

    // Smoothly interpolate to the target radius
    this.radius = THREE.MathUtils.lerp(this.radius, targetRadius, 0.3);

    // Follow modundayken zoom'u follow offset'e uygula
    if (this.isFollowing) {
      const offsetScale = this.radius / 25;
      this.followOffset
        .normalize()
        .multiplyScalar(Math.max(this.followMinDistance, 15 * offsetScale));
    }

    // Update the camera's target position
    this.updateCameraPosition();
  }

  update(deltaTime, keys, selectedObject, siegeTower) {
    // DeltaTime güvenlik kontrolü
    if (!deltaTime || deltaTime <= 0 || deltaTime > 1) {
      deltaTime = 0.016; // 60 FPS fallback
    } // Handle global key controls (these should work in any mode)
    if (keys["KeyG"]) {
      if (!this.isGKeyPressed) {
        // Only trigger on initial key press
        this.isGKeyPressed = true;
        if (this.isFollowing) {
          this.stopFollow();
        } else if (selectedObject) {
          this.startFollow(selectedObject);
        }
      }
    } else {
      this.isGKeyPressed = false; // Reset when key is released
    }

    if (keys["KeyH"]) {
      this.reset();
    }

    // Handle different camera modes
    if (this.isFollowing && this.followTarget) {
      this.updateFollowCamera(deltaTime);
    } else {
      this.updateOrbitCamera(deltaTime, keys, selectedObject, siegeTower);
    }

    // Update camera shake
    this.updateCameraShake(deltaTime);

    // Smooth camera movement
    this.applySmoothMovement(deltaTime);
  }
  updateOrbitCamera(deltaTime, keys, selectedObject, siegeTower) {
    // Target movement with WASD
    const moveVector = new THREE.Vector3();
    const speed = this.moveSpeed * deltaTime;

    // Get the direction from camera to target (forward direction)
    const cameraDirection = new THREE.Vector3();
    cameraDirection.copy(this.target).sub(this.position);
    cameraDirection.y = 0; // Remove vertical component
    cameraDirection.normalize();

    // Calculate right vector
    const right = new THREE.Vector3();
    right.crossVectors(new THREE.Vector3(0, 1, 0), cameraDirection).normalize();

    // Calculate forward vector (perpendicular to right)
    const forward = new THREE.Vector3();
    forward.crossVectors(right, new THREE.Vector3(0, 1, 0)).normalize();

    // Apply movement
    if (keys["KeyW"]) moveVector.add(forward.multiplyScalar(speed));
    if (keys["KeyS"]) moveVector.add(forward.multiplyScalar(-speed));
    if (keys["KeyA"]) moveVector.add(right.multiplyScalar(speed));
    if (keys["KeyD"]) moveVector.add(right.multiplyScalar(-speed));
    if (keys["KeyQ"]) moveVector.y += speed; // Up
    if (keys["KeyE"]) moveVector.y -= speed; // Down

    if (moveVector.length() > 0) {
      this.target.add(moveVector);
    } // Zoom controls with smooth transitions
    const zoomSpeed = this.zoomSpeed * deltaTime;
    let targetRadius = this.radius;

    if (keys["KeyR"]) {
      targetRadius -= zoomSpeed * 10;
    }
    if (keys["KeyT"]) {
      targetRadius += zoomSpeed * 10;
    }

    // Clamp and smoothly interpolate radius
    targetRadius = Utils.clamp(targetRadius, this.minRadius, this.maxRadius);
    this.radius = THREE.MathUtils.lerp(this.radius, targetRadius, 0.1);

    // Orbit controls with arrow keys
    const rotSpeed = this.rotationSpeed * deltaTime;
    if (keys["ArrowLeft"]) this.phi -= rotSpeed;
    if (keys["ArrowRight"]) this.phi += rotSpeed;
    if (keys["ArrowUp"]) {
      this.theta = Math.max(this.minPolarAngle, this.theta - rotSpeed);
    }
    if (keys["ArrowDown"]) {
      this.theta = Math.min(this.maxPolarAngle, this.theta + rotSpeed);
    }

    // Focus on selected object
    if (keys["KeyF"] && selectedObject) {
      this.focusOnObject(selectedObject);
    } // Update camera position
    this.updateCameraPosition();
  }

  updateFollowCamera(deltaTime) {
    if (!this.followTarget || !this.followTarget.position) {
      console.warn("⚠️ Follow target lost, switching to orbit mode");
      this.stopFollow();
      return;
    }

    // Target'in mevcut pozisyon ve rotasyonunu al
    const targetPos = this.followTarget.position.clone();
    let targetRotation = 0;

    // Obje rotasyonunu kontrol et (güvenli erişim)
    try {
      if (
        this.followTarget.rotation &&
        typeof this.followTarget.rotation.y === "number"
      ) {
        targetRotation = this.followTarget.rotation.y;
      } else if (
        this.followTarget.userData &&
        this.followTarget.userData.rotation &&
        typeof this.followTarget.userData.rotation === "number"
      ) {
        targetRotation = this.followTarget.userData.rotation;
      } else if (
        this.followTarget.userData &&
        typeof this.followTarget.userData.rotationY === "number"
      ) {
        targetRotation = this.followTarget.userData.rotationY;
      }
    } catch (error) {
      console.warn("⚠️ Error accessing target rotation:", error);
      targetRotation = 0;
    }

    // Follow offset'i target'in rotasyonuna göre hesapla
    const rotatedOffset = this.followOffset.clone();
    if (targetRotation !== 0) {
      rotatedOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), targetRotation);
    }

    // Hedef pozisyonları hesapla
    this.targetPosition.copy(targetPos).add(rotatedOffset);
    this.targetLookAt.copy(targetPos);

    // Yumuşak takip için interpolation
    const safeDeltaTime = Math.max(deltaTime, 0.001); // Sıfıra bölmeyi önle
    const followSpeed = Math.min(
      this.followSmoothness * safeDeltaTime * 60,
      0.5
    ); // 60 FPS normalize
    this.position.lerp(this.targetPosition, followSpeed);
    this.target.lerp(this.targetLookAt, followSpeed);

    // Çok yaklaşmayı önle
    const distanceToTarget = this.position.distanceTo(targetPos);
    if (distanceToTarget < this.followMinDistance) {
      const direction = this.position.clone().sub(targetPos).normalize();
      this.position
        .copy(targetPos)
        .add(direction.multiplyScalar(this.followMinDistance));
    }
  }

  updateCameraPosition() {
    if (!this.isFollowing) {
      // Calculate position using spherical coordinates
      const x =
        this.target.x + this.radius * Math.sin(this.theta) * Math.cos(this.phi);
      const y = this.target.y + this.radius * Math.cos(this.theta);
      const z =
        this.target.z + this.radius * Math.sin(this.theta) * Math.sin(this.phi);

      this.targetPosition.set(x, y, z);
      this.targetLookAt.copy(this.target);
    }
  }

  applySmoothMovement(deltaTime) {
    // Smooth camera position interpolation
    this.position.lerp(this.targetPosition, this.smoothFactor);

    // Apply camera shake offset
    let lookAtTarget = this.targetLookAt.clone();
    if (this.shakeIntensity > 0) {
      const shakeOffset = this.calculateShakeOffset();
      lookAtTarget.add(shakeOffset);
    }

    this.camera.position.copy(this.position);
    this.camera.lookAt(lookAtTarget);
  }

  updateCameraShake(deltaTime) {
    if (this.shakeDuration > 0) {
      this.shakeTime += deltaTime * 1000; // Convert to

      if (this.shakeTime >= this.shakeDuration) {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
        this.shakeTime = 0;
      } else {
        // Decay shake intensity over time
        const progress = this.shakeTime / this.shakeDuration;
        this.shakeIntensity *= 1 - Utils.easeOutQuad(progress) * 0.1;
      }
    }
  }

  calculateShakeOffset() {
    if (this.shakeIntensity <= 0) return new THREE.Vector3();

    const time = Date.now() * 0.01;
    const offset = new THREE.Vector3(
      Math.sin(time * 1.7) * this.shakeIntensity,
      Math.cos(time * 2.3) * this.shakeIntensity,
      Math.sin(time * 1.1) * this.shakeIntensity * 0.5
    );

    return offset;
  }

  focusOnObject(object) {
    if (!object || !object.position) return;

    // Smoothly move target to object position
    const targetPos = object.position.clone();

    // Add slight offset based on object size
    const boundingBox = new THREE.Box3().setFromObject(object);
    const size = boundingBox.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);

    // Adjust radius based on object size
    this.radius = Utils.clamp(maxSize * 3, this.minRadius, this.maxRadius);

    // Smooth transition to new target
    this.target.lerp(targetPos, 0.1);

    console.log(`🎯 Focusing on ${object.userData.type || "object"}`);
  }
  toggleFollow(target) {
    // If we're already following and G is pressed again, stop following
    if (this.isFollowing) {
      console.log("🔄 Toggling follow mode off");
      this.stopFollow();
      return;
    }

    // If no valid target, don't start following
    if (!target || !target.position) {
      console.warn("⚠️ Invalid target for follow mode");
      return;
    }

    // Start following the target
    this.startFollow(target);
  }

  startFollow(target) {
    if (!target || !target.position) {
      console.warn("⚠️ Cannot start following: invalid target");
      return;
    }

    // Önceki takibi durdur
    if (this.isFollowing) {
      this.stopFollow();
    }

    this.followTarget = target;
    this.isFollowing = true;
    this.baseTarget.copy(this.target);

    // Target tipine göre follow offset ayarla
    const targetType = target.userData?.type || "unknown";
    switch (targetType) {
      case "siegeTower":
        this.followOffset.set(0, 12, 25);
        this.followSmoothness = 0.06; // Yavaş takip
        break;
      case "catapult":
        this.followOffset.set(-8, 8, 18);
        this.followSmoothness = 0.08;
        break;
      case "soldier":
      case "archer":
        this.followOffset.set(0, 3, 8);
        this.followSmoothness = 0.12; // Hızlı takip
        break;
      case "cavalry":
        this.followOffset.set(-5, 5, 12);
        this.followSmoothness = 0.15; // En hızlı takip
        break;
      default:
        this.followOffset.set(0, 5, 15);
        this.followSmoothness = 0.08;
    }

    // Mevcut zoom seviyesine göre offset'i ayarla
    const zoomScale = this.radius / 25;
    this.followOffset.multiplyScalar(Math.max(0.5, zoomScale));

    console.log(
      `📹 Started following ${targetType} (${
        target.userData?.name || "unnamed"
      })`
    );
    console.log(
      `   Offset: ${this.followOffset.x.toFixed(
        1
      )}, ${this.followOffset.y.toFixed(1)}, ${this.followOffset.z.toFixed(1)}`
    );
  }

  stopFollow() {
    if (!this.isFollowing) return;

    const wasFollowing = this.followTarget?.userData?.type || "object";

    this.isFollowing = false;
    this.followTarget = null; // Reset camera position and target
    this.target.copy(this.baseTarget);

    // Keep current camera angles but reset position based on current radius
    const x = this.radius * Math.sin(this.theta) * Math.cos(this.phi);
    const y = this.radius * Math.cos(this.theta);
    const z = this.radius * Math.sin(this.theta) * Math.sin(this.phi);

    this.position.set(this.target.x + x, this.target.y + y, this.target.z + z);

    // Reset all necessary follow-related properties
    this.targetPosition.copy(this.position);
    this.targetLookAt.copy(this.target);
    this.followSmoothness = 0.08;

    console.log(`📹 Stopped following ${wasFollowing}`);
    console.log(
      `   Switched to orbit mode at radius: ${this.radius.toFixed(1)}`
    );
  }

  shake(intensity, duration) {
    this.shakeIntensity = Math.max(this.shakeIntensity, intensity);
    this.shakeDuration = Math.max(this.shakeDuration, duration);
    this.shakeTime = 0;
  }

  setPosition(position) {
    this.position.copy(position);
    this.targetPosition.copy(position);
    this.camera.position.copy(position);
  }

  setTarget(target) {
    this.target.copy(target);
    this.targetLookAt.copy(target);
  }

  getPosition() {
    return this.position.clone();
  }

  getTarget() {
    return this.target.clone();
  }

  getDistance() {
    return this.radius;
  }

  setDistance(distance) {
    this.radius = Utils.clamp(distance, this.minRadius, this.maxRadius);
  }

  // Preset camera positions
  setPreset(presetName) {
    // Follow modundaysa önce durdur
    if (this.isFollowing) {
      this.stopFollow();
    }

    switch (presetName) {
      case "overview":
        this.target.set(0, 0, 0);
        this.radius = 50;
        this.theta = Math.PI / 4;
        this.phi = Math.PI / 4;
        break;

      case "ground":
        this.target.set(0, 0, 0);
        this.radius = 15;
        this.theta = Math.PI / 2.2;
        this.phi = 0;
        break;

      case "aerial":
        this.target.set(0, 0, 0);
        this.radius = 30;
        this.theta = Math.PI / 8;
        this.phi = 0;
        break;

      case "siege":
        this.target.set(-20, 0, 0);
        this.radius = 25;
        this.theta = Math.PI / 3;
        this.phi = Math.PI / 6;
        break;
    }

    this.updateCameraPosition();
    console.log(`📷 Camera preset: ${presetName}`);
  }

  reset() {
    // Follow modunu durdur
    if (this.isFollowing) {
      this.stopFollow();
    }

    this.target.set(0, 0, 0);
    this.phi = 0;
    this.theta = Math.PI / 6;
    this.radius = 25;
    this.isFollowing = false;
    this.followTarget = null;
    this.shakeIntensity = 0;
    this.shakeDuration = 0;
    this.shakeTime = 0;

    this.updateCameraPosition();
    console.log("🔄 Camera reset");
  }

  // Medieval-specific camera behaviors
  siegeMode() {
    // Dramatic angle for siege warfare
    this.setPreset("siege");
    this.shake(0.2, 1000);
  }

  battleMode(centerPosition) {
    // Dynamic battle camera
    if (centerPosition) {
      this.target.copy(centerPosition);
    }
    this.radius = 20;
    this.theta = Math.PI / 2.5;

    // Add some dramatic movement
    const time = Date.now() * 0.001;
    this.phi += Math.sin(time * 0.5) * 0.1;

    this.updateCameraPosition();
  }

  cinematicMode(duration = 5000) {
    // Cinematic camera sweep
    const startPhi = this.phi;
    const targetPhi = startPhi + Math.PI * 2;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      this.phi = Utils.lerp(startPhi, targetPhi, Utils.easeInOutQuad(progress));
      this.updateCameraPosition();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
    console.log("🎬 Cinematic mode activated");
  }
  getDebugInfo() {
    return {
      mode: this.isFollowing ? "Follow" : "Orbit",
      target: this.isFollowing ? this.followTarget?.userData?.type : null,
      radius: this.radius.toFixed(1),
      phi: ((this.phi * 180) / Math.PI).toFixed(1) + "°",
      theta: ((this.theta * 180) / Math.PI).toFixed(1) + "°",
      position: {
        x: this.position.x.toFixed(1),
        y: this.position.y.toFixed(1),
        z: this.position.z.toFixed(1),
      },
    };
  }
}
