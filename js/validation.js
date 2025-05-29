// Helper functions for validating geometry data
import * as THREE from "three";

export class Validation {
  static isValidNumber(value) {
    return typeof value === "number" && !isNaN(value) && isFinite(value);
  }

  static isValidVector3(vector) {
    return (
      vector instanceof THREE.Vector3 &&
      this.isValidNumber(vector.x) &&
      this.isValidNumber(vector.y) &&
      this.isValidNumber(vector.z)
    );
  }

  static sanitizeNumber(value, defaultValue = 0) {
    return this.isValidNumber(value) ? value : defaultValue;
  }

  static sanitizeVector3(vector, defaultVector = new THREE.Vector3()) {
    if (!vector) return defaultVector.clone();

    return new THREE.Vector3(
      this.sanitizeNumber(vector.x, defaultVector.x),
      this.sanitizeNumber(vector.y, defaultVector.y),
      this.sanitizeNumber(vector.z, defaultVector.z)
    );
  }

  static validateBufferAttribute(attribute, defaultValue = 0) {
    if (!attribute || !attribute.array) return false;

    let hasInvalidValue = false;
    const array = attribute.array;

    for (let i = 0; i < array.length; i++) {
      if (!this.isValidNumber(array[i])) {
        array[i] = defaultValue;
        hasInvalidValue = true;
      }
    }

    if (hasInvalidValue) {
      attribute.needsUpdate = true;
    }

    return hasInvalidValue;
  }

  static validateGeometry(geometry) {
    if (!geometry) return;

    let hasInvalidValues = false;

    // Validate position attribute (required)
    const position = geometry.attributes.position;
    if (position) {
      if (this.validateBufferAttribute(position, 0)) {
        hasInvalidValues = true;
      }
    }

    // Validate particle system specific attributes
    const color = geometry.attributes.color;
    if (color) {
      if (this.validateBufferAttribute(color, 0.5)) {
        hasInvalidValues = true;
      }
    }

    const size = geometry.attributes.size;
    if (size) {
      if (this.validateBufferAttribute(size, 1.0)) {
        hasInvalidValues = true;
      }
    }

    // Recompute bounding sphere only if we had invalid values
    if (hasInvalidValues) {
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
      console.warn(
        "Invalid geometry values detected and sanitized in:",
        geometry.uuid
      );
    }

    // Verify bounding sphere is valid
    if (
      geometry.boundingSphere &&
      !this.isValidNumber(geometry.boundingSphere.radius)
    ) {
      // Force recompute with validated positions
      geometry.computeBoundingSphere();

      // If still invalid, set a default
      if (!this.isValidNumber(geometry.boundingSphere.radius)) {
        console.warn("Failed to compute valid bounding sphere, using default");
        geometry.boundingSphere.radius = 1.0;
        geometry.boundingSphere.center.set(0, 0, 0);
      }
    }
  }
}
