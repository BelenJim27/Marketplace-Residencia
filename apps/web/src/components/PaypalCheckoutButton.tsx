'use client';

import { PayPalButtons, usePayPalScriptReducer } from '@paypal/react-paypal-js';
import { Loader2 } from 'lucide-react';

interface PaypalCheckoutButtonProps {
  orderId: string;
  onCapture: (orderId: string) => Promise<void>;
  onError: (msg: string) => void;
  disabled?: boolean;
}

export default function PaypalCheckoutButton({
  orderId,
  onCapture,
  onError,
  disabled,
}: PaypalCheckoutButtonProps) {
  const [{ isPending }] = usePayPalScriptReducer();

  if (isPending) {
    return (
      <div className="flex items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-6 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900/20">
        <Loader2 size={16} className="animate-spin" />
        Cargando opciones de pago con PayPal...
      </div>
    );
  }

  return (
    <div className={disabled ? 'pointer-events-none opacity-50' : ''}>
      <PayPalButtons
        style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
        createOrder={() => orderId}
        onApprove={async () => {
          try {
            await onCapture(orderId);
          } catch (error) {
            onError(error instanceof Error ? error.message : 'Error al capturar pago');
          }
        }}
        onError={(err) => {
          onError(String(err));
        }}
      />
    </div>
  );
}
