"use client";

import { AuthGuard } from "./AuthGuard";

interface PermissionGateProps {
  requiredPermissions: string[];
  requireAny?: boolean;
  children: React.ReactNode;
}

export function PermissionGate({
  requiredPermissions,
  requireAny = true,
  children,
}: PermissionGateProps) {
  return (
    <AuthGuard requiredPermissions={requiredPermissions} requireAny={requireAny}>
      {children}
    </AuthGuard>
  );
}
