'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Wallet, TrendingUp, ArrowRight, Loader2 } from 'lucide-react';
import { GlassCard } from '@/components/ui';
import { crearTarjeta } from '@/lib/api/tarjetas';
import { crearMovimiento } from '@/lib/api/movimientos';
import { addCuentaYield } from '@/lib/api/inversiones';
import { crearApartado } from '@/lib/api/apartados';

type AccountType = 'bank' | 'yield' | null;

export function OnboardingWizard({ userName }: { userName: string }) {
  const [step, setStep] = useState<number>(1);
  const [accountType, setAccountType] = useState<AccountType>(null);
  
  const [formData, setFormData] = useState({ name: '', balance: '', apy: '' });
  const [bankType, setBankType] = useState<'Débito' | 'Crédito'>('Débito');
  const [creditData, setCreditData] = useState({ limite: '', diaCorte: '', diaPago: '' });
  
  const [addApartado, setAddApartado] = useState(false);
  const [apartadoName, setApartadoName] = useState('');
  const [apartadoApy, setApartadoApy] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleNext = () => {
    if (step === 1 && accountType) setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    
    setIsSubmitting(true);
    setErrorMsg('');
    
    try {
      let saldo = 0;
      if (!(accountType === 'bank' && bankType === 'Crédito' && !formData.balance)) {
        saldo = parseFloat(formData.balance) || 0;
      }
      
      const today = new Date().toISOString().split('T')[0];

      if (accountType === 'bank') {
        const isCredit = bankType === 'Crédito';
        const tarjeta = await crearTarjeta({
          nombre: formData.name,
          tipo: isCredit ? 'Crédito' : 'Débito',
          limite: isCredit ? parseFloat(creditData.limite) || 0 : 0,
          diaCorte: isCredit ? parseInt(creditData.diaCorte) || null : null,
          diaPago: isCredit ? parseInt(creditData.diaPago) || null : null
        });

        if (saldo > 0) {
          await crearMovimiento({
            tipo: isCredit ? 'Gasto' : 'Ingreso',
            monto: saldo,
            categoria: isCredit ? 'Otros' : 'Ingreso',
            comercio: isCredit ? 'Deuda Inicial' : 'Saldo Inicial',
            fecha: today,
            metodoPago: tarjeta.nombre
          });
        }

        if (!isCredit && addApartado && apartadoName && apartadoApy) {
          await crearApartado({
            tarjeta_id: tarjeta.id,
            nombre: apartadoName,
            rendimiento_anual: parseFloat(apartadoApy) || 0
          });
        }
      } else if (accountType === 'yield') {
        const apy = parseFloat(formData.apy) || 0;
        await addCuentaYield({
          nombre: formData.name,
          moneda: 'MXN',
          balance_inicial: saldo,
          interes_acumulado: 0,
          apy: apy,
          ultima_actualizacion: today
        });
      }

      localStorage.setItem('fintrack_tour_pending', 'true');
      setStep(3);
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 2000);

    } catch (err: unknown) {
      const errorMsgStr = err instanceof Error ? err.message : 'Ocurrió un error al crear la cuenta';
      setErrorMsg(errorMsgStr);
      setIsSubmitting(false);
    }
  };

  const fadeVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' } },
    exit: { opacity: 0, y: -20, transition: { duration: 0.3 } }
  };

  return (
    <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: '440px' }}>
      
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px', justifyContent: 'center' }}>
        {[1, 2, 3].map((i) => (
          <div 
            key={i} 
            style={{ 
              height: '4px', 
              width: '40px', 
              borderRadius: '2px',
              background: i <= step ? 'var(--brand)' : 'rgba(255,255,255,0.1)',
              transition: 'background 0.3s ease'
            }} 
          />
        ))}
      </div>

      <AnimatePresence mode="wait">
        
        {step === 1 && (
          <motion.div key="step1" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '28px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                ¡Hola, {userName}!
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                Para comenzar, configura tu cuenta principal. ¿Cuál deseas agregar primero?
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <button 
                onClick={() => setAccountType('bank')}
                style={{ 
                  background: accountType === 'bank' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                  border: accountType === 'bank' ? '1px solid var(--brand)' : '1px solid var(--border-glass)',
                  padding: '24px', borderRadius: '20px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s'
                }}
              >
                <div style={{ background: 'var(--surface-glass)', padding: '12px', borderRadius: '12px', color: 'var(--text-primary)' }}>
                  <Wallet size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>Cuenta Bancaria</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Débito o Crédito (BBVA, Santander, Nu, etc).</p>
                </div>
              </button>

              <button 
                onClick={() => setAccountType('yield')}
                style={{ 
                  background: accountType === 'yield' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.03)',
                  border: accountType === 'yield' ? '1px solid var(--credito-verde)' : '1px solid var(--border-glass)',
                  padding: '24px', borderRadius: '20px', cursor: 'pointer', textAlign: 'left',
                  display: 'flex', alignItems: 'center', gap: '16px', transition: 'all 0.2s'
                }}
              >
                <div style={{ background: 'var(--surface-glass)', padding: '12px', borderRadius: '12px', color: 'var(--credito-verde)' }}>
                  <TrendingUp size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '16px', color: 'var(--text-primary)', marginBottom: '4px' }}>Inversión</h3>
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Cuentas de ahorro con rendimiento.</p>
                </div>
              </button>
            </div>

            <button 
              onClick={handleNext}
              disabled={!accountType}
              style={{
                width: '100%', marginTop: '32px', padding: '16px', borderRadius: '14px',
                background: accountType ? 'var(--text-primary)' : 'rgba(255,255,255,0.1)',
                color: accountType ? 'var(--bg-base)' : 'var(--text-muted)',
                fontSize: '15px', fontWeight: 600, border: 'none', cursor: accountType ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                transition: 'all 0.2s'
              }}
            >
              Siguiente <ArrowRight size={18} />
            </button>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step2" variants={fadeVariants} initial="hidden" animate="visible" exit="exit">
            <div style={{ textAlign: 'center', marginBottom: '32px' }}>
              <div style={{ display: 'inline-flex', padding: '12px', borderRadius: '16px', background: 'var(--surface-glass)', marginBottom: '16px', color: accountType === 'yield' ? 'var(--credito-verde)' : 'var(--text-primary)' }}>
                {accountType === 'yield' ? <TrendingUp size={28} /> : <Wallet size={28} />}
              </div>
              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>
                {accountType === 'yield' ? 'Tu cuenta de Inversión' : 'Tu cuenta de Débito'}
              </h1>
              <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
                Solo dinos cuánto tienes disponible en este momento.
              </p>
            </div>

            <GlassCard style={{ padding: '24px' }}>
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              
                {accountType === 'bank' && (
                  <div style={{ display: 'flex', gap: '8px', padding: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '14px', border: '1px solid var(--border-glass)' }}>
                    <button
                      type="button"
                      onClick={() => setBankType('Débito')}
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', background: bankType === 'Débito' ? 'rgba(255,255,255,0.1)' : 'transparent', color: bankType === 'Débito' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
                    >
                      Débito
                    </button>
                    <button
                      type="button"
                      onClick={() => setBankType('Crédito')}
                      style={{ flex: 1, padding: '10px', borderRadius: '10px', background: bankType === 'Crédito' ? 'rgba(255,255,255,0.1)' : 'transparent', color: bankType === 'Crédito' ? 'var(--text-primary)' : 'var(--text-muted)', border: 'none', cursor: 'pointer', fontWeight: 500, transition: 'all 0.2s' }}
                    >
                      Crédito
                    </button>
                  </div>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      Nombre de la {accountType === 'yield' ? 'inversión' : 'cuenta'}
                    </label>
                    <input 
                      type="text" 
                      required 
                      placeholder={accountType === 'yield' ? 'Ej: CETES Directo, Finsus' : 'Ej: BBVA, Santander'}
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--surface-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none' }}
                    />
                  </div>

                  {accountType === 'bank' && bankType === 'Crédito' && (
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Día de Corte</label>
                        <input 
                          type="number" min="1" max="31" required 
                          placeholder="Ej: 15"
                          value={creditData.diaCorte}
                          onChange={e => setCreditData({ ...creditData, diaCorte: e.target.value })}
                          style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--surface-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none' }}
                        />
                      </div>
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Día de Pago</label>
                        <input 
                          type="number" min="1" max="31" required 
                          placeholder="Ej: 5"
                          value={creditData.diaPago}
                          onChange={e => setCreditData({ ...creditData, diaPago: e.target.value })}
                          style={{ width: '100%', padding: '16px', borderRadius: '16px', background: 'var(--surface-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none' }}
                        />
                      </div>
                    </div>
                  )}

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                      {accountType === 'bank' && bankType === 'Crédito' ? 'Límite de crédito' : 'Saldo inicial'}
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>$</span>
                      <input 
                        type="number" 
                        required={!(accountType === 'bank' && bankType === 'Crédito')}
                        step="0.01"
                        placeholder="0.00"
                        value={accountType === 'bank' && bankType === 'Crédito' ? creditData.limite : formData.balance}
                        onChange={e => {
                          if (accountType === 'bank' && bankType === 'Crédito') {
                            setCreditData({ ...creditData, limite: e.target.value });
                          } else {
                            setFormData({ ...formData, balance: e.target.value });
                          }
                        }}
                        style={{ width: '100%', padding: '16px 16px 16px 32px', borderRadius: '16px', background: 'var(--surface-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none' }}
                      />
                    </div>
                  </div>

                  {accountType === 'bank' && bankType === 'Crédito' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                        Deuda actual (Opcional)
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>$</span>
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="0.00"
                          value={formData.balance}
                          onChange={e => setFormData({ ...formData, balance: e.target.value })}
                          style={{ width: '100%', padding: '16px 16px 16px 32px', borderRadius: '16px', background: 'var(--surface-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', fontSize: '16px', outline: 'none' }}
                        />
                      </div>
                    </div>
                  )}

                  {accountType === 'bank' && bankType === 'Débito' && (
                    <div style={{ marginTop: '16px', background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-glass)' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={addApartado} 
                          onChange={e => setAddApartado(e.target.checked)}
                          style={{ width: '18px', height: '18px', accentColor: 'var(--brand)' }}
                        />
                        <div>
                          <div style={{ fontSize: '14px', color: 'var(--text-primary)' }}>Crear apartado con rendimientos</div>
                          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>(Ej: Cajitas, apartados)</div>
                        </div>
                      </label>
                      
                      {addApartado && (
                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          <input 
                            type="text" 
                            placeholder="Nombre del apartado (Ej: Cajita)"
                            value={apartadoName}
                            onChange={e => setApartadoName(e.target.value)}
                            required={addApartado}
                            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none' }}
                          />
                          <input 
                            type="number" 
                            step="0.01"
                            placeholder="Rendimiento Anual (APY %)"
                            value={apartadoApy}
                            onChange={e => setApartadoApy(e.target.value)}
                            required={addApartado}
                            style={{ width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--surface-glass)', border: '1px solid var(--border-glass)', color: 'var(--text-primary)', outline: 'none' }}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {accountType === 'yield' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <label style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>Rendimiento Anual (APY)</label>
                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" step="0.01" required placeholder="13.5"
                          className="glass-input" style={{ paddingRight: '32px' }}
                          value={formData.apy} onChange={(e) => setFormData({...formData, apy: e.target.value})}
                        />
                        <span style={{ position: 'absolute', right: '16px', top: '14px', color: 'var(--text-muted)' }}>%</span>
                      </div>
                    </div>
                  )}
                </div>

                {errorMsg && (
                  <div style={{ color: 'var(--credito-rojo)', fontSize: '13px', background: 'rgba(239,68,68,0.1)', padding: '10px', borderRadius: '8px' }}>
                    {errorMsg}
                  </div>
                )}

                <button 
                  type="submit" disabled={isSubmitting || !formData.name || !formData.balance}
                  style={{
                    width: '100%', marginTop: '8px', padding: '16px', borderRadius: '12px',
                    background: 'var(--brand)', color: '#fff',
                    fontSize: '15px', fontWeight: 600, border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    opacity: (isSubmitting || !formData.name || !formData.balance) ? 0.7 : 1,
                    transition: 'opacity 0.2s'
                  }}
                >
                  {isSubmitting ? <Loader2 size={18} className="spin" /> : 'Finalizar configuración'}
                </button>
              </form>
            </GlassCard>
            
            <button 
              onClick={() => setStep(1)} disabled={isSubmitting}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '14px', width: '100%', textAlign: 'center', marginTop: '20px', cursor: 'pointer' }}
            >
              Volver atrás
            </button>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step3" variants={fadeVariants} initial="hidden" animate="visible" exit="exit" style={{ textAlign: 'center', padding: '40px 0' }}>
            <motion.div 
              animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
              style={{ display: 'inline-block', marginBottom: '24px' }}
            >
              <Loader2 size={48} color="var(--brand)" />
            </motion.div>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '24px', color: 'var(--text-primary)', marginBottom: '8px' }}>
              Dejando todo listo para ti...
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '15px' }}>
              Creando tu cuenta inicial y preparando tu panel mágico.
            </p>
          </motion.div>
        )}

      </AnimatePresence>
      <style>{`
        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
