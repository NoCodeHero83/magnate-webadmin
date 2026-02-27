import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";

export const AdminLayout = () => {
  return (
    <div className="min-h-screen mesh-bg">
      <Sidebar />
      <main className="lg:pl-64">
        <div className="min-h-screen pt-16 lg:pt-0">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
