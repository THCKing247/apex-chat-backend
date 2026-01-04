import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';

const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://chat.apextsgroup.com/api'
    : 'http://localhost:5000/api');

interface Lead {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  message: string;
  status: string;
  source: string;
  created_at: string;
  session_id: string;
}

const Leads: React.FC = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    fetchLeads();
  }, [statusFilter]);

  const fetchLeads = async () => {
    try {
      const params: any = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await axios.get(`${API_URL}/leads`, { params });
      setLeads(response.data);
    } catch (error) {
      console.error('Failed to fetch leads:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateLeadStatus = async (leadId: string, newStatus: string) => {
    try {
      await axios.put(`${API_URL}/leads/${leadId}/status`, { status: newStatus });
      fetchLeads();
    } catch (error) {
      console.error('Failed to update lead status:', error);
      alert('Failed to update lead status');
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { color: string; label: string } } = {
      new: { color: 'bg-blue-100 text-blue-800', label: 'New' },
      contacted: { color: 'bg-yellow-100 text-yellow-800', label: 'Contacted' },
      qualified: { color: 'bg-green-100 text-green-800', label: 'Qualified' },
      converted: { color: 'bg-purple-100 text-purple-800', label: 'Converted' },
      lost: { color: 'bg-red-100 text-red-800', label: 'Lost' },
    };
    const statusInfo = statusMap[status] || { color: 'bg-gray-100 text-gray-800', label: status };
    return (
      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusInfo.color}`}>
        {statusInfo.label}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Leads</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage leads generated from chatbot conversations
          </p>
        </div>
        <div className="flex space-x-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-md px-4 py-2 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="converted">Converted</option>
            <option value="lost">Lost</option>
          </select>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {leads.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              No leads found
            </li>
          ) : (
            leads.map((lead) => (
              <li key={lead.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {lead.name}
                      </p>
                      {getStatusBadge(lead.status)}
                    </div>
                    <div className="mt-2 flex items-center text-sm text-gray-500">
                      <span className="mr-4">{lead.email}</span>
                      {lead.phone && <span className="mr-4">{lead.phone}</span>}
                      {lead.company && <span>{lead.company}</span>}
                    </div>
                    {lead.message && (
                      <p className="mt-2 text-sm text-gray-600">{lead.message}</p>
                    )}
                    <div className="mt-2 flex items-center text-xs text-gray-400">
                      <span>
                        Created: {format(new Date(lead.created_at), 'PPp')}
                      </span>
                      {lead.session_id && (
                        <Link
                          to={`/chats/${lead.session_id}`}
                          className="ml-4 text-blue-600 hover:text-blue-800"
                        >
                          View Chat
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0">
                    <select
                      value={lead.status}
                      onChange={(e) => updateLeadStatus(lead.id, e.target.value)}
                      className="border border-gray-300 rounded-md px-3 py-1 text-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="converted">Converted</option>
                      <option value="lost">Lost</option>
                    </select>
                  </div>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default Leads;

