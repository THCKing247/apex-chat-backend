import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://chat.apextsgroup.com/api'
    : 'http://localhost:5000/api');

interface ChatSession {
  id: string;
  visitor_name: string;
  visitor_email: string;
  status: string;
  created_at: string;
  updated_at: string;
}

const ChatSessions: React.FC = () => {
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const statusFilter = searchParams.get('status');

  useEffect(() => {
    fetchSessions();
  }, [statusFilter]);

  const fetchSessions = async () => {
    try {
      const params: any = {};
      if (statusFilter) {
        params.status = statusFilter;
      }
      const response = await axios.get(`${API_URL}/chat/sessions`, { params });
      setSessions(response.data);
    } catch (error) {
      console.error('Failed to fetch sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: { [key: string]: { color: string; label: string } } = {
      active: { color: 'bg-green-100 text-green-800', label: 'Active' },
      human_handoff: { color: 'bg-yellow-100 text-yellow-800', label: 'Human Handoff' },
      closed: { color: 'bg-gray-100 text-gray-800', label: 'Closed' },
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
          <h1 className="text-3xl font-bold text-gray-900">Chat Sessions</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage and monitor all chatbot conversations
          </p>
        </div>
        <div className="flex space-x-2">
          <Link
            to="/chats"
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              !statusFilter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            All
          </Link>
          <Link
            to="/chats?status=active"
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'active'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Active
          </Link>
          <Link
            to="/chats?status=human_handoff"
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              statusFilter === 'human_handoff'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Handoff
          </Link>
        </div>
      </div>

      <div className="bg-white shadow overflow-hidden sm:rounded-md">
        <ul className="divide-y divide-gray-200">
          {sessions.length === 0 ? (
            <li className="px-6 py-8 text-center text-gray-500">
              No chat sessions found
            </li>
          ) : (
            sessions.map((session) => (
              <li key={session.id}>
                <Link
                  to={`/chats/${session.id}`}
                  className="block hover:bg-gray-50 px-6 py-4"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {session.visitor_name || 'Anonymous'}
                        </p>
                        {getStatusBadge(session.status)}
                      </div>
                      <p className="mt-1 text-sm text-gray-500 truncate">
                        {session.visitor_email || 'No email'}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Started: {format(new Date(session.created_at), 'PPp')}
                      </p>
                    </div>
                    <div className="ml-5 flex-shrink-0">
                      <svg
                        className="h-5 w-5 text-gray-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              </li>
            ))
          )}
        </ul>
      </div>
    </div>
  );
};

export default ChatSessions;

