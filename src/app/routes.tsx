import { createBrowserRouter, Navigate } from "react-router";
import { Layout } from "./components/Layout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { Login } from "./pages/Login";
import { ResetPassword } from "./pages/ResetPassword";
import { Dashboard } from "./pages/Dashboard";
import { Customers } from "./pages/Customers";
import { CustomerDetail } from "./pages/CustomerDetail";
import { Products } from "./pages/Products";
import { ProductDetail } from "./pages/ProductDetail";
import { Leads } from "./pages/Leads";
import { Users } from "./pages/Users";

export const router = createBrowserRouter([
  { path: "/login", Component: Login },
  { path: "/reset-password", Component: ResetPassword },
  {
    path: "/",
    Component: ProtectedRoute,
    children: [
      {
        Component: Layout,
        children: [
          { index: true, Component: Dashboard },
          { path: "customers", Component: Customers },
          { path: "customers/:id", Component: CustomerDetail },
          { path: "products", Component: Products },
          { path: "products/:id", Component: ProductDetail },
          { path: "leads", Component: Leads },
          { path: "users", Component: Users },
        ],
      },
    ],
  },
  { path: "*", element: <Navigate to="/" replace /> },
]);
