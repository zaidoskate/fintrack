'use client';

import { useState } from 'react';
import { motion } from 'motion/react';
import { X, User as UserIcon, Lock, Mail } from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { updateUserProfile, updateUserPassword } from '@/app/auth/actions';
import type { User } from '@supabase/supabase-js';

interface ProfileModalProps {
  user: User;
  onClose: () => void;
  modo: string;
  setModo: (modo: 'diario' | 'patrimonio') => void;
}

export function ProfileModal({ user, onClose, modo, setModo }: ProfileModalProps) {
  const isGoogle = user.app_metadata?.providers?.includes('google') || user.app_metadata?.provider === 'google';
  
  const [name, setName] = useState(user.user_metadata?.full_name || '');
  const [password, setPassword] = useState('');
  
  const [editingName, setEditingName] = useState(false);
  const [editingPass, setEditingPass] = useState(false);
  
  const [loadingName, setLoadingName] = useState(false);
  const [loadingPass, setLoadingPass] = useState(false);
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const lastChange = user.user_metadata?.last_password_change;
  const daysSince = lastChange ? Math.floor((new Date().getTime() - new Date(lastChange).getTime()) / (1000 * 60 * 60 * 24)) : 999;
  const canChangePass = !isGoogle && daysSince >= 30;

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setLoadingName(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const formData = new FormData();
      formData.append('name', name);
      await updateUserProfile(formData);
      setSuccessMsg('Nombre actualizado');
      setEditingName(false);
    } catch (err: Error | unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar nombre');
    } finally {
      setLoadingName(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres');
      return;
    }
    setLoadingPass(true);
    setErrorMsg('');
    setSuccessMsg('');
    try {
      const formData = new FormData();
      formData.append('password', password);
      await updateUserPassword(formData);
      setSuccessMsg('Contraseña actualizada correctamente');
      setEditingPass(false);
      setPassword('');
    } catch (err: Error | unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error al actualizar contraseña');
    } finally {
      setLoadingPass(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      />
      
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        style={{ width: '100%', maxWidth: '400px', position: 'relative' }}
      >
        <GlassCard style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Perfil</h2>
            <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {errorMsg && (
            <div style={{ background: 'rgba(239,68,68,0.1)', color: 'var(--credito-rojo)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              {errorMsg}
            </div>
          )}
          {successMsg && (
            <div style={{ background: 'rgba(74,222,128,0.1)', color: 'var(--credito-verde)', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontSize: '13px' }}>
              {successMsg}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Email (Readonly) */}
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Mail size={14} /> Correo Electrónico
              </div>
              <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '15px' }}>
                {user.email}
              </div>
            </div>

            {/* Nombre */}
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><User size={14} /> Nombre</span>
                {!editingName && (
                  <button onClick={() => setEditingName(true)} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: '13px', cursor: 'pointer' }}>Editar</button>
                )}
              </div>
              
              {editingName ? (
                <form onSubmit={handleUpdateName} style={{ display: 'flex', gap: '8px' }}>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={{ flex: 1, background: 'rgba(0,0,0,0.3)', border: '1px solid var(--brand)', padding: '10px 12px', borderRadius: '8px', color: '#fff', fontSize: '15px' }}
                    autoFocus
                  />
                  <button type="submit" disabled={loadingName} style={{ background: 'var(--brand)', color: '#000', border: 'none', borderRadius: '8px', padding: '0 16px', fontWeight: 600 }}>
                    {loadingName ? '...' : 'Guardar'}
                  </button>
                </form>
              ) : (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '15px' }}>
                  {user.user_metadata?.full_name || 'Sin nombre'}
                </div>
              )}
            </div>

            {/* Contraseña */}
            <div>
              <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Lock size={14} /> Contraseña</span>
                {!editingPass && canChangePass && (
                  <button onClick={() => setEditingPass(true)} style={{ background: 'none', border: 'none', color: 'var(--brand)', fontSize: '13px', cursor: 'pointer' }}>Editar</button>
                )}
              </div>
              
              {isGoogle ? (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Registrado con Google (no editable)
                </div>
              ) : !canChangePass && !editingPass ? (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', color: 'var(--text-secondary)', fontSize: '14px' }}>
                  Actualizada hace {daysSince} días. <br/><span style={{fontSize:'12px', opacity:0.7}}>Solo 1 vez cada 30 días.</span>
                </div>
              ) : editingPass ? (
                <form onSubmit={handleUpdatePassword} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input
                    type="password"
                    placeholder="Nueva contraseña"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--brand)', padding: '10px 12px', borderRadius: '8px', color: '#fff', fontSize: '15px' }}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button type="button" onClick={() => setEditingPass(false)} style={{ flex: 1, background: 'rgba(255,255,255,0.1)', color: 'var(--text-primary)', border: 'none', borderRadius: '8px', padding: '10px' }}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={loadingPass} style={{ flex: 1, background: 'var(--brand)', color: '#000', border: 'none', borderRadius: '8px', padding: '10px', fontWeight: 600 }}>
                      {loadingPass ? '...' : 'Guardar'}
                    </button>
                  </div>
                </form>
              ) : (
                <div style={{ background: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '8px', color: 'var(--text-primary)', fontSize: '15px' }}>
                  ••••••••
                </div>
              )}
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '4px 0' }} />

            {/* Toggle Modo Patrimonial */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '15px', color: 'var(--text-primary)' }}>Modo Patrimonial</div>
                <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '2px' }}>Ver portafolio de inversiones</div>
              </div>
              <button 
                onClick={() => {
                  setModo(modo === 'diario' ? 'patrimonio' : 'diario');
                  onClose();
                }}
                style={{
                  width: '44px',
                  height: '24px',
                  borderRadius: '12px',
                  background: modo === 'patrimonio' ? 'var(--brand)' : 'rgba(255,255,255,0.1)',
                  border: 'none',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background 0.3s'
                }}
              >
                <div style={{
                  width: '20px',
                  height: '20px',
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: '2px',
                  left: modo === 'patrimonio' ? '22px' : '2px',
                  transition: 'left 0.3s'
                }} />
              </button>
            </div>

          </div>
        </GlassCard>
      </motion.div>
    </div>
  );
}
