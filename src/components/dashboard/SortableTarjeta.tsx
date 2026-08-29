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

  const startPress = (e: React.PointerEvent) => {
    if (isEditing) return;
    // Evitar multi-touch o disparos repetidos
    if (timerRef.current) return; 
    
    // Si no es el click primario (ej. click derecho), ignorar
    if (e.button && e.button !== 0) return;

    timerRef.current = setTimeout(() => {
      onLongPress();
      timerRef.current = null;
    }, 1200);
  };

  const cancelPress = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => cancelPress();
  }, []);

  // Solo usamos Pointer Events para que soporte Touch/Mouse/Pen sin duplicar
  const interactProps = isEditing ? {} : {
    onPointerDown: startPress,
    onPointerUp: cancelPress,
    onPointerLeave: cancelPress,
    onPointerCancel: cancelPress,
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
