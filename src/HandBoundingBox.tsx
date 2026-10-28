import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import {
  normalizedToScreenPixels,
  ScreenShape,
  ScreenSpaceUI,
  XRModel,
} from "@vincentt-xr/sdk";
import {
  useXRModel,
  type XRModelNodeHandTracking,
} from "@vincentt-xr/sdk/low-level";

export type HandBoundingBoxProps = {
  hand?: "left" | "right" | "both";
  color?: string | "auto";
  padding?: number;
  opacity?: number;
  strokeWidth?: number;
  renderOrder?: number;
};

type HandBox = {
  key: string;
  handedness?: "left" | "right";
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const toNormalizedScreenPoint = (point: { x: number; y: number }) => ({
  x: Math.min(1, Math.max(0, (point.x + 1) / 2)),
  y: Math.min(1, Math.max(0, (1 - point.y) / 2)),
});

const readHandBoxes = (
  node: XRModelNodeHandTracking,
  requestedHand: HandBoundingBoxProps["hand"],
): HandBox[] => {
  let hands = node.hands ?? [];
  if (hands.length === 0 && node.coordinates) {
    hands = [{ coordinates: node.coordinates, handedness: node.handedness }];
  }

  return hands
    .map((hand, index): HandBox | null => {
      if (requestedHand !== "both" && requestedHand !== undefined) {
        if (hand.handedness !== requestedHand) return null;
      }

      const points = hand.coordinates
        ?.filter((point) => Number.isFinite(point.x) && Number.isFinite(point.y))
        .map(toNormalizedScreenPoint);
      if (!points?.length) return null;

      return {
        key: `${hand.handedness ?? "hand"}-${index}`,
        handedness: hand.handedness,
        minX: Math.min(...points.map((point) => point.x)),
        minY: Math.min(...points.map((point) => point.y)),
        maxX: Math.max(...points.map((point) => point.x)),
        maxY: Math.max(...points.map((point) => point.y)),
      };
    })
    .filter((box): box is HandBox => box !== null);
};

const boxesSignature = (boxes: HandBox[]) =>
  boxes
    .map((box) =>
      [box.key, box.minX, box.minY, box.maxX, box.maxY]
        .map((value) => (typeof value === "number" ? value.toFixed(4) : value))
        .join(":"),
    )
    .join("|");

const handColor = (handedness: HandBox["handedness"], color: string | "auto") => {
  if (color !== "auto") return color;
  if (handedness === "left") return "#22d3ee";
  if (handedness === "right") return "#f59e0b";
  return "#a78bfa";
};

export const HandBoundingBox = ({
  hand = "both",
  color = "auto",
  padding = 12,
  opacity = 0.95,
  strokeWidth = 4,
  renderOrder = 1110,
}: HandBoundingBoxProps) => {
  const { ready, node } = useXRModel<XRModelNodeHandTracking>(XRModel.HAND_TRACKER, {
    targetFps: 24,
  });
  const { size: viewportSize } = useThree();
  const [boxes, setBoxes] = useState<HandBox[]>([]);
  const signatureRef = useRef("");

  useEffect(() => {
    let timeoutId = 0;

    if (!ready || !node) {
      signatureRef.current = "";
      setBoxes([]);
      return undefined;
    }

    const tick = () => {
      const next = readHandBoxes(node, hand);
      const signature = boxesSignature(next);
      if (signature !== signatureRef.current) {
        signatureRef.current = signature;
        setBoxes(next);
      }
      timeoutId = window.setTimeout(tick, 1000 / 24);
    };

    tick();
    return () => window.clearTimeout(timeoutId);
  }, [hand, node, ready]);

  const transforms = useMemo(
    () =>
      boxes.map((box) => {
        const topLeft = normalizedToScreenPixels({
          point: { x: box.minX, y: box.minY },
          viewportSize,
        });
        const bottomRight = normalizedToScreenPixels({
          point: { x: box.maxX, y: box.maxY },
          viewportSize,
        });
        const left = Math.min(topLeft.x, bottomRight.x) - Math.max(0, padding);
        const right = Math.max(topLeft.x, bottomRight.x) + Math.max(0, padding);
        const bottom = Math.min(topLeft.y, bottomRight.y) - Math.max(0, padding);
        const top = Math.max(topLeft.y, bottomRight.y) + Math.max(0, padding);

        return {
          box,
          color: handColor(box.handedness, color),
          transform: {
            enabled: true,
            position: { x: (left + right) / 2, y: (bottom + top) / 2 },
            size: { width: Math.max(1, right - left), height: Math.max(1, top - bottom) },
            pivot: [0.5, 0.5] as [number, number],
            rotation: 0,
            scale2D: { x: 1, y: 1 },
            referencePixelsPerUnit: 32,
            renderOrder,
            overlay: true,
            visible: true,
            showTransformGuides: false,
          },
        };
      }),
    [boxes, color, padding, renderOrder, viewportSize],
  );

  if (transforms.length === 0) return null;

  return (
    <ScreenSpaceUI depth={0.01}>
      {transforms.map(({ box, color: boxColor, transform }) => (
        <Fragment key={box.key}>
          <ScreenShape
            name={`handBoundingBox-${box.key}`}
            transform={transform}
            settings={{
              kind: "rectangle",
              fillOpacity: 0,
              strokeColor: boxColor,
              strokeOpacity: opacity,
              strokeWidth,
            }}
          />
        </Fragment>
      ))}
    </ScreenSpaceUI>
  );
};
