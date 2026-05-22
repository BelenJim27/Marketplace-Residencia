export const isPaypalConfigured = (): boolean => {
  return !!process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
};

export const getPaypalClientId = (): string => {
  const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
  if (!clientId) {
    throw new Error('NEXT_PUBLIC_PAYPAL_CLIENT_ID is not defined');
  }
  return clientId;
};
