import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

function loadTexture(path) {
  return new Promise((resolve) => {
    textureLoader.load(path, (texture) => {
      texture.encoding = THREE.sRGBEncoding;
      resolve(texture);
    });
  });
}

export const materials = {
  wood: null,
  stone: null,
  metal: null,
  dirt: null,
  stoneWall: null,
  asphalt: null,
  groundRock: null,
  initialized: false,

  async initialize() {
    if (this.initialized) return;

    // Load Wood textures
    const woodBaseColor = await loadTexture(
      "textures/wood/Wood_026_basecolor.jpg"
    );
    const woodNormal = await loadTexture("textures/wood/Wood_026_normal.jpg");
    const woodRoughness = await loadTexture(
      "textures/wood/Wood_026_roughness.jpg"
    );
    const woodAO = await loadTexture(
      "textures/wood/Wood_026_ambientOcclusion.jpg"
    );

    woodBaseColor.wrapS = woodBaseColor.wrapT = THREE.RepeatWrapping;
    woodNormal.wrapS = woodNormal.wrapT = THREE.RepeatWrapping;
    woodRoughness.wrapS = woodRoughness.wrapT = THREE.RepeatWrapping;
    woodAO.wrapS = woodAO.wrapT = THREE.RepeatWrapping;

    this.wood = new THREE.MeshStandardMaterial({
      map: woodBaseColor,
      normalMap: woodNormal,
      roughnessMap: woodRoughness,
      aoMap: woodAO,
      roughness: 1.0,
      metalness: 0.1,
    });

    // Load Stone textures
    const stoneBaseColor = await loadTexture(
      "textures/stone/Wall_Stone_023_BaseColor.jpg"
    );
    const stoneNormal = await loadTexture(
      "textures/stone/Wall_Stone_023_Normal.jpg"
    );
    const stoneRoughness = await loadTexture(
      "textures/stone/Wall_Stone_023_Roughness.jpg"
    );
    const stoneAO = await loadTexture(
      "textures/stone/Wall_Stone_023_AmbientOcclusion.jpg"
    );

    stoneBaseColor.wrapS = stoneBaseColor.wrapT = THREE.RepeatWrapping;
    stoneNormal.wrapS = stoneNormal.wrapT = THREE.RepeatWrapping;
    stoneRoughness.wrapS = stoneRoughness.wrapT = THREE.RepeatWrapping;
    stoneAO.wrapS = stoneAO.wrapT = THREE.RepeatWrapping;

    this.stone = new THREE.MeshStandardMaterial({
      map: stoneBaseColor,
      normalMap: stoneNormal,
      roughnessMap: stoneRoughness,
      aoMap: stoneAO,
      roughness: 0.9,
      metalness: 0.1,
    });

    // Load Metal textures
    const metalBaseColor = await loadTexture(
      "textures/metal/Metal_Pierced_001_4K_basecolor.png"
    );
    const metalNormal = await loadTexture(
      "textures/metal/Metal_Pierced_001_4K_normal.png"
    );
    const metalRoughness = await loadTexture(
      "textures/metal/Metal_Pierced_001_4K_roughness.png"
    );
    const metalMetallic = await loadTexture(
      "textures/metal/Metal_Pierced_001_4K_metallic.png"
    );
    const metalAO = await loadTexture(
      "textures/metal/Metal_Pierced_001_4K_ambientOcclusion.png"
    );

    metalBaseColor.wrapS = metalBaseColor.wrapT = THREE.RepeatWrapping;
    metalNormal.wrapS = metalNormal.wrapT = THREE.RepeatWrapping;
    metalRoughness.wrapS = metalRoughness.wrapT = THREE.RepeatWrapping;
    metalMetallic.wrapS = metalMetallic.wrapT = THREE.RepeatWrapping;
    metalAO.wrapS = metalAO.wrapT = THREE.RepeatWrapping;

    this.metal = new THREE.MeshStandardMaterial({
      map: metalBaseColor,
      normalMap: metalNormal,
      roughnessMap: metalRoughness,
      metalnessMap: metalMetallic,
      aoMap: metalAO,
      roughness: 0.5,
      metalness: 0.1,
    });

    // Load Dirt textures for ground
    const dirtBaseColor = await loadTexture(
      "textures/dirt/Ground_Wet_002_basecolor.jpg"
    );
    const dirtNormal = await loadTexture(
      "textures/dirt/Ground_Wet_002_normal.jpg"
    );
    const dirtRoughness = await loadTexture(
      "textures/dirt/Ground_Wet_002_roughness.jpg"
    );
    const dirtAO = await loadTexture(
      "textures/dirt/Ground_Wet_002_ambientOcclusion.jpg"
    );

    dirtBaseColor.wrapS = dirtBaseColor.wrapT = THREE.RepeatWrapping;
    dirtNormal.wrapS = dirtNormal.wrapT = THREE.RepeatWrapping;
    dirtRoughness.wrapS = dirtRoughness.wrapT = THREE.RepeatWrapping;
    dirtAO.wrapS = dirtAO.wrapT = THREE.RepeatWrapping;

    // Scale the dirt texture to make it look better on the ground
    dirtBaseColor.repeat.set(4, 4);
    dirtNormal.repeat.set(4, 4);
    dirtRoughness.repeat.set(4, 4);
    dirtAO.repeat.set(4, 4);

    this.dirt = new THREE.MeshStandardMaterial({
      map: dirtBaseColor,
      normalMap: dirtNormal,
      roughnessMap: dirtRoughness,
      aoMap: dirtAO,
      roughness: 0.8,
      metalness: 0,
    });

    // Load Stone Wall textures (renaming existing stone material)
    this.stoneWall = this.stone;

    // Load new stone texture for rocks
    const asphaltBaseColor = await loadTexture(
      "textures/asphalt/Asphalt_002_COLOR.jpg"
    );
    const asphaltNormal = await loadTexture(
      "textures/asphalt/Asphalt_002_NORM.jpg"
    );
    const asphaltRoughness = await loadTexture(
      "textures/asphalt/Asphalt_002_ROUGH.jpg"
    );
    const asphaltAO = await loadTexture("textures/asphalt/Asphalt_002_OCC.jpg");

    asphaltBaseColor.wrapS = asphaltBaseColor.wrapT = THREE.RepeatWrapping;
    asphaltNormal.wrapS = asphaltNormal.wrapT = THREE.RepeatWrapping;
    asphaltRoughness.wrapS = asphaltRoughness.wrapT = THREE.RepeatWrapping;
    asphaltAO.wrapS = asphaltAO.wrapT = THREE.RepeatWrapping;

    this.asphalt = new THREE.MeshStandardMaterial({
      map: asphaltBaseColor,
      normalMap: asphaltNormal,
      roughnessMap: asphaltRoughness,
      aoMap: asphaltAO,
      roughness: 1.0,
      metalness: 0,
    });

    // Load Ground Rock textures
    const groundRockBaseColor = await loadTexture(
      "textures/rock/Rock_Moss_001_basecolor.jpg"
    );
    const groundRockNormal = await loadTexture(
      "textures/rock/Rock_Moss_001_normal.jpg"
    );
    const groundRockRoughness = await loadTexture(
      "textures/rock/Rock_Moss_001_roughness.jpg"
    );
    const groundRockAO = await loadTexture(
      "textures/rock/Rock_Moss_001_ambientOcclusion.jpg"
    );

    groundRockBaseColor.wrapS = groundRockBaseColor.wrapT =
      THREE.RepeatWrapping;
    groundRockNormal.wrapS = groundRockNormal.wrapT = THREE.RepeatWrapping;
    groundRockRoughness.wrapS = groundRockRoughness.wrapT =
      THREE.RepeatWrapping;
    groundRockAO.wrapS = groundRockAO.wrapT = THREE.RepeatWrapping;

    // Scale the ground rock texture
    groundRockBaseColor.repeat.set(2, 2);
    groundRockNormal.repeat.set(2, 2);
    groundRockRoughness.repeat.set(2, 2);
    groundRockAO.repeat.set(2, 2);

    this.groundRock = new THREE.MeshStandardMaterial({
      map: groundRockBaseColor,
      normalMap: groundRockNormal,
      roughnessMap: groundRockRoughness,
      aoMap: groundRockAO,
      roughness: 0.85,
      metalness: 0,
    });

    this.initialized = true;
  },
};
