const IssueHistory = () => {
  const history = [
    { id: 'HIS-001', title: 'Street Cleaning', status: 'Resolved', date: '2024-11-25', resolvedBy: 'John Doe' },
    { id: 'HIS-002', title: 'Park Maintenance', status: 'Resolved', date: '2024-11-20', resolvedBy: 'Jane Smith' }
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">Issue History</h1>
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="grid grid-cols-5 gap-4 bg-gray-50 px-6 py-3 font-semibold text-sm text-gray-700 border-b">
          <div>Issue ID</div>
          <div>Title</div>
          <div>Status</div>
          <div>Resolved Date</div>
          <div>Resolved By</div>
        </div>
        {history.map((item) => (
          <div key={item.id} className="grid grid-cols-5 gap-4 px-6 py-4 border-b hover:bg-gray-50">
            <div className="font-mono text-sm">{item.id}</div>
            <div>{item.title}</div>
            <div>
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                {item.status}
              </span>
            </div>
            <div className="text-gray-600 text-sm">{item.date}</div>
            <div className="text-gray-800">{item.resolvedBy}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IssueHistory;