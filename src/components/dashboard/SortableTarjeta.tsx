import React, { useRef } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableTarjetaProps {
  id: string;
  isEditing: boolean;
  onLongPress: () => void;
  children: React.ReactNode;
}

export function SortableTarjeta({ id, isEditing, onLongPress, children }: SortableTarjetaProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !isEditing });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    position: 'relative',
    touchAction: isEditing ? 'none' : 'auto',
    height: '100%',
  };

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const startPress = () => {
    if (isEditing) return;
    timerRef.current = setTimeout(() => {
      onLongPress();
    }, 1200); // 1200ms long press
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // We only bind pointer events for long press if we aren't editing yet.
  // When editing, dnd-kit's listeners take over dragging.
  const interactProps = isEditing ? {} : {
    onPointerDown: startPress,
    onPointerUp: cancelPress,
    onPointerLeave: cancelPress,
    onPointerCancel: cancelPress,
    onTouchStart: startPress,
    onTouchEnd: cancelPress,
    onTouchCancel: cancelPress,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isEditing ? listeners : {})}
      {...(isEditing ? attributes : {})}
      {...interactProps}
      className={isEditing && !isDragging ? 'animate-jiggle' : ''}
    >
      <div style={{ opacity: isDragging ? 0.5 : 1, pointerEvents: isEditing ? 'none' : 'auto', height: '100%' }}>
        {children}
      </div>
    </div>
  );
}
