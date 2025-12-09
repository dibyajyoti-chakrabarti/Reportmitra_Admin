const Dashboard = ({ user, onLogout, currentPage, setCurrentPage }) => {
  const menuItems = [
    { id: 'issues', label: 'ISSUE LIST', icon: '📋' },
    { id: 'urgent', label: 'URGENT ISSUES', icon: '⚠️' },
    { id: 'profile', label: 'PROFILE', icon: '👤' },
    { id: 'history', label: 'ISSUE HISTORY', icon: '📊' },
    { id: 'create', label: 'ACCOUNT CREATION', icon: '➕' }
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-80 bg-black text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center justify-center mb-6">
            <div className="w-20 h-20 rounded-full border-4 border-white"></div>
          </div>
          <div className="text-center text-sm">
            <div className="text-gray-400">&lt;USER_ID&gt;</div>
            <div className="text-white mt-1">&lt;FULL_NAME&gt;</div>
            <div className="text-gray-400 mt-1">&lt;DEPARTMENT&gt;</div>
          </div>
          <div className="mt-4 text-center font-semibold">
            ReportMitra ADMIN PANNEL
          </div>
        </div>

        <nav className="flex-1">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full text-left px-6 py-4 font-semibold transition-colors ${
                currentPage === item.id
                  ? 'bg-gray-800 border-l-4 border-white'
                  : 'hover:bg-gray-800'
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-6">
          <button
            onClick={onLogout}
            className="w-full bg-white text-black py-3 px-6 rounded font-semibold hover:bg-gray-200 transition-colors"
          >
            Logout
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="bg-white border-b border-gray-200 px-8 py-4">
          <div className="flex justify-between items-center">
            <div className="text-black font-bold">
              <div className="text-2xl tracking-wide">ReportMitra</div>
              <div className="text-xs tracking-widest text-gray-600 mt-1">CIVIC | CONNECT | RESOLVE</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right text-sm">
                <div className="font-semibold text-black">{user.fullName}</div>
                <div className="text-gray-600">{user.department}</div>
              </div>
              <div className="w-10 h-10 rounded-full bg-black"></div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-8">
          {currentPage === 'issues' && <IssueList />}
          {currentPage === 'urgent' && <UrgentIssues />}
          {currentPage === 'profile' && <Profile user={user} />}
          {currentPage === 'history' && <IssueHistory />}
          {currentPage === 'create' && <AccountCreation />}
        </main>
      </div>
    </div>
  );
};

export default Dashboard;