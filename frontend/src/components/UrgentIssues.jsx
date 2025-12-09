const UrgentIssues = () => {
  const urgentIssues = [
    { id: 'URG-001', title: 'Water Main Burst', location: 'Sector 15', time: '2 hours ago' },
    { id: 'URG-002', title: 'Traffic Signal Failure', location: 'Main Square', time: '30 minutes ago' }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">Urgent Issues</h1>
      <div className="space-y-4">
        {urgentIssues.map((issue) => (
          <div key={issue.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-red-600">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <span className="text-2xl">⚠️</span>
                  <span className="font-mono text-sm text-gray-600">{issue.id}</span>
                </div>
                <h3 className="text-xl font-semibold text-black mb-2">{issue.title}</h3>
                <p className="text-gray-600 text-sm">Location: {issue.location}</p>
                <p className="text-gray-500 text-xs mt-1">Reported {issue.time}</p>
              </div>
              <button className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
                Take Action
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UrgentIssues;