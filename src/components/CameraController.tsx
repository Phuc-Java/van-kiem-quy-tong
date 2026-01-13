import { useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { useHandStore } from "../store";

declare global {
  interface Window {
    swordPositions?: THREE.Vector3[];
  }
}

export function CameraController() {
  const { camera, size } = useThree(); // Lấy size để check tỷ lệ màn hình

  // Tăng tốc độ camera lên một chút (0.02 -> 0.05) để bám theo tay nhanh hơn trên màn hình nhỏ
  const SMOOTH_SPEED = 0.05;

  // Trạng thái
  const smoothTarget = useRef(new THREE.Vector3(0, 0, 0));
  const smoothCamPos = useRef(new THREE.Vector3(0, 5, 45)); // Mặc định lùi xa hơn (35 -> 45)
  const smoothLookAt = useRef(new THREE.Vector3(0, 0, 0));
  const smoothZoom = useRef(40);

  useFrame(({ clock }) => {
    const isTracking = useHandStore.getState().isTracking;
    const time = clock.getElapsedTime();
    const positions = window.swordPositions;
    const gestureMode = useHandStore.getState().gestureMode;

    // === 1. Tính toán tâm kiếm trận ===
    let formationSize = 10;
    const formationCenter = new THREE.Vector3(0, 0, 0);

    if (positions && positions.length > 0) {
      let minX = Infinity,
        maxX = -Infinity;
      let minY = Infinity,
        maxY = -Infinity;
      let sumX = 0,
        sumY = 0,
        sumZ = 0;

      for (const pos of positions) {
        minX = Math.min(minX, pos.x);
        maxX = Math.max(maxX, pos.x);
        minY = Math.min(minY, pos.y);
        maxY = Math.max(maxY, pos.y);
        sumX += pos.x;
        sumY += pos.y;
        sumZ += pos.z;
      }

      formationCenter.set(
        sumX / positions.length,
        sumY / positions.length,
        sumZ / positions.length
      );

      const spanX = maxX - minX;
      const spanY = maxY - minY;
      formationSize = Math.max(spanX, spanY);
    }

    // === 2. Tính toán Zoom (TỐI ƯU CHO PC 1920x1080) ===

    // Tăng khoảng cách đệm (padding) từ 18 lên 25
    let baseDistance = formationSize * 1.2 + 25;

    // Nếu màn hình ngang (PC), nhân thêm hệ số để lùi xa hơn nữa
    if (size.width > size.height) {
      baseDistance *= 1.1;
    }

    const targetZoom = THREE.MathUtils.clamp(
      baseDistance,
      35, // Min zoom xa hơn (22 -> 35) để không bao giờ bị quá gần mặt
      gestureMode === "DAGENG" ? 90 : 80 // Max zoom xa hơn để bao quát Đại Canh Kiếm
    );

    smoothZoom.current = THREE.MathUtils.lerp(
      smoothZoom.current,
      targetZoom,
      SMOOTH_SPEED
    );

    // === 3. Tính toán điểm nhìn ===
    let followPoint: THREE.Vector3;
    if (isTracking) {
      followPoint = formationCenter.clone();
    } else {
      followPoint = new THREE.Vector3(
        Math.sin(time * 0.5) * 6,
        Math.cos(time * 0.4) * 4,
        0
      );
    }
    smoothTarget.current.lerp(followPoint, SMOOTH_SPEED);

    // === 4. Cập nhật vị trí Camera ===
    const desiredCamPos = new THREE.Vector3(
      smoothTarget.current.x * 0.3,
      smoothTarget.current.y * 0.2 + 5, // Camera cao hơn (y+5) để nhìn xuống rõ hơn
      smoothZoom.current
    );
    smoothCamPos.current.lerp(desiredCamPos, SMOOTH_SPEED);
    camera.position.copy(smoothCamPos.current);

    // === 5. LookAt ===
    const desiredLookAt = new THREE.Vector3(
      smoothTarget.current.x * 0.4,
      smoothTarget.current.y * 0.25,
      2 // Nhìn sâu vào trong một chút
    );
    smoothLookAt.current.lerp(desiredLookAt, SMOOTH_SPEED);
    camera.lookAt(smoothLookAt.current);
  });

  return null;
}
