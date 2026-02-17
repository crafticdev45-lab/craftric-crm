import { RouterProvider } from 'react-router';
import { router } from './routes';
import { AuthProvider } from './context/AuthContext';
import { PermissionsProvider } from './context/PermissionsContext';
import { DataProvider } from './context/DataContext';

export default function App() {
  return (
    <AuthProvider>
      <PermissionsProvider>
        <DataProvider>
          <RouterProvider router={router} />
        </DataProvider>
      </PermissionsProvider>
    </AuthProvider>
  );
}