import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Stage, Layer, Text, Image as KonvaImage, Transformer, Rect } from 'react-konva';
import { CanvasObject, CanvasSettings } from '../types';
import Konva from 'konva';

interface CanvasAreaProps {
  settings: CanvasSettings;
  objects: CanvasObject[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onChangeObject: (obj: CanvasObject) => void;
  scale: number;
}

interface CanvasImageObjectProps {
    obj: CanvasObject;
    onSelect: () => void;
    onChangeObject: (o: CanvasObject) => void;
}

// Subcomponent to handle loading standard image objects for Konva
const CanvasImageObject: React.FC<CanvasImageObjectProps> = ({ obj, onSelect, onChangeObject }) => {
    const [image, setImage] = useState<HTMLImageElement | null>(null);

    useEffect(() => {
        if (obj.src) {
            const img = new window.Image();
            img.src = obj.src;
            img.onload = () => setImage(img);
        }
    }, [obj.src]);

    return (
        <KonvaImage
            id={obj.id}
            x={obj.x}
            y={obj.y}
            width={obj.width}
            height={obj.height}
            image={image || undefined}
            draggable
            onClick={onSelect}
            onTap={onSelect}
            onDragEnd={(e) => {
                onChangeObject({
                    ...obj,
                    x: e.target.x(),
                    y: e.target.y(),
                });
            }}
            onTransformEnd={(e) => {
                const node = e.target;
                const scaleX = node.scaleX();
                const scaleY = node.scaleY();

                node.scaleX(1);
                node.scaleY(1);

                onChangeObject({
                    ...obj,
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(5, node.width() * scaleX),
                    height: Math.max(5, node.height() * scaleY)
                });
            }}
        />
    );
};

const CanvasArea: React.FC<CanvasAreaProps> = ({
  settings,
  objects,
  selectedId,
  onSelect,
  onChangeObject,
  scale
}) => {
  const stageRef = useRef<Konva.Stage>(null);
  const trRef = useRef<Konva.Transformer>(null);

  // Sort objects so images are always rendered first (at the bottom)
  // Logic: Images = -1 (first/bottom), Text = 1 (last/top)
  const sortedObjects = useMemo(() => {
    return [...objects].sort((a, b) => {
        if (a.type === 'image' && b.type !== 'image') return -1;
        if (a.type !== 'image' && b.type === 'image') return 1;
        return 0; // Maintain existing order for same types
    });
  }, [objects]);

  useEffect(() => {
    if (selectedId && trRef.current && stageRef.current) {
      // Find the selected node
      const selectedNode = stageRef.current.findOne('#' + selectedId);
      if (selectedNode) {
        trRef.current.nodes([selectedNode]);
        
        // Custom Transformer Config
        const isImage = objects.find(o => o.id === selectedId)?.type === 'image';
        
        if (isImage) {
            trRef.current.keepRatio(false); // Allow distort/stretch for images
            trRef.current.enabledAnchors(['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']);
        } else {
            trRef.current.keepRatio(true); // Keep ratio for text
            trRef.current.enabledAnchors(['top-left', 'top-right', 'bottom-left', 'bottom-right']);
        }

        trRef.current.getLayer()?.batchDraw();
      }
    } else if (trRef.current) {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, objects]);

  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    // deselect when clicked on empty area
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      onSelect(null);
    }
  };

  return (
    <div className="relative shadow-2xl overflow-hidden bg-white mx-auto" style={{ 
        width: settings.width * scale, 
        height: settings.height * scale,
        transformOrigin: 'top left'
      }}>
      <Stage
        width={settings.width * scale}
        height={settings.height * scale}
        scaleX={scale}
        scaleY={scale}
        onMouseDown={checkDeselect}
        onTouchStart={checkDeselect}
        ref={stageRef}
      >
        <Layer>
          {/* Background indicating paper */}
          <Rect
            width={settings.width}
            height={settings.height}
            fill="white"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          
          {sortedObjects.map((obj) => {
             if (obj.type === 'image') {
                 return <CanvasImageObject key={obj.id} obj={obj} onSelect={() => onSelect(obj.id)} onChangeObject={onChangeObject} />
             }

             return (
                <Text
                key={obj.id}
                id={obj.id}
                x={obj.x}
                y={obj.y}
                text={obj.text}
                fontSize={obj.fontSize}
                fontFamily={obj.fontFamily}
                width={obj.width}
                align={obj.align || 'left'}
                // Konva specific props for interactivity
                draggable
                onClick={() => onSelect(obj.id)}
                onTap={() => onSelect(obj.id)}
                onDragEnd={(e) => {
                    onChangeObject({
                    ...obj,
                    x: e.target.x(),
                    y: e.target.y(),
                    });
                }}
                onTransformEnd={(e) => {
                    const node = e.target;
                    const scaleX = node.scaleX();
                    
                    // reset scale to 1 and adjust font size or width instead
                    node.scaleX(1);
                    node.scaleY(1);

                    onChangeObject({
                    ...obj,
                    x: node.x(),
                    y: node.y(),
                    width: Math.max(5, node.width() * scaleX),
                    // For text, adjust font size
                    fontSize: (obj.fontSize || 16) * scaleX
                    });
                }}
                />
            );
          })}

          <Transformer
            ref={trRef}
            boundBoxFunc={(oldBox, newBox) => {
              // limit resize
              if (newBox.width < 5 || newBox.height < 5) {
                return oldBox;
              }
              return newBox;
            }}
          />
        </Layer>
      </Stage>
    </div>
  );
};

export default CanvasArea;