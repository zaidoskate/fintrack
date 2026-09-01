import { motion } from 'framer-motion';

interface LoaderProps {
  label?: string;
  fullHeight?: boolean;
}

export function Loader({ label = 'Cargando...', fullHeight = false }: LoaderProps) {
  return (
    <div style={{
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      justifyContent: 'center',
      minHeight: fullHeight ? '200px' : 'auto', 
      padding: '32px', 
      gap: '16px',
      width: '100%'
    }}>
      <div style={{ position: 'relative', width: '40px', height: '40px' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 1.2 }}
          style={{
            position: 'absolute',
            inset: 0,
            border: '3px solid rgba(250, 104, 111, 0.2)', // var(--brand) translúcido
            borderTopColor: 'var(--brand)',
            borderRadius: '50%',
          }}
        />
        <motion.div
          animate={{ rotate: -360 }}
          transition={{ repeat: Infinity, ease: 'linear', duration: 1.8 }}
          style={{
            position: 'absolute',
            inset: '6px',
            border: '2px solid rgba(255, 255, 255, 0.1)',
            borderBottomColor: '#fff',
            borderRadius: '50%',
          }}
        />
      </div>
      {label && (
        <motion.div
          initial={{ opacity: 0.5 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, repeatType: 'reverse', duration: 1 }}
          style={{ 
            color: 'var(--text-muted)', 
            fontSize: '12px', 
            fontWeight: 500, 
            letterSpacing: '0.05em',
            textTransform: 'uppercase'
          }}
        >
          {label}
        </motion.div>
      )}
    </div>
  );
}
