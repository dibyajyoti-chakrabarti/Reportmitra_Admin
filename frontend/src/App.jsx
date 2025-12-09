// App.jsx
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Login from "./components/Login.jsx";
import Dashboard from "./components/Dashboard.jsx";
import IssueList from "./components/IssueList.jsx";
import UrgentIssues from "./components/UrgentIssues.jsx";
import Profile from "./components/Profile.jsx";
import IssueHistory from "./components/IssueHistory.jsx";
import AccountCreation from "./components/AccountCreation.jsx";

function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Public Route */}
        <Route path="/" element={<Login />} />

        {/* Dashboard + Nested Routes */}
        <Route path="/dashboard" element={<Dashboard />}>
          <Route path="issues" element={<IssueList />} />
          <Route path="urgent" element={<UrgentIssues />} />
          <Route path="profile" element={<Profile />} />
          <Route path="history" element={<IssueHistory />} />
          <Route path="create" element={<AccountCreation />} />
        </Route>

      </Routes>
    </BrowserRouter>
  );
}

export default App;
