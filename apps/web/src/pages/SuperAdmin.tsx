import React from "react";
import { Navigate, Routes, Route } from "react-router-dom";
import { useUserRoleCached } from "@/contexts/AppDataContext";
import { ProtectedRoute } from "@/components/superadmin/ProtectedRoute";
import { SuperAdminLayout } from "@/components/superadmin/SuperAdminLayout";
import { SuperAdminDashboard } from './superadmin/SuperAdminDashboard';

import { SuperAdminPlans } from './superadmin/SuperAdminPlans';
import { SuperAdminOrganizations } from './superadmin/SuperAdminOrganizations';
import { SuperAdminUsers } from './superadmin/SuperAdminUsers';
import { SuperAdminSettings } from './superadmin/SuperAdminSettings';
import SuperAdminOrders from './superadmin/SuperAdminOrders';
import SuperAdminPromoCodes from './superadmin/SuperAdminPromoCodes';
import SuperAdminBlog from './superadmin/SuperAdminBlog';

import SuperAdminEmissionFactors from './superadmin/SuperAdminEmissionFactors';
const SuperAdmin = () => {
  const { userRole } = useUserRoleCached();
  const isFinanceur = userRole === 'financeur';

  return (
    <ProtectedRoute>
      <SuperAdminLayout>
        <Routes>
          <Route path="/" element={<Navigate to="/superadmin/dashboard" replace />} />
          <Route path="/dashboard" element={<SuperAdminDashboard />} />
          {isFinanceur && (
            <>
              <Route path="/organizations" element={<SuperAdminOrganizations />} />
              <Route path="/users" element={<SuperAdminUsers />} />
              <Route path="/emission-factors" element={<SuperAdminEmissionFactors />} />
            </>
          )}
          
          {!isFinanceur && (
            <>
              <Route path="/orders" element={<SuperAdminOrders />} />
              <Route path="/promo-codes" element={<SuperAdminPromoCodes />} />
              <Route path="/blog" element={<SuperAdminBlog />} />
              <Route path="/plans" element={<SuperAdminPlans />} />
              <Route path="/organizations" element={<SuperAdminOrganizations />} />
              <Route path="/users" element={<SuperAdminUsers />} />
              <Route path="/emission-factors" element={<SuperAdminEmissionFactors />} />
              <Route path="/settings" element={<SuperAdminSettings />} />
            </>
          )}
          <Route path="/*" element={<Navigate to="/superadmin/dashboard" replace />} />
        </Routes>
      </SuperAdminLayout>
    </ProtectedRoute>
  );
};

export default SuperAdmin;
