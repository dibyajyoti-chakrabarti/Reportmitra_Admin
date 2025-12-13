import { useState } from "react";

const AccountCreation = () => {
  const [formData, setFormData] = useState({
    userId: '',
    fullName: '',
    department: '',
    email: '',
    password: ''
  });

  const handleCreate = () => {
    console.log('Creating account:', formData);
  };

  return (
    <div>
      <h1 className="text-3xl font-bold text-black mb-6">Account Creation</h1>
      <div className="bg-white rounded-lg shadow p-8 max-w-2xl">
        <p className="text-gray-600 mb-6">Create new administrative accounts for ReportMitra.</p>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">User ID</label>
            <input 
              type="text" 
              value={formData.userId}
              onChange={(e) => setFormData({...formData, userId: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-black" 
              placeholder="Enter user ID"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
            <input 
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({...formData, fullName: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-black" 
              placeholder="Enter full name"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Department</label>
            <input 
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-black" 
              placeholder="Enter department"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
            <input 
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-black" 
              placeholder="Enter email address"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Initial Password</label>
            <input 
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              className="w-full px-4 py-3 border border-gray-300 rounded focus:outline-none focus:border-black" 
              placeholder="Set initial password"
            />
          </div>
          <button 
            onClick={handleCreate}
            className="bg-black text-white px-6 py-3 rounded font-semibold hover:bg-gray-800 mt-4"
          >
            Create Account
          </button>
        </div>
      </div>
    </div>
  );
};

export default AccountCreation;