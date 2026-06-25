import { ServerPermissionLayout } from '@/components/auth/ServerPermissionLayout';

export default function Layout({ children }: { children: React.ReactNode }) {
  return <ServerPermissionLayout redirectPath="/dashboard/productor/solicitar">{children}</ServerPermissionLayout>;
}
