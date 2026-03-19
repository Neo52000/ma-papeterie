import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Line, Circle, Path, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useStampDesignerStore } from '@/stores/stampDesignerStore';
import { MM_TO_PX, INK_COLORS, DIMENSION_MARGIN } from './constants';

interface StampDesignerCanvasProps {
  className?: string;
}

/** Hook to load an HTMLImageElement from a data URL. */
function useImage(dataUrl: string | null | undefined): HTMLImageElement | null {
  const [image, setImage] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    if (!dataUrl) {
      setImage(null);
      return;
    }
    const img = new window.Image();
    img.onload = () => setImage(img);
    img.onerror = () => setImage(null);
    img.src = dataUrl;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [dataUrl]);

  return image;
}

const PADDING = 8;
const FONT_SCALE = MM_TO_PX * 0.8;
const DIM_COLOR = '#9ca3af';
const DIM_FONT_SIZE = 11;
const CORNER_SIZE = 8;

const StampDesignerCanvas = React.forwardRef<Konva.Stage, StampDesignerCanvasProps>(
  ({ className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const transformerRef = useRef<Konva.Transformer>(null);
    const annotationLayerRef = useRef<Konva.Layer>(null);

    const selectedModel = useStampDesignerStore((s) => s.selectedModel);
    const lines = useStampDesignerStore((s) => s.lines);
    const logo = useStampDesignerStore((s) => s.logo);
    const shapes = useStampDesignerStore((s) => s.shapes);
    const cliparts = useStampDesignerStore((s) => s.cliparts);
    const inkColor = useStampDesignerStore((s) => s.inkColor);
    const zoom = useStampDesignerStore((s) => s.zoom);
    const selectedElementId = useStampDesignerStore((s) => s.selectedElementId);
    const selectElement = useStampDesignerStore((s) => s.selectElement);
    const updateLogoPosition = useStampDesignerStore((s) => s.updateLogoPosition);
    const updateShape = useStampDesignerStore((s) => s.updateShape);
    const updateClipart = useStampDesignerStore((s) => s.updateClipart);

    const [containerWidth, setContainerWidth] = useState(500);

    const logoImage = useImage(logo?.dataUrl);

    // Stamp dimensions in px
    const stampWidth = selectedModel ? selectedModel.width_mm * MM_TO_PX : 240;
    const stampHeight = selectedModel ? selectedModel.height_mm * MM_TO_PX : 100;

    // Full stage includes dimension margins
    const M = DIMENSION_MARGIN;
    const stageWidth = stampWidth + 2 * M;
    const stageHeight = stampHeight + 2 * M;

    // Scale to fit container, then apply zoom
    const baseScale = Math.min(containerWidth / stageWidth, 1);
    const effectiveScale = baseScale * zoom;
    const displayWidth = stageWidth * effectiveScale;
    const displayHeight = stageHeight * effectiveScale;

    // Observe container width
    useEffect(() => {
      const el = containerRef.current;
      if (!el) return;
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });
      observer.observe(el);
      setContainerWidth(el.clientWidth);
      return () => observer.disconnect();
    }, []);

    // Attach transformer to selected node
    useEffect(() => {
      const transformer = transformerRef.current;
      if (!transformer) return;

      if (!selectedElementId) {
        transformer.nodes([]);
        transformer.getLayer()?.batchDraw();
        return;
      }

      const stage = transformer.getStage();
      if (!stage) return;

      const node = stage.findOne(`#${CSS.escape(selectedElementId)}`);
      if (node) {
        transformer.nodes([node]);
      } else {
        transformer.nodes([]);
      }
      transformer.getLayer()?.batchDraw();
    }, [selectedElementId]);

    const handleStageClick = useCallback(
      (e: Konva.KonvaEventObject<MouseEvent>) => {
        if (e.target === e.target.getStage()) {
          selectElement(null);
        }
      },
      [selectElement],
    );

    const inkHex = INK_COLORS[inkColor] || INK_COLORS.noir;

    // Text line vertical positioning
    const totalLines = lines.length;
    const lineSpacing = totalLines > 0 ? stampHeight / (totalLines + 1) : stampHeight / 2;

    const buildFontStyle = (bold: boolean, italic: boolean): string => {
      if (bold && italic) return 'bold italic';
      if (bold) return 'bold';
      if (italic) return 'italic';
      return 'normal';
    };

    if (!selectedModel) return null;

    return (
      <div ref={containerRef} className={className}>
        <Stage
          ref={ref}
          width={displayWidth}
          height={displayHeight}
          scaleX={effectiveScale}
          scaleY={effectiveScale}
          onClick={handleStageClick}
          onTap={handleStageClick}
          style={{ margin: '0 auto', display: 'block' }}
        >
          {/* Main content layer */}
          <Layer>
            {/* White stamp background with dashed border */}
            <Rect
              x={M}
              y={M}
              width={stampWidth}
              height={stampHeight}
              fill="#ffffff"
              stroke="#d1d5db"
              strokeWidth={1}
              dash={[4, 4]}
              listening={false}
            />

            {/* Text lines — colored text on white background */}
            {lines.map((line, index) => {
              const y = M + lineSpacing * (index + 1) - (line.fontSize * FONT_SCALE) / 2;
              return (
                <Text
                  key={line.id}
                  id={line.id}
                  x={M + PADDING}
                  y={y}
                  width={stampWidth - PADDING * 2}
                  text={line.text || ' '}
                  fontFamily={line.fontFamily}
                  fontSize={line.fontSize * FONT_SCALE}
                  fontStyle={buildFontStyle(line.bold, line.italic)}
                  fill={inkHex}
                  align={line.alignment}
                  listening={true}
                  onClick={() => selectElement(line.id)}
                  onTap={() => selectElement(line.id)}
                />
              );
            })}

            {/* Logo */}
            {logo && logoImage && (
              <KonvaImage
                id="logo"
                image={logoImage}
                x={M + logo.x}
                y={M + logo.y}
                width={logo.width}
                height={logo.height}
                draggable
                onClick={() => selectElement('logo')}
                onTap={() => selectElement('logo')}
                onDragEnd={(e) => {
                  const node = e.target;
                  const newX = Math.max(0, Math.min(node.x() - M, stampWidth - logo.width));
                  const newY = Math.max(0, Math.min(node.y() - M, stampHeight - logo.height));
                  node.position({ x: M + newX, y: M + newY });
                  updateLogoPosition({ x: newX, y: newY });
                }}
              />
            )}

            {/* Shapes */}
            {shapes.map((shape) => {
              const commonProps = {
                id: shape.id,
                key: shape.id,
                x: M + shape.x,
                y: M + shape.y,
                draggable: true,
                onClick: () => selectElement(shape.id),
                onTap: () => selectElement(shape.id),
                onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                  const node = e.target;
                  const newX = Math.max(0, Math.min(node.x() - M, stampWidth - shape.width));
                  const newY = Math.max(0, Math.min(node.y() - M, stampHeight - shape.height));
                  node.position({ x: M + newX, y: M + newY });
                  updateShape(shape.id, { x: newX, y: newY });
                },
              };

              switch (shape.type) {
                case 'rect':
                  return (
                    <Rect
                      {...commonProps}
                      width={shape.width}
                      height={shape.height}
                      stroke={inkHex}
                      strokeWidth={1.5}
                      rotation={shape.rotation}
                    />
                  );
                case 'circle':
                  return (
                    <Circle
                      {...commonProps}
                      radius={Math.min(shape.width, shape.height) / 2}
                      stroke={inkHex}
                      strokeWidth={1.5}
                    />
                  );
                case 'line':
                  return (
                    <Line
                      {...commonProps}
                      points={[0, 0, shape.width, 0]}
                      stroke={inkHex}
                      strokeWidth={1.5}
                    />
                  );
                case 'frame':
                  return (
                    <Rect
                      {...commonProps}
                      width={shape.width}
                      height={shape.height}
                      stroke={inkHex}
                      strokeWidth={3}
                      rotation={shape.rotation}
                    />
                  );
                default:
                  return null;
              }
            })}

            {/* Cliparts */}
            {cliparts.map((clipart) => {
              const scaleX = clipart.width / 24;
              const scaleY = clipart.height / 24;
              return (
                <Path
                  key={clipart.id}
                  id={clipart.id}
                  x={M + clipart.x}
                  y={M + clipart.y}
                  data={clipart.svgPath}
                  fill={inkHex}
                  scaleX={scaleX}
                  scaleY={scaleY}
                  draggable
                  onClick={() => selectElement(clipart.id)}
                  onTap={() => selectElement(clipart.id)}
                  onDragEnd={(e) => {
                    const node = e.target;
                    const newX = Math.max(0, node.x() - M);
                    const newY = Math.max(0, node.y() - M);
                    node.position({ x: M + newX, y: M + newY });
                    updateClipart(clipart.id, { x: newX, y: newY });
                  }}
                />
              );
            })}

            {/* Selection transformer */}
            <Transformer
              ref={transformerRef}
              borderStroke="#2563eb"
              borderStrokeWidth={1.5}
              anchorStroke="#2563eb"
              anchorFill="#ffffff"
              anchorSize={7}
              rotateEnabled={false}
              boundBoxFunc={(_oldBox, newBox) => {
                if (newBox.width < 5 || newBox.height < 5) return _oldBox;
                return newBox;
              }}
            />
          </Layer>

          {/* Annotations layer — dimension labels, corner marks (excluded from export) */}
          <Layer ref={annotationLayerRef} listening={false}>
            {/* Corner marks */}
            <Line points={[M - CORNER_SIZE, M, M, M, M, M - CORNER_SIZE]} stroke={DIM_COLOR} strokeWidth={1} />
            <Line points={[M + stampWidth + CORNER_SIZE, M, M + stampWidth, M, M + stampWidth, M - CORNER_SIZE]} stroke={DIM_COLOR} strokeWidth={1} />
            <Line points={[M - CORNER_SIZE, M + stampHeight, M, M + stampHeight, M, M + stampHeight + CORNER_SIZE]} stroke={DIM_COLOR} strokeWidth={1} />
            <Line points={[M + stampWidth + CORNER_SIZE, M + stampHeight, M + stampWidth, M + stampHeight, M + stampWidth, M + stampHeight + CORNER_SIZE]} stroke={DIM_COLOR} strokeWidth={1} />

            {/* Horizontal dimension (below stamp) */}
            <Line
              points={[M, M + stampHeight + 14, M + stampWidth, M + stampHeight + 14]}
              stroke={DIM_COLOR}
              strokeWidth={0.8}
            />
            <Line points={[M, M + stampHeight + 10, M, M + stampHeight + 18]} stroke={DIM_COLOR} strokeWidth={0.8} />
            <Line points={[M + stampWidth, M + stampHeight + 10, M + stampWidth, M + stampHeight + 18]} stroke={DIM_COLOR} strokeWidth={0.8} />
            <Text
              x={M}
              y={M + stampHeight + 18}
              width={stampWidth}
              text={`${selectedModel.width_mm} mm`}
              fontSize={DIM_FONT_SIZE}
              fill={DIM_COLOR}
              align="center"
              fontFamily="Arial"
            />

            {/* Vertical dimension (right of stamp) */}
            <Line
              points={[M + stampWidth + 14, M, M + stampWidth + 14, M + stampHeight]}
              stroke={DIM_COLOR}
              strokeWidth={0.8}
            />
            <Line points={[M + stampWidth + 10, M, M + stampWidth + 18, M]} stroke={DIM_COLOR} strokeWidth={0.8} />
            <Line points={[M + stampWidth + 10, M + stampHeight, M + stampWidth + 18, M + stampHeight]} stroke={DIM_COLOR} strokeWidth={0.8} />
            <Text
              x={M + stampWidth + 20}
              y={M + stampHeight / 2 - DIM_FONT_SIZE / 2}
              text={`${selectedModel.height_mm} mm`}
              fontSize={DIM_FONT_SIZE}
              fill={DIM_COLOR}
              fontFamily="Arial"
            />
          </Layer>
        </Stage>
      </div>
    );
  },
);

StampDesignerCanvas.displayName = 'StampDesignerCanvas';

export default StampDesignerCanvas;
