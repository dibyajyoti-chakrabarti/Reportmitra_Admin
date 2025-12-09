const IssueList = () => {
  const issues = [
    { id: 'ISS-001', title: 'Broken Street Light', status: 'Pending', priority: 'Medium', date: '2024-12-08' },
    { id: 'ISS-002', title: 'Road Pothole Repair', status: 'In Progress', priority: 'High', date: '2024-12-07' },
    { id: 'ISS-003', title: 'Garbage Collection', status: 'Pending', priority: 'Low', date: '2024-12-09' }
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-black">Issue List</h1>
        <button className="bg-black text-white px-4 py-2 rounded hover:bg-gray-800">
          Filter
        </button>
      </div>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-5 gap-4 bg-gray-50 px-6 py-3 font-semibold text-sm text-gray-700 border-b">
          <div>Issue ID</div>
          <div>Title</div>
          <div>Status</div>
          <div>Priority</div>
          <div>Date</div>
        </div>
        {issues.map((issue) => (
          <div key={issue.id} className="grid grid-cols-5 gap-4 px-6 py-4 border-b hover:bg-gray-50 cursor-pointer">
            <div className="font-mono text-sm">{issue.id}</div>
            <div>{issue.title}</div>
            <div>
              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                {issue.status}
              </span>
            </div>
            <div>
              <span className={`px-2 py-1 rounded text-xs ${
                issue.priority === 'High' ? 'bg-red-100 text-red-800' :
                issue.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {issue.priority}
              </span>
            </div>
            <div className="text-gray-600 text-sm">{issue.date}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IssueList;