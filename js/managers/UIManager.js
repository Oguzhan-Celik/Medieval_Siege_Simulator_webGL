import { Utils } from "../utils.js";

export class UIManager {
  constructor() {
    this.fps = 60;
    this.initEventListeners();
    this.createVolumeControls();
    this.setVolumeControlsEnabled(false); // Ensure controls start disabled
  }

  initEventListeners() {
    document.getElementById("fireButton").addEventListener(
      "click",
      Utils.throttle(() => this.onFireButtonClick(), 1000)
    );
    document
      .getElementById("resetButton")
      .addEventListener("click", () => this.onResetButtonClick());

    document.getElementById("torchSlider").addEventListener("input", (e) => {
      document.getElementById("torchValue").textContent = e.target.value + "%";
      if (this.onTorchSliderChange) {
        this.onTorchSliderChange(e.target.value);
      }
    });

    document.getElementById("tensionSlider").addEventListener("input", (e) => {
      document.getElementById("tensionValue").textContent =
        e.target.value + "%";
    });

    window.addEventListener(
      "resize",
      Utils.debounce(() => {
        if (this.onWindowResize) {
          this.onWindowResize();
        }
      }, 250)
    );
  }

  createVolumeControls() {
    const volumeContainer = document.createElement("div");
    volumeContainer.className = "volume-controls";
    volumeContainer.style.position = "fixed";
    volumeContainer.style.top = "10px";
    volumeContainer.style.right = "10px";
    volumeContainer.style.padding = "10px";
    volumeContainer.style.backgroundColor = "rgba(0, 0, 0, 0.5)";
    volumeContainer.style.borderRadius = "5px";
    volumeContainer.style.zIndex = "1000";

    // Start/Stop Music Button
    const musicToggleBtn = document.createElement("button");
    musicToggleBtn.textContent = "🎵 Start Music";
    musicToggleBtn.style.width = "100%";
    musicToggleBtn.style.padding = "8px";
    musicToggleBtn.style.marginBottom = "10px";
    musicToggleBtn.style.backgroundColor = "#4CAF50";
    musicToggleBtn.style.color = "white";
    musicToggleBtn.style.border = "none";
    musicToggleBtn.style.borderRadius = "4px";
    musicToggleBtn.style.cursor = "pointer";
    musicToggleBtn.onclick = async () => {
      if (!Utils.backgroundMusicLoop) {
        musicToggleBtn.textContent = "🎵 Stop Music";
        musicToggleBtn.style.backgroundColor = "#f44336";
        await Utils.initializeBackgroundAudio();
        this.setVolumeControlsEnabled(true);
      } else {
        musicToggleBtn.textContent = "🎵 Start Music";
        musicToggleBtn.style.backgroundColor = "#4CAF50";
        Utils.cleanupBackgroundAudio();
        this.setVolumeControlsEnabled(false);
      }
    };
    volumeContainer.appendChild(musicToggleBtn);

    // Volume Controls
    const masterVolume = this.createVolumeSlider(
      "Master Volume",
      "master-volume",
      0.5
    );
    masterVolume.oninput = (e) => Utils.setMasterVolume(e.target.value);

    const musicVolume = this.createVolumeSlider(
      "Music Volume",
      "music-volume",
      0.5
    );
    musicVolume.oninput = (e) => Utils.setMusicVolume(e.target.value);

    const ambientVolume = this.createVolumeSlider(
      "Ambient Volume",
      "ambient-volume",
      0.3
    );
    ambientVolume.oninput = (e) => Utils.setAmbientVolume(e.target.value);

    volumeContainer.appendChild(
      this.createVolumeControl("Master Volume", masterVolume)
    );
    volumeContainer.appendChild(
      this.createVolumeControl("Music Volume", musicVolume)
    );
    volumeContainer.appendChild(
      this.createVolumeControl("Ambient Volume", ambientVolume)
    );

    document.body.appendChild(volumeContainer);
  }

  createVolumeSlider(name, id, defaultValue) {
    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "1";
    slider.step = "0.01";
    slider.value = defaultValue;
    slider.id = id;
    slider.className = "volume-slider";
    return slider;
  }

  createVolumeControl(label, slider) {
    const container = document.createElement("div");
    container.className = "volume-control";
    container.style.marginBottom = "10px";

    const labelElement = document.createElement("label");
    labelElement.textContent = label;
    labelElement.style.color = "white";
    labelElement.style.marginRight = "10px";
    labelElement.style.display = "block";

    container.appendChild(labelElement);
    container.appendChild(slider);

    return container;
  }

  updateUI(cameraPos, torchValue) {
    // FPS
    document.getElementById("fps").textContent = Utils.formatNumber(
      this.fps,
      0
    );

    // Camera position
    document.getElementById("cameraPos").textContent = `X:${Utils.formatNumber(
      cameraPos.x,
      0
    )} Y:${Utils.formatNumber(cameraPos.y, 0)} Z:${Utils.formatNumber(
      cameraPos.z,
      0
    )}`;

    // Torch light intensity
    document.getElementById("torchValue").textContent = torchValue + "%";
  }

  updateFPS(deltaTime) {
    if (deltaTime > 0) {
      const currentFps = 1 / deltaTime;
      this.fps = Utils.lerp(this.fps, currentFps, 0.1);
    }
  }

  setSelectedObject(object) {
    const name = object ? object.userData.type : "Hiçbiri";
    document.getElementById("selectedObject").textContent = name;
  }

  setVolumeControlsEnabled(enabled) {
    const sliders = ["master-volume", "music-volume", "ambient-volume"];
    sliders.forEach((id) => {
      const slider = document.getElementById(id);
      if (slider) {
        slider.disabled = !enabled;
        slider.style.opacity = enabled ? "1" : "0.5";
      }
    });

    const container = document.querySelector(".volume-controls");
    if (container) {
      container.style.opacity = enabled ? "1" : "0.5";
      if (!enabled) {
        container.title = "Click anywhere to enable audio";
      } else {
        container.title = "";
      }
    }
  }
}
