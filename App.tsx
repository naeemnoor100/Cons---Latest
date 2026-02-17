import React, { useState } from 'react';
import { AppProvider } from './AppContext';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { ProjectList } from './components/ProjectList';
import { VendorList } from './components/VendorList';
import { Inventory } from './components/Inventory';
import { ExpenseTracker } from './components/ExpenseTracker';
import { Reports } from './components/Reports';
import { ProjectIncome } from './components/ProjectIncome';
import { InvoiceManager } from './components/InvoiceManager';
import { Settings } from './components/Settings';

const MainApp: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'projects':
        return <ProjectList />;
      case 'invoices':
        return <InvoiceManager />;
      case 'income':
        return <ProjectIncome />;
      case 'vendors':
        return <VendorList />;
      case 'materials':
        return <Inventory />;
      case 'expenses':
        return <ExpenseTracker />;
      case 'reports':
        return <Reports />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {renderContent()}
    </Layout>
  );
};

const App: React.FC = () => {
  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
};

export default App;