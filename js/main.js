import { CameraController } from "/js/camera.js";
import { Catapult } from "/js/objects/catapult.js";
import { Ammunition } from "/js/objects/ammunition.js";
import { SiegeTower } from "/js/objects/siegeTower.js";
import { LightingSystem } from "/js/lighting.js";
import { PhysicsEngine } from "/js/physics.js";
import { Utils } from "/js/utils.js";
import { EffectsManager } from "/js/managers/EffectsManager.js";
import { CollisionManager } from "/js/managers/CollisionManager.js";
import { SceneManager } from "/js/managers/SceneManager.js";
import { UIManager } from "/js/managers/UIManager.js";
import { materials } from "/js/materials.js";
import * as THREE from "three";
import { RGBELoader } from "three/addons/loaders/RGBELoader.js";

class MedievalSiegeSimulator {
  constructor() {
    this.scene = null;
    this.camera = null;
    this.renderer = null;

    // Core systems
    this.cameraController = null;
    this.lightingSystem = null;
    this.physicsEngine = null;

    // Managers
    this.effectsManager = null;
    this.collisionManager = null;
    this.sceneManager = null;
    this.uiManager = null;

    // Game objects
    this.catapult = null;
    this.ammunition = null;
    this.siegeTower = null;
    this.torch = null;
    this.torchLight = null;
    this.fireObject = null;

    // Game state
    this.selectedObject = null;
    this.isDragging = false;
    this.mousePos = { x: 0, y: 0 };
    this.lastTime = 0;
    this.fps = 60;
    this.keys = {}; // Stores the state of currently pressed keys
    // this.genericRotationSpeed = Math.PI / 180 * 2; // Removed, replaced by cameraViewRotationSpeed
    this.cameraViewRotationSpeed = Math.PI / 2; // Radians per second (90 degrees/sec) for new camera controls

    // Collision tracking
    this.collisionCount = 0;
    this.lastCollisionTime = 0;

    // Raycaster for object selection and dragging
    this.raycaster = new THREE.Raycaster();
    this.lastIntersectionPoint = new THREE.Vector3();
    this.isAudioInitialized = false;
    this.init();
  }

  async init() {
    this.initScene();
    await materials.initialize();
    this.initManagers();
    this.initObjects();
    this.setupCollisionTargets();
    this.initEventListeners();
    this.animate(0);

    console.log("🏰 Medieval Siege Simulator başlatıldı!");
    console.log("🎯 Collision system initialized and ready!");
    console.log("Kontroller için sol alt köşedeki talimatları inceleyin.");
  }
  initScene() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(0x0a0a0f, 25, 100);

    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    const canvas = document.getElementById("canvas");
    this.renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      toneMapping: THREE.ACESFilmicToneMapping,
      toneMappingExposure: 0.3,
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();

    new RGBELoader().setDataType(THREE.FloatType).load(
      "textures/hdr/NightSkyHDRI003_2K-HDR.hdr",
      (hdrTexture) => {
        console.log("✨ HDR environment map loaded successfully");
        hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
        const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
        this.scene.environment = envMap;
        this.scene.background = envMap;
        pmremGenerator.dispose();
      },
      (xhr) => {
        console.log(
          `🔄 HDR Loading: ${((xhr.loaded / xhr.total) * 100).toFixed(2)}%`
        );
      },
      (error) => {
        console.error("❌ Error loading HDR environment map:", error);
        this.scene.background = new THREE.Color(0x87ceeb);
      }
    );

    this.cameraController = new CameraController(this.camera);
    this.lightingSystem = new LightingSystem(this.scene);
    this.physicsEngine = new PhysicsEngine(this.scene);
  }

  initManagers() {
    this.effectsManager = new EffectsManager(this.scene);
    this.collisionManager = new CollisionManager(
      this.scene,
      this.effectsManager
    );
    //this.collisionManager.setDebugMode(true);
    this.sceneManager = new SceneManager(this.scene);
    this.uiManager = new UIManager();
    this.sceneManager.createGround();
    this.sceneManager.createMedievalSquare();
    const { torch, light, ambientLight, fire } =
      this.sceneManager.createTorch();
    this.torch = torch;
    this.torchLight = light;
    this.torchAmbientLight = ambientLight;
    this.fireObject = fire;
    this.uiManager.setVolumeControlsEnabled(false);
  }

  initObjects() {
    this.catapult = new Catapult(this.scene);
    this.ammunition = new Ammunition(this.scene);
    this.siegeTower = new SiegeTower(this.scene);
    this.scene.collisionManager = this.collisionManager;
  }

  setupCollisionTargets() {
    console.log("🎯 Setting up collision targets...");
    this.scene.traverse((object) => {
      if (object.name === "ground") {
        object.userData.type = "ground";
      }
      if (
        object.name &&
        (object.name.includes("wall") || object.name.includes("tower")) &&
        !object.userData.type
      ) {
        object.userData.type = object.name;
      }
    });
  }

  createTestBarrels() {
    console.log("🛢️ Test barrels are now created by the Ammunition class.");
  }
  initEventListeners() {
    document.addEventListener("keydown", (e) => this.handleKeyDown(e));
    document.addEventListener("keyup", (e) => this.handleKeyUp(e));
    document.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    document.addEventListener("mousedown", (e) => this.handleMouseDown(e));
    document.addEventListener("mouseup", (e) => this.handleMouseUp(e));
    document.addEventListener("contextmenu", (e) => e.preventDefault());

    this.uiManager.onFireButtonClick = () => this.fireCatapult();
    this.uiManager.onResetButtonClick = () => this.resetScene();
    this.uiManager.onTorchSliderChange = (value) => {
      if (this.torchLight) {
        if (this.effectsManager && this.effectsManager.updateFireEffect) {
          // updateFireEffect in EffectsManager will handle intensity based on slider
        } else if (this.torchLight.isPointLight) {
          this.torchLight.intensity = Utils.map(value, 0, 100, 0, 5);
        }
      }
    };
    this.uiManager.onWindowResize = () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    };
  }

  handleKeyDown(event) {
    this.keys[event.code] = true;
    if (event.code === "Space") {
      event.preventDefault();
      this.fireCatapult();
    }
  }

  handleKeyUp(event) {
    this.keys[event.code] = false;
  }

  handleMouseMove(event) {
    this.mousePos.x = (event.clientX / window.innerWidth) * 2 - 1;
    this.mousePos.y = -(event.clientY / window.innerHeight) * 2 + 1;

    if (
      this.isDragging &&
      this.selectedObject &&
      this.selectedObject.userData.draggable
    ) {
      this.raycaster.setFromCamera(this.mousePos, this.camera);
      const ground = this.scene.getObjectByName("ground");
      if (!ground) {
        return;
      }
      const intersects = this.raycaster.intersectObject(ground);
      if (intersects.length > 0) {
        this.lastIntersectionPoint.copy(intersects[0].point);
      }
      this.selectedObject.position.x = this.lastIntersectionPoint.x;
      this.selectedObject.position.z = this.lastIntersectionPoint.z;
      switch (this.selectedObject.userData.type) {
        case "barrel":
          this.selectedObject.position.y = 1.0;
          break;
        case "torch":
          this.selectedObject.position.y = 0.0;
          break;
        case "catapult":
          this.selectedObject.position.y = 0.0;
          break;
        case "siegeTower":
          this.selectedObject.position.y = 0.0;
          break;
        case "stone":
          this.selectedObject.position.y =
            this.selectedObject.geometry.parameters.radius || 0.3;
          break;
        default:
          this.selectedObject.position.y = 0;
      }
    } else {
      if (this.cameraController && this.cameraController.handleMouseMove) {
        this.cameraController.handleMouseMove(event, this.mousePos);
      }
    }
  }
  handleMouseDown(event) {
    if (this.cameraController && this.cameraController.handleMouseDown) {
      this.cameraController.handleMouseDown(event);
    }
    if (event.button === 0) {
      this.selectObject(event);
      if (this.selectedObject && this.selectedObject.userData.draggable) {
        this.isDragging = true;
        this.selectedObject.userData.isDragging = true;
        this.raycaster.setFromCamera(this.mousePos, this.camera);
        const ground = this.scene.getObjectByName("ground");
        if (ground) {
          const intersects = this.raycaster.intersectObject(ground);
          if (intersects.length > 0) {
            this.lastIntersectionPoint.copy(intersects[0].point);
          }
        }
      }
    } else if (event.button === 2) {
      this.armExplosive(event);
    }
  }
  handleMouseUp(event) {
    if (this.cameraController && this.cameraController.handleMouseUp) {
      this.cameraController.handleMouseUp(event);
    }
    this.isDragging = false;
    if (this.selectedObject) {
      this.selectedObject.userData.isDragging = false;
    }
  }

  selectObject(event) {
    this.raycaster.setFromCamera(this.mousePos, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );
    let newSelectedObj = null;
    for (const intersect of intersects) {
      let obj = intersect.object;
      while (obj.parent && !obj.userData.draggable) {
        obj = obj.parent;
      }
      if (obj.userData.draggable) {
        newSelectedObj = obj;
        break;
      }
    }
    if (this.selectedObject && this.selectedObject !== newSelectedObj) {
      if (this.selectedObject.userData.originalMaterialEmissive !== undefined) {
        if (
          this.selectedObject.material &&
          this.selectedObject.material.emissive
        ) {
          this.selectedObject.material.emissive.setHex(
            this.selectedObject.userData.originalMaterialEmissive
          );
        }
      } else if (
        this.selectedObject.material &&
        this.selectedObject.material.emissive
      ) {
        this.selectedObject.material.emissive.setHex(0x000000);
      }
      if (this.selectedObject.userData.clonedMaterialForSelection) {
        if (this.selectedObject.userData.originalMaterialRef) {
          if (
            this.selectedObject.material &&
            typeof this.selectedObject.material.dispose === "function"
          ) {
            this.selectedObject.material.dispose();
          }
          this.selectedObject.material =
            this.selectedObject.userData.originalMaterialRef;
        }
        delete this.selectedObject.userData.clonedMaterialForSelection;
        delete this.selectedObject.userData.originalMaterialRef;
        delete this.selectedObject.userData.originalMaterialEmissive;
      }
    }
    this.selectedObject = newSelectedObj;
    if (this.selectedObject) {
      if (!this.selectedObject.material) {
        this.uiManager.setSelectedObject(this.selectedObject);
        return;
      }
      if (this.selectedObject.material.emissive === undefined) {
      } else {
        if (!this.selectedObject.userData.clonedMaterialForSelection) {
          let isSharedGlobalMaterial = false;
          for (const key in materials) {
            if (
              materials.hasOwnProperty(key) &&
              typeof materials[key] === "object" &&
              materials[key] &&
              materials[key].isMaterial
            ) {
              if (this.selectedObject.material === materials[key]) {
                isSharedGlobalMaterial = true;
                break;
              }
            }
          }
          if (
            isSharedGlobalMaterial ||
            (this.selectedObject.material.users &&
              this.selectedObject.material.users > 1)
          ) {
            // Check for users property
            this.selectedObject.userData.originalMaterialRef =
              this.selectedObject.material;
            this.selectedObject.material = this.selectedObject.material.clone();
            this.selectedObject.userData.clonedMaterialForSelection = true;
            this.selectedObject.userData.originalMaterialEmissive = this
              .selectedObject.userData.originalMaterialRef.emissive
              ? this.selectedObject.userData.originalMaterialRef.emissive.getHex()
              : 0x000000;
          } else {
            this.selectedObject.userData.originalMaterialEmissive =
              this.selectedObject.material.emissive.getHex();
          }
        }
        this.selectedObject.material.emissive.setHex(0x444444);
      }
    }
    this.uiManager.setSelectedObject(this.selectedObject);
  }
  armExplosive(event) {
    this.raycaster.setFromCamera(this.mousePos, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );
    let barrelToArm = null;
    for (const intersect of intersects) {
      let obj = intersect.object;
      while (obj.parent && obj.userData.type !== "barrel") {
        obj = obj.parent;
      }
      if (obj.userData.type === "barrel") {
        barrelToArm = obj;
        break;
      }
    }
    if (barrelToArm) {
      barrelToArm.userData.explosive = !barrelToArm.userData.explosive;
      const targetColor = barrelToArm.userData.explosive
        ? 0xff4444
        : barrelToArm.userData.originalMaterialBaseColorHex !== undefined
        ? barrelToArm.userData.originalMaterialBaseColorHex
        : 0x8b4513;
      if (
        !barrelToArm.userData.hasClonedMaterialForDamageState &&
        !barrelToArm.userData.clonedMaterialForSelection
      ) {
        let isSharedGlobalMaterial = false;
        for (const key in materials) {
          if (
            materials.hasOwnProperty(key) &&
            typeof materials[key] === "object" &&
            materials[key] &&
            materials[key].isMaterial
          ) {
            if (barrelToArm.material === materials[key]) {
              isSharedGlobalMaterial = true;
              break;
            }
          }
        }
        if (
          isSharedGlobalMaterial ||
          (barrelToArm.material.users && barrelToArm.material.users > 1)
        ) {
          if (barrelToArm.userData.originalMaterialBaseColorHex === undefined) {
            barrelToArm.userData.originalMaterialBaseColorHex =
              barrelToArm.material.color.getHex();
          }
          barrelToArm.material = barrelToArm.material.clone();
        }
      }
      barrelToArm.material.color.setHex(targetColor);
      Utils.playSound(
        barrelToArm.userData.explosive
          ? "sounds/effects/arm_explosive"
          : "sounds/effects/disarm_explosive",
        0.8
      );
      if (barrelToArm.userData.explosive) {
        this.cameraController.shake(3, 500);
        setTimeout(() => {
          if (
            barrelToArm &&
            barrelToArm.parent &&
            !barrelToArm.userData.isExploding
          ) {
            barrelToArm.userData.isExploding = true;
            const dummyTargetWrapper = {
              mesh: barrelToArm,
              type: "barrel",
              explosive: true,
              position: barrelToArm.position.clone(),
            };
            this.collisionManager.triggerBarrelExplosion(
              dummyTargetWrapper,
              barrelToArm.position.clone()
            );
            if (this.selectedObject === barrelToArm) {
              this.selectedObject = null;
              this.uiManager.setSelectedObject(null);
            }
          }
        }, 200);
      } else {
        this.cameraController.shake(1, 300);
      }
    }
  }
  fireCatapult() {
    if (!this.catapult || !this.catapult.mesh) return;
    if (!this.catapult.isReadyToFire()) {
      return;
    }
    const tensionSlider = document.getElementById("tensionSlider");
    const tension = tensionSlider ? parseInt(tensionSlider.value) : 50;
    if (Utils.playSound) {
      Utils.playSound(
        "sounds/effects/catapult_fire",
        Utils.map ? Utils.map(tension, 10, 100, 0.5, 1.0) : 0.8
      );
    }
    if (this.catapult.fire) {
      this.catapult.fire(tension);
    }
    setTimeout(() => {
      const activeProjectiles = this.getActiveProjectiles();
      if (activeProjectiles.length > 0) {
        const newProjectile = activeProjectiles[activeProjectiles.length - 1];
        if (newProjectile && !newProjectile.userData.onCollision) {
          newProjectile.userData.onCollision = (type, data) => {
            this.logCollision(type, data, newProjectile);
          };
        }
      }
    }, 100);
  }

  logCollision(type, data, projectile) {
    this.collisionCount++;
    const currentTime = Date.now();
    this.lastCollisionTime = currentTime;
    if (this.cameraController && this.cameraController.shake) {
      const shakeIntensity = data?.force ? Math.min(data.force * 0.5, 2) : 0.5;
      const shakeDuration = data?.final ? 300 : 150;
      this.cameraController.shake(shakeIntensity, shakeDuration);
    }
  }

  resetScene() {
    console.log("🔄 Resetting scene...");
    this.collisionCount = 0;
    this.lastCollisionTime = 0;
    this.physicsEngine.reset();
    this.scene.traverse((child) => {
      if (child.userData && child.userData.isProjectile) {
        if (child.material) child.material.dispose();
        if (child.geometry) child.geometry.dispose();
        this.scene.remove(child);
      }
    });
    if (this.catapult) this.catapult.reset();
    if (this.ammunition) this.ammunition.reset();
    if (this.siegeTower) this.siegeTower.reset();
    if (this.torch) {
      this.torch.position.set(0, 0, 0);
      if (
        this.torch.material &&
        this.torch.userData.hasClonedMaterialForDamageState
      ) {
        this.torch.material.dispose();
        delete this.torch.userData.hasClonedMaterialForDamageState;
      }
    }
    if (
      this.selectedObject &&
      this.selectedObject.userData.clonedMaterialForSelection
    ) {
      if (this.selectedObject.userData.originalMaterialRef) {
        if (
          this.selectedObject.material &&
          typeof this.selectedObject.material.dispose === "function"
        ) {
          this.selectedObject.material.dispose();
        }
        this.selectedObject.material =
          this.selectedObject.userData.originalMaterialRef;
      }
      delete this.selectedObject.userData.clonedMaterialForSelection;
      delete this.selectedObject.userData.originalMaterialRef;
      delete this.selectedObject.userData.originalMaterialEmissive;
    }
    this.cameraController.reset();
    this.selectedObject = null;
    const torchSlider = document.getElementById("torchSlider");
    if (torchSlider) torchSlider.value = 75;
    const tensionSlider = document.getElementById("tensionSlider");
    if (tensionSlider) tensionSlider.value = 50;
    const selectedObjectUI = document.getElementById("selectedObject");
    if (selectedObjectUI) selectedObjectUI.textContent = "Hiçbiri";
    this.collisionManager.clearCache();
    if (Utils.playSound) {
      Utils.playSound("sounds/effects/reset", 0.7);
    }
    console.log("✅ Scene reset complete");
  }

  animate(currentTime) {
    requestAnimationFrame((time) => this.animate(time));
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    // --- MODIFIED SECTION FOR CAMERA ROTATION ---
    if (this.cameraController) {
      // Ensure cameraController exists
      const rotationAmount = this.cameraViewRotationSpeed * deltaTime;
      let viewChanged = false;

      // Pitch (Theta) - PageUp/PageDown
      if (this.keys["PageUp"]) {
        this.cameraController.theta = Math.max(
          this.cameraController.minPolarAngle,
          this.cameraController.theta - rotationAmount
        );
        viewChanged = true;
      }
      if (this.keys["PageDown"]) {
        this.cameraController.theta = Math.min(
          this.cameraController.maxPolarAngle,
          this.cameraController.theta + rotationAmount
        );
        viewChanged = true;
      }

      // Yaw (Phi) - Insert/Delete
      if (this.keys["Insert"]) {
        this.cameraController.phi -= rotationAmount;
        viewChanged = true;
      }
      if (this.keys["Delete"]) {
        this.cameraController.phi += rotationAmount;
        viewChanged = true;
      }

      // If phi or theta changed, the cameraController's update will handle it.
      // For Roll (direct camera.rotation.z) - Home/End
      // This is applied AFTER cameraController.update() to avoid being overridden by lookAt immediately.
    }
    // --- END OF MODIFIED SECTION FOR CAMERA ROTATION (PITCH/YAW) ---

    const activeProjectiles = this.getActiveProjectiles();
    if (activeProjectiles.length > 0) {
      const collisionTargets =
        this.collisionManager.collisionDetector.getCollisionTargets(this.scene);
      this.collisionManager.checkCollisions(
        activeProjectiles,
        collisionTargets
      );
    }

    // Camera controller update MUST happen before direct roll manipulation if roll is applied to camera.rotation.z
    this.cameraController.update(deltaTime, this.keys, this.selectedObject);

    // --- APPLY CAMERA ROLL ---
    if (this.cameraController) {
      // Check again, though it should exist
      const rollAmount = this.cameraViewRotationSpeed * deltaTime;
      if (this.keys["Home"]) {
        this.camera.rotation.z += rollAmount;
        // After direct rotation, if using lookAt, up vector might need to be re-orthogonalized or managed
        // For a simple roll, this might be okay, but can lead to gimbal lock or strange behavior with complex controllers.
      }
      if (this.keys["End"]) {
        this.camera.rotation.z -= rollAmount;
      }
      // Important: If camera.rotation.z is changed, and the CameraController uses lookAt,
      // the 'up' vector of the camera might become misaligned over time if not managed.
      // A full quaternion-based free-look camera is different from an orbit controller.
    }
    // --- END APPLY CAMERA ROLL ---

    this.physicsEngine.update(deltaTime);
    if (
      this.effectsManager &&
      this.effectsManager.updateFireEffect &&
      this.fireObject &&
      this.torchLight
    ) {
      const torchSlider = document.getElementById("torchSlider");
      const torchSliderValue = torchSlider ? parseInt(torchSlider.value) : 75;
      this.effectsManager.updateFireEffect(
        this.fireObject,
        this.torchLight,
        torchSliderValue
      );
    }
    if (this.torch && this.torch.update) {
      this.torch.update(deltaTime);
    }
    if (this.catapult)
      this.catapult.update(deltaTime, this.keys, this.selectedObject);
    if (this.ammunition) this.ammunition.update(deltaTime);
    if (this.siegeTower)
      this.siegeTower.update(deltaTime, this.keys, this.selectedObject);
    if (deltaTime > 0) {
      const currentFps = 1 / deltaTime;
      this.fps = Utils.lerp
        ? Utils.lerp(this.fps, currentFps, 0.1)
        : currentFps;
    }
    const cameraPos = this.cameraController.getPosition();
    const torchSlider = document.getElementById("torchSlider");
    const torchValue = torchSlider ? parseInt(torchSlider.value) : 75;
    this.uiManager.updateUI(cameraPos, torchValue);
    this.uiManager.updateFPS(this.fps);
    this.renderer.render(this.scene, this.camera);
  }

  getActiveProjectiles() {
    const projectiles = [];
    this.scene.traverse((object) => {
      if (
        object.userData?.isProjectile &&
        object.userData.active &&
        !object.userData.hasCollided
      ) {
        projectiles.push(object);
      }
    });
    return projectiles;
  }
  async initializeAudio() {
    if (this.isAudioInitialized) {
      return;
    }
    try {
      const success = await Utils.initAudio();
      if (success) {
        await Utils.initializeBackgroundAudio();
        this.isAudioInitialized = true;
        this.uiManager.setVolumeControlsEnabled(true);
        console.log(
          "🎵 Background audio initialized and volume controls enabled."
        );
      } else {
        console.warn("⚠️ Audio initialization waiting for user interaction.");
      }
    } catch (error) {
      console.warn("Failed to initialize background audio:", error);
    }
  }
  cleanup() {
    Utils.cleanupBackgroundAudio();
  }
}
const game = new MedievalSiegeSimulator();
function oneTimeUserInteractionListener() {
  game.initializeAudio();
  document.removeEventListener("click", oneTimeUserInteractionListener);
  document.removeEventListener("keydown", oneTimeUserInteractionListener);
}
document.addEventListener("click", oneTimeUserInteractionListener);
document.addEventListener("keydown", oneTimeUserInteractionListener);
