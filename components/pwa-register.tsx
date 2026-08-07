'use client'
import { useEffect } from 'react'

export function PwaRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(reg => console.log('[PWA] SW enregistré, scope:', reg.scope))
        .catch(err => console.error('[PWA] SW échec:', err))
    }
  }, [])
  return null
}
