# PayPal Integration E2E Testing Guide

This guide covers end-to-end testing of the PayPal payment integration alongside the existing Stripe payment system.

## Prerequisites

### 1. PayPal Sandbox Setup

1. Go to https://sandbox.paypal.com
2. Create a Business account or use an existing sandbox account
3. In the dashboard, navigate to **Apps & Credentials** → **Sandbox**
4. Create an app (or use an existing one) to get:
   - **Client ID**
   - **Client Secret**
5. Create a **Personal** sandbox account for testing buyer transactions
6. Create a **Business** sandbox account for testing seller payouts (optional)

### 2. Environment Configuration

Add PayPal credentials to `apps/api/.env`:
```
PAYPAL_CLIENT_ID=your_sandbox_client_id
PAYPAL_CLIENT_SECRET=your_sandbox_client_secret
PAYPAL_MODE=sandbox
PAYPAL_WEBHOOK_ID=your_webhook_id  # Setup after webhook configuration
```

Add public client ID to `apps/web/.env.local`:
```
NEXT_PUBLIC_PAYPAL_CLIENT_ID=your_sandbox_client_id
```

### 3. Webhook Configuration (Optional but Recommended)

1. In PayPal Dashboard, go to **Settings** → **Webhooks**
2. Create a webhook with endpoint: `http://localhost:3001/pagos/paypal/webhook`
3. Subscribe to events:
   - `PAYMENT.CAPTURE.COMPLETED`
   - `PAYMENT.CAPTURE.DENIED`
   - `PAYMENT.CAPTURE.REFUNDED`
4. Copy the **Webhook ID** to `PAYPAL_WEBHOOK_ID` in `.env`

For local testing without exposing your port, you can use ngrok:
```bash
# Terminal 1: Start ngrok tunnel
ngrok http 3001

# Terminal 2: Update webhook URL in PayPal with ngrok URL
# e.g., https://your-ngrok-id.ngrok.io/pagos/paypal/webhook
```

## Testing Checklist

### Test 1: Stripe Flow (Regression Check)
**Objective**: Ensure existing Stripe payment flow still works

Steps:
1. Navigate to `/tienda/checkout`
2. Add products to cart and proceed to checkout
3. Fill in shipping and billing information
4. At **Paso 3 (Pago)**, verify **"Tarjeta de crédito / débito"** is selected (default)
5. Click **"Continuar"** to load Stripe payment form
6. Verify Stripe Elements loads successfully (card input visible)
7. Use Stripe test card: `4242 4242 4242 4242`, expiry `12/34`, CVC `123`
8. Complete payment
9. Verify redirect to `/tienda/checkout/pago-exitoso`
10. Verify email confirmation sent to customer

**Expected Result**: Payment completes, order status = `pagado`, pago.proveedor = `stripe`

---

### Test 2: PayPal Flow (Happy Path)
**Objective**: Complete end-to-end PayPal payment

Steps:

#### 2.1 Create PayPal Order
1. Navigate to `/tienda/checkout`
2. Add products and proceed to checkout
3. Fill shipping/billing info
4. At **Paso 3 (Pago)**, click **"PayPal"** button
5. Verify **"Continuar"** button is disabled (waiting for PayPal order)
6. Monitor backend logs for:
   ```
   [pagos] createPaypalOrder called
   POST /pagos/paypal/order request received
   ```
7. Verify in database:
   - `pagos` table has new row with `proveedor='paypal'`, `estado='pendiente'`
   - `payment_intent_id` is the PayPal orderId
8. Verify **"Continuar"** button enables once PayPal order is created
9. Verify PayPal Buttons component renders (gold button visible)

#### 2.2 Approve and Capture Order
1. Click PayPal button
2. Approve payment in PayPal popup using sandbox **Personal** account
3. Browser redirects back to checkout page
4. Monitor backend logs for:
   ```
   POST /pagos/paypal/capture request received
   PayPal Payout creado al confirmar entrega
   ```
5. Verify `onCapture` callback fires successfully
6. Verify redirect to `/tienda/checkout/pago-exitoso?pedido=<id>`
7. Verify in database:
   - `pagos.estado = 'completado'`
   - `pagos.payment_intent_id` = capture ID (not order ID)
   - `pedidos.estado = 'pagado'`
8. Verify email confirmation sent

#### 2.3 Summary Step (Resumen)
1. Verify order summary displays correctly
2. Verify payment method shows "PayPal" or similar indicator
3. Verify no Stripe Elements displayed

**Expected Result**: Order completes successfully with `proveedor='paypal'`

---

### Test 3: Currency Conversion
**Objective**: Verify MXN → USD conversion for PayPal

Setup:
1. Create an order in **MXN** (default)
2. Monitor backend logs during `POST /pagos/paypal/order`:
   - Verify currency sent to PayPal is **MXN** (or converted to USD if paypal.service converts)

Steps:
1. Place order and capture PayPal payment (from Test 2)
2. Check `monedas` table for `tipo_cambio`:
   ```sql
   SELECT codigo, tipo_cambio FROM monedas WHERE codigo IN ('MXN', 'USD');
   ```
3. Verify conversion math in producer payout (if order reaches `entregado` state):
   - Check `payouts` table after delivery
   - Verify `monto_neto` is in original currency (MXN)
   - Verify backend log shows USD conversion for PayPal Payouts

**Expected Result**: Orders accept MXN; payouts convert using `monedas.tipo_cambio`

---

### Test 4: Refund Flow
**Objective**: Process refunds for PayPal payments

Setup:
1. Complete a PayPal payment (from Test 2)
2. Get the `id_pago` from the `pagos` table

Steps:
1. Call refund endpoint:
   ```bash
   curl -X POST http://localhost:3001/pagos/{id_pago}/reembolso \
     -H "Authorization: Bearer <token>" \
     -H "Content-Type: application/json" \
     -d '{"reason": "Testing refund"}'
   ```
2. Verify backend logs show:
   ```
   [paypal] createRefund called with capture ID
   Refund initiated for payment_intent_id=<capture_id>
   ```
3. Verify in database:
   - `pagos.estado = 'reembolsado'`
   - New row in `payouts` table (if tracking refunds separately)
4. Monitor PayPal Dashboard → Transactions for refund confirmation

**Expected Result**: Refund processes via PayPal, payment marked as refunded

---

### Test 5: Producer PayPal Payout
**Objective**: Verify producers receive payouts via PayPal

Setup:
1. Complete a PayPal payment as a customer (from Test 2)
2. Use a producer account that has `paypal_email` configured
3. Verify producer profile has PayPal email set:
   - Navigate to `/dashboard/productor/perfil`
   - Fill in "Email de PayPal" field
   - Click "Guardar Cambios"

Steps:
1. Mark the order as **entregado** (via admin or backend script)
2. Monitor backend logs for:
   ```
   [pedidos] triggerPayoutForProductor called
   [paypal] createPayout called
   PayPal Payout creado al confirmar entrega
   ```
3. Verify in database:
   - `payouts` table has new row with `proveedor='paypal'`, `estado='procesado'`
   - `monto_neto` is converted to USD
   - `referencia_externa` = PayPal batch ID
4. Monitor PayPal Dashboard → Activity for payout confirmation

**Expected Result**: Producer receives payout via PayPal Payouts API

---

### Test 6: Payment Method Switch
**Objective**: Verify switching between Stripe and PayPal works cleanly

Steps:
1. Start checkout: `/tienda/checkout`
2. Add products, fill shipping info
3. At **Paso 3 (Pago)**, select **PayPal**
4. Verify PayPal Buttons component renders
5. **Without completing PayPal**: Click **"Tarjeta de crédito"** button
6. Verify:
   - PayPal Buttons disappear
   - Stripe Elements load
   - Previous PayPal order is **cancelled** or ignored (check logs)
   - `clientSecret` state is reset
7. Complete Stripe payment
8. Verify final order has `proveedor='stripe'`

**Expected Result**: Clean state transition, no orphaned PayPal orders

---

### Test 7: Webhook Handling (Optional)
**Objective**: Verify webhook processing updates payment status

Prerequisites:
- Webhook configured (see Prerequisites → Webhook Configuration)
- Using ngrok or public URL for local testing

Steps:
1. Complete a PayPal order capture
2. In PayPal Dashboard → Webhooks, find the recent webhook event
3. Manually **resend** the webhook:
   - Click the event (e.g., `PAYMENT.CAPTURE.COMPLETED`)
   - Click **"Resend"**
4. Verify backend endpoint processes webhook:
   - Check `/pagos/paypal/webhook` logs for signature verification
   - Verify `updatePaymentStatus` is called
   - Verify `pedidos.estado = 'pagado'` (if not already)

**Expected Result**: Webhook received, signature verified, payment status updated

---

### Test 8: Error Scenarios

#### 8.1 PayPal Email Not Configured
1. Create a producer account without `paypal_email` set
2. Complete a PayPal payment as customer
3. Mark order as `entregado`
4. Verify backend logs show:
   ```
   [pedidos] Productor {id} sin PayPal email. Dinero retenido en plataforma.
   ```
5. Verify notification sent to producer
6. Verify `payouts` table has entry with `estado='fallido'`

#### 8.2 Insufficient Funds / Declined
1. In PayPal sandbox, use a declined payment method
2. Try to capture order
3. Verify error handling in UI (error message displayed)
4. Verify `pagos.estado` remains `'pendiente'`
5. Verify customer can retry payment

#### 8.3 Missing Environment Variables
1. Temporarily remove `PAYPAL_CLIENT_ID` from `.env`
2. Try to create PayPal order
3. Verify backend returns meaningful error
4. Verify frontend shows error message to user

**Expected Result**: Graceful error handling, clear error messages

---

## Verification Scripts

### Check Database State
```sql
-- Recent PayPal payments
SELECT * FROM pagos WHERE proveedor='paypal' ORDER BY created_at DESC LIMIT 5;

-- Recent payouts
SELECT * FROM payouts WHERE proveedor='paypal' ORDER BY created_at DESC LIMIT 5;

-- Producer PayPal emails
SELECT id_productor, nombre, paypal_email FROM productores WHERE paypal_email IS NOT NULL;

-- Failed payouts
SELECT * FROM payouts WHERE estado='fallido' ORDER BY created_at DESC;
```

### Monitor Logs
```bash
# Terminal 1: Backend logs
cd apps/api && npm run start:dev

# Terminal 2: Frontend dev server
cd apps/web && npm run dev

# Terminal 3: Watch logs for PayPal operations
grep -i paypal apps/api/logs/*.log | tail -f
```

---

## Troubleshooting

| Issue | Check | Solution |
|-------|-------|----------|
| PayPal Buttons don't render | `NEXT_PUBLIC_PAYPAL_CLIENT_ID` in .env.local | Verify env var is set and API is restarted |
| "PayPal authentication failed" | Backend logs | Verify `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` are correct |
| Order creation fails | `/pagos/paypal/order` endpoint response | Check if `monedas` table has the requested currency |
| Refund fails | PayPal Dashboard → Resolution Center | May be due to webhook delays; retry after 5 minutes |
| Producer payout fails | Backend logs + `PAYPAL_WEBHOOK_ID` | Verify webhook secret is correct if using webhook-based triggering |
| Currency conversion wrong | `monedas.tipo_cambio` | Verify `tipo_cambio` is set for MXN and USD |

---

## Success Criteria

✅ All tests pass  
✅ No Stripe regressions  
✅ PayPal orders created and captured successfully  
✅ Producer payouts trigger on delivery  
✅ Webhooks (if configured) process correctly  
✅ Error scenarios handled gracefully  
✅ Currency conversion uses `monedas` table (not hardcoded)  

---

## Next Steps After Testing

1. **Go Live**: Switch `PAYPAL_MODE="live"` in production `.env`
2. **Producer Onboarding**: Update producer onboarding flow to require PayPal email for PayPal orders
3. **Monitoring**: Set up alerts for failed payouts (check `payouts.estado = 'fallido'`)
4. **Documentation**: Add PayPal payment instructions to customer-facing docs
5. **Analytics**: Track payment method distribution (Stripe vs PayPal) in admin dashboard
