import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Home, Building2, Gauge, ClipboardList, AlertTriangle, Plug, Radio } from 'lucide-react';
import { HorizontalNav, NavItem } from '@/components/layout/HorizontalNav';
import { WattBimDashboard } from './WattBimDashboard';
import { WattBimBuildings } from './WattBimBuildings';
import { WattBimMeters } from './WattBimMeters';
import { WattBimReadings } from './WattBimReadings';
import { WattBimAlerts } from './WattBimAlerts';
import { WattBimConnectors } from './WattBimConnectors';
import { WattBimConnectionStatus } from './WattBimConnectionStatus';

const navItems: NavItem[] = [
  { label: 'Vue d\'ensemble', path: '', icon: Home },
  { label: 'Bâtiments', path: '/batiments', icon: Building2 },
  { label: 'Compteurs', path: '/compteurs', icon: Gauge },
  { label: 'Relevés', path: '/relevés', icon: ClipboardList },
  { label: 'Alertes', path: '/alertes', icon: AlertTriangle },
  { label: 'État IoT', path: '/etat-iot', icon: Radio },
  { label: 'Connecteurs', path: '/connecteurs', icon: Plug },
];

export const WattBimApp: React.FC = () => {
  return (
    <>
      <HorizontalNav items={navItems} basePath="/app/wattbim" />
      <Routes>
        <Route index element={<WattBimDashboard />} />
        <Route path="batiments" element={<WattBimBuildings />} />
        <Route path="compteurs" element={<WattBimMeters />} />
        <Route path="relevés" element={<WattBimReadings />} />
        <Route path="alertes" element={<WattBimAlerts />} />
        <Route path="etat-iot" element={<WattBimConnectionStatus />} />
        <Route path="connecteurs" element={<WattBimConnectors />} />
        <Route path="*" element={<Navigate to="" replace />} />
      </Routes>
    </>
  );
};

export default WattBimApp;
