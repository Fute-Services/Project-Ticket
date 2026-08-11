import SuperAdminLayout from '../components/SuperAdminLayout';
import RolePermissionsView from '../components/RolePermissionsView';

export default function SuperAdminDashboardPage() {
  return (
    <SuperAdminLayout>
      <RolePermissionsView />
    </SuperAdminLayout>
  );
}
