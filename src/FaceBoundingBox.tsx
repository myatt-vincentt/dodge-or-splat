import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import {
  normalizedToScreenPixels,
  ScreenShape,
  ScreenSpaceUI,
  type ScreenTransform2DSettings,
} from "@vincentt-xr/sdk";
import { useFaceInfo } from "@vincentt-xr/sdk/tracking";

export type FaceBoundingBoxProps = {
  color?: string;
  padding?: number;
  opacity?: number;
  strokeWidth?: number;
  renderOrder?: number;
};

const createFaceTransform = (
  face: ReturnType<typeof useFaceInfo>,
  viewportSize: { width: number; height: number },
  padding: number,
  renderOrder: number,
): ScreenTransform2DSettings | null => {
  if (!face || viewportSize.width <= 0 || viewportSize.height <= 0) return null;

  const topLeft = normalizedToScreenPixels({
    point: { x: face.bounds.minX, y: face.bounds.minY },
    viewportSize,
  });
  const bottomRight = normalizedToScreenPixels({
    point: { x: face.bounds.maxX, y: face.bounds.maxY },
    viewportSize,
  });
  const left = Math.min(topLeft.x, bottomRight.x) - padding;
  const right = Math.max(topLeft.x, bottomRight.x) + padding;
  const bottom = Math.min(topLeft.y, bottomRight.y) - padding;
  const top = Math.max(topLeft.y, bottomRight.y) + padding;

  return {
    enabled: true,
    position: { x: (left + right) / 2, y: (bottom + top) / 2 },
    size: { width: Math.max(1, right - left), height: Math.max(1, top - bottom) },
    pivot: [0.5, 0.5],
    rotation: 0,
    scale2D: { x: 1, y: 1 },
    referencePixelsPerUnit: 32,
    renderOrder,
    overlay: true,
    visible: true,
    showTransformGuides: false,
  };
};

export const FaceBoundingBox = ({
  color = "#22d3ee",
  padding = 14,
  opacity = 0.95,
  strokeWidth = 4,
  renderOrder = 1120,
}: FaceBoundingBoxProps) => {
  const face = useFaceInfo({ targetFps: 24, holdMs: 180 });
  const { size: viewportSize } = useThree();
  const transform = useMemo(
    () => createFaceTransform(face, viewportSize, Math.max(0, padding), renderOrder),
    [face, padding, renderOrder, viewportSize],
  );

  if (!transform) return null;

  return (
    <ScreenSpaceUI depth={0.01}>
      <ScreenShape
        name="faceBoundingBox"
        transform={transform}
        settings={{
          kind: "rectangle",
          fillOpacity: 0,
          strokeColor: color,
          strokeOpacity: opacity,
          strokeWidth,
        }}
      />
    </ScreenSpaceUI>
  );
};
