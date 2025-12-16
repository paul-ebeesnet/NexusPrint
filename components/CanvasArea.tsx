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
            opacity={obj.opacity ?? 1}
            draggable
            onClick={onSelect}
            onTap={onSelect}
            onMouseEnter={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'move';
            }}
            onMouseLeave={(e) => {
                const stage = e.target.getStage();
                if (stage) stage.container().style.cursor = 'default';
            }}
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
  
  // State for Inline Text Editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

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
            // Text Optimization:
            // Side anchors (middle-left/right) will change WIDTH (reflow).
            // Corner anchors will change FONT SIZE (scale).
            trRef.current.keepRatio(false); 
            trRef.current.enabledAnchors(['top-left', 'top-right', 'bottom-left', 'bottom-right', 'middle-left', 'middle-right']);
        }

        trRef.current.getLayer()?.batchDraw();
      }
    } else if (trRef.current) {
      trRef.current.nodes([]);
      trRef.current.getLayer()?.batchDraw();
    }
  }, [selectedId, objects]);

  // Handle outside click to deselect or finish editing
  const checkDeselect = (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      onSelect(null);
      setEditingId(null); // Close text editor if open
    }
  };

  // Setup Text Area for Inline Editing when editingId is set
  useEffect(() => {
      if (editingId && textAreaRef.current) {
          textAreaRef.current.focus();
          // Move cursor to end
          textAreaRef.current.setSelectionRange(textAreaRef.current.value.length, textAreaRef.current.value.length);
      }
  }, [editingId]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>, obj: CanvasObject) => {
      onChangeObject({
          ...obj,
          text: e.target.value,
          rawValue: e.target.value // Update raw value for static text syncing
      });
  };

  const handleTextBlur = () => {
      setEditingId(null);
  };

  const editingObject = objects.find(o => o.id === editingId);

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

             // Hide the Konva Text object if it's currently being edited (to show textarea instead)
             const isEditing = editingId === obj.id;

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
                visible={!isEditing} // Hide when editing
                // Performance optimization
                perfectDrawEnabled={false}
                // Interactivity
                draggable={!isEditing}
                onClick={() => onSelect(obj.id)}
                onTap={() => onSelect(obj.id)}
                onDblClick={() => {
                    onSelect(obj.id);
                    setEditingId(obj.id);
                }}
                onMouseEnter={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'text';
                }}
                onMouseLeave={(e) => {
                    const stage = e.target.getStage();
                    if (stage) stage.container().style.cursor = 'default';
                }}
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
                    
                    // Reset node scales immediately
                    node.scaleX(1);
                    node.scaleY(1);

                    const anchor = trRef.current?.getActiveAnchor();
                    
                    // If side anchor (middle-left/right), only change width (Text Reflow)
                    if (anchor === 'middle-left' || anchor === 'middle-right') {
                         onChangeObject({
                             ...obj,
                             x: node.x(),
                             y: node.y(),
                             width: Math.max(5, node.width() * scaleX)
                         });
                    } else {
                         // Corner anchor: Scale Font Size + Width
                         const scale = Math.max(scaleX, scaleY);
                         onChangeObject({
                             ...obj,
                             x: node.x(),
                             y: node.y(),
                             width: node.width() * scale,
                             fontSize: (obj.fontSize || 16) * scale
                         });
                    }
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

      {/* HTML Overlay for Text Editing */}
      {editingObject && editingId && (
          <textarea
            ref={textAreaRef}
            value={editingObject.text}
            onChange={(e) => handleTextChange(e, editingObject)}
            onBlur={handleTextBlur}
            style={{
                position: 'absolute',
                top: editingObject.y * scale,
                left: editingObject.x * scale,
                width: editingObject.width * scale,
                height: (editingObject.fontSize || 16) * scale * 1.5 * (editingObject.text?.split('\n').length || 1) + 20, // Approximate height
                fontSize: `${(editingObject.fontSize || 16) * scale}px`,
                fontFamily: editingObject.fontFamily,
                textAlign: editingObject.align || 'left',
                lineHeight: 1.2,
                color: 'black',
                background: 'transparent', // Transparent background to look like canvas
                border: '1px dashed #6366f1', // Dashed border to indicate editing
                padding: '0px',
                margin: '0px',
                overflow: 'hidden',
                resize: 'none',
                outline: 'none',
                zIndex: 100, // Above canvas
                minHeight: '40px'
            }}
          />
      )}
    </div>
  );
};

export default CanvasArea;