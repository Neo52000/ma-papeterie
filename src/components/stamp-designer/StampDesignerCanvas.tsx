import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Stage, Layer, Rect, Text, Image as KonvaImage, Line, Circle, Path, Transformer } from 'react-konva';
import type Konva from 'konva';
import { useStampDesignerStore } from '@/stores/stampDesignerStore';
import { MM_TO_PX, INK_COLORS } from './constants';

interface StampDesignerCanvasProps {
  className?: string;
}

/**
 * Hook to load an HTMLImageElement from a data URL.
 */
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
const CORNER_RADIUS = 4;
const FONT_SCALE = MM_TO_PX * 0.8;

const StampDesignerCanvas = React.forwardRef<Konva.Stage, StampDesignerCanvasProps>(
  ({ className }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const transformerRef = useRef<Konva.Transformer>(null);

    const selectedModel = useStampDesignerStore((s) => s.selectedModel);
    const lines = useStampDesignerStore((s) => s.lines);
    const logo = useStampDesignerStore((s) => s.logo);
    const shapes = useStampDesignerStore((s) => s.shapes);
    const cliparts = useStampDesignerStore((s) => s.cliparts);
    const inkColor = useStampDesignerStore((s) => s.inkColor);
    const selectedElementId = useStampDesignerStore((s) => s.selectedElementId);
    const selectElement = useStampDesignerStore((s) => s.selectElement);
    const updateLogoPosition = useStampDesignerStore((s) => s.updateLogoPosition);
    const updateShape = useStampDesignerStore((s) => s.updateShape);
    const updateClipart = useStampDesignerStore((s) => s.updateClipart);

    const [containerWidth, setContainerWidth] = useState(400);

    const logoImage = useImage(logo?.dataUrl);

    // Canvas dimensions in px from the stamp model
    const stageWidth = selectedModel ? selectedModel.width_mm * MM_TO_PX : 240;
    const stageHeight = selectedModel ? selectedModel.height_mm * MM_TO_PX : 100;

    // Scale to fit inside the container while keeping aspect ratio
    const scale = Math.min(containerWidth / stageWidth, 1);
    const displayWidth = stageWidth * scale;
    const displayHeight = stageHeight * scale;

    // Observe container width for responsiveness
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

    // Attach transformer to the selected node
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
        // Clicking on empty space deselects
        if (e.target === e.target.getStage()) {
          selectElement(null);
        }
      },
      [selectElement],
    );

    const bgColor = INK_COLORS[inkColor] || INK_COLORS.noir;

    // Calculate vertical positions for text lines
    const totalLines = lines.length;
    const lineSpacing = totalLines > 0 ? stageHeight / (totalLines + 1) : stageHeight / 2;

    const buildFontStyle = (bold: boolean, italic: boolean): string => {
      if (bold && italic) return 'bold italic';
      if (bold) return 'bold';
      if (italic) return 'italic';
      return 'normal';
    };

    const getTextX = (alignment: 'left' | 'center' | 'right'): number => {
      switch (alignment) {
        case 'left':
          return PADDING;
        case 'center':
          return PADDING;
        case 'right':
          return PADDING;
      }
    };

    if (!selectedModel) return null;

    return (
      <div ref={containerRef} className={className}>
        <Stage
          ref={ref}
          width={displayWidth}
          height={displayHeight}
          scaleX={scale}
          scaleY={scale}
          onClick={handleStageClick}
          onTap={handleStageClick}
          style={{ margin: '0 auto', display: 'block' }}
        >
          <Layer>
            {/* Background */}
            <Rect
              x={0}
              y={0}
              width={stageWidth}
              height={stageHeight}
              fill={bgColor}
              cornerRadius={CORNER_RADIUS}
              listening={false}
            />

            {/* Text lines */}
            {lines.map((line, index) => {
              const y = lineSpacing * (index + 1) - (line.fontSize * FONT_SCALE) / 2;
              return (
                <Text
                  key={line.id}
                  id={line.id}
                  x={getTextX(line.alignment)}
                  y={y}
                  width={stageWidth - PADDING * 2}
                  text={line.text || ' '}
                  fontFamily={line.fontFamily}
                  fontSize={line.fontSize * FONT_SCALE}
                  fontStyle={buildFontStyle(line.bold, line.italic)}
                  fill="#ffffff"
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
                x={logo.x}
                y={logo.y}
                width={logo.width}
                height={logo.height}
                draggable
                onClick={() => selectElement('logo')}
                onTap={() => selectElement('logo')}
                onDragEnd={(e) => {
                  const node = e.target;
                  // Clamp within canvas bounds
                  const newX = Math.max(0, Math.min(node.x(), stageWidth - logo.width));
                  const newY = Math.max(0, Math.min(node.y(), stageHeight - logo.height));
                  node.position({ x: newX, y: newY });
                  updateLogoPosition({ x: newX, y: newY });
                }}
              />
            )}

            {/* Shapes */}
            {shapes.map((shape) => {
              const commonProps = {
                id: shape.id,
                key: shape.id,
                x: shape.x,
                y: shape.y,
                draggable: true,
                onClick: () => selectElement(shape.id),
                onTap: () => selectElement(shape.id),
                onDragEnd: (e: Konva.KonvaEventObject<DragEvent>) => {
                  const node = e.target;
                  updateShape(shape.id, { x: node.x(), y: node.y() });
                },
              };

              switch (shape.type) {
                case 'rect':
                  return (
                    <Rect
                      {...commonProps}
                      width={shape.width}
                      height={shape.height}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                      rotation={shape.rotation}
                    />
                  );
                case 'circle':
                  return (
                    <Circle
                      {...commonProps}
                      radius={Math.min(shape.width, shape.height) / 2}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  );
                case 'line':
                  return (
                    <Line
                      {...commonProps}
                      points={[0, 0, shape.width, 0]}
                      stroke="#ffffff"
                      strokeWidth={1.5}
                    />
                  );
                case 'frame':
                  return (
                    <Rect
                      {...commonProps}
                      width={shape.width}
                      height={shape.height}
                      stroke="#ffffff"
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
              // SVG paths are typically in a 24x24 viewBox; scale to fit clipart dimensions
              const scaleX = clipart.width / 24;
              const scaleY = clipart.height / 24;
              return (
                <Path
                  key={clipart.id}
                  id={clipart.id}
                  x={clipart.x}
                  y={clipart.y}
                  data={clipart.svgPath}
                  fill="#ffffff"
                  scaleX={scaleX}
                  scaleY={scaleY}
                  draggable
                  onClick={() => selectElement(clipart.id)}
                  onTap={() => selectElement(clipart.id)}
                  onDragEnd={(e) => {
                    const node = e.target;
                    updateClipart(clipart.id, { x: node.x(), y: node.y() });
                  }}
                />
              );
            })}

            {/* Selection transformer */}
            <Transformer
              ref={transformerRef}
              borderStroke="#38bdf8"
              borderStrokeWidth={1.5}
              anchorStroke="#38bdf8"
              anchorFill="#ffffff"
              anchorSize={7}
              rotateEnabled={false}
              boundBoxFunc={(_oldBox, newBox) => {
                // Prevent resizing to zero or negative
                if (newBox.width < 5 || newBox.height < 5) return _oldBox;
                return newBox;
              }}
            />
          </Layer>
        </Stage>
      </div>
    );
  },
);

StampDesignerCanvas.displayName = 'StampDesignerCanvas';

export default StampDesignerCanvas;
