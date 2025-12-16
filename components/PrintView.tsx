import React from 'react';
import { CanvasObject, CanvasSettings } from '../types';

interface PrintViewProps {
  objects: CanvasObject[];
  settings: CanvasSettings;
}

const PrintView: React.FC<PrintViewProps> = ({ objects, settings }) => {
  // Sort for print view as well to ensure background images are behind text
  const sortedObjects = [...objects].sort((a, b) => {
    if (a.type === 'image' && b.type !== 'image') return -1;
    if (a.type !== 'image' && b.type === 'image') return 1;
    return 0; 
  });

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <div
        style={{
          position: 'relative',
          width: `${settings.width}px`,
          height: `${settings.height}px`,
          overflow: 'hidden', 
        }}
      >
        {sortedObjects.map((obj) => {
          if (obj.type === 'image' && obj.src) {
              return (
                  <img 
                    key={obj.id}
                    src={obj.src}
                    style={{
                        position: 'absolute',
                        left: `${obj.x}px`,
                        top: `${obj.y}px`,
                        width: `${obj.width}px`,
                        height: `${obj.height}px`,
                    }}
                    alt=""
                  />
              )
          }

          return (
            <div
                key={obj.id}
                style={{
                position: 'absolute',
                left: `${obj.x}px`,
                top: `${obj.y}px`,
                width: `${obj.width}px`, // Ensure width constrains text flow
                fontSize: `${obj.fontSize}px`,
                fontFamily: obj.fontFamily,
                textAlign: obj.align,
                lineHeight: 1.2,
                whiteSpace: 'pre-wrap', // Preserve formatting
                wordBreak: 'break-word',
                }}
            >
                {obj.text}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PrintView;