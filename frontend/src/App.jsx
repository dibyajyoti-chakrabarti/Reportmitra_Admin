import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login";
import Dashboard from "./components/Dashboard";
import RequireAuth from "./RequireAuth";

import IssueList from "./components/IssueList";
import UrgentIssues from "./components/UrgentIssues";
import Profile from "./components/Profile";
import IssueHistory from "./components/IssueHistory";
import AccountCreation from "./components/AccountCreation";
import Analytics from "./components/Analytics";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public */}
        <Route path="/" element={<Login />} />

        {/* Protected Dashboard + ALL pages */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        >
          {/* Dashboard home */}
          <Route index element={null} />

          {/* Sidebar-linked pages */}
          <Route path="issues" element={<IssueList />} />
          <Route path="urgent" element={<UrgentIssues />} />
          <Route path="profile" element={<Profile />} />
          <Route path="history" element={<IssueHistory />} />
          <Route path="create" element={<AccountCreation />} />
          <Route path="analytics" element={<Analytics />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}
