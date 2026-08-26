"use client";

/**
 * Wrapper del RegistroForm con redirección tras éxito.
 * Separado en 'use client' para poder usar useRouter.
 */
import { useRouter } from 'next/navigation';
import { RegistroForm } from './RegistroForm';

export function RegistroFormWrapper() {
  const router = useRouter();
  return <RegistroForm onClose={() => router.push('/dashboard')} />;
}
