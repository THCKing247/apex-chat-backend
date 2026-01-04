import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import {
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
} from '@heroicons/react/24/outline';

const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://chat.apextsgroup.com/api'
    : 'http://localhost:5000/api');

interface DashboardStats {
  totalSessions: number;
  activeSessions: number;
  humanHandoffs: number;
  totalMessages: number;
}

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/reports/usage`);
      setStats(response.data);
    } catch (error) {
      console.error('Failed to fetch stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const statCards = [
    {
      name: 'Total Sessions',
      value: stats?.totalSessions || 0,
      icon: ChatBubbleLeftRightIcon,
      color: 'bg-blue-500',
      href: '/chats',
    },
    {
      name: 'Active Sessions',
      value: stats?.activeSessions || 0,
      icon: ArrowTrendingUpIcon,
      color: 'bg-green-500',
      href: '/chats?status=active',
    },
    {
      name: 'Human Handoffs',
      value: stats?.humanHandoffs || 0,
      icon: UserGroupIcon,
      color: 'bg-yellow-500',
      href: '/chats?status=human_handoff',
    },
    {
      name: 'Total Messages',
      value: stats?.totalMessages || 0,
      icon: ChartBarIcon,
      color: 'bg-purple-500',
      href: '/reports',
    },
  ];

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of your chatbot portal activity
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.name}
              to={card.href}
              className="bg-white overflow-hidden shadow rounded-lg hover:shadow-lg transition-shadow"
            >
              <div className="p-5">
                <div className="flex items-center">
                  <div className={`flex-shrink-0 ${card.color} rounded-md p-3`}>
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-5 w-0 flex-1">
                    <dl>
                      <dt className="text-sm font-medium text-gray-500 truncate">
                        {card.name}
                      </dt>
                      <dd className="text-2xl font-semibold text-gray-900">
                        {card.value}
                      </dd>
                    </dl>
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h2>
          <div className="space-y-3">
            <Link
              to="/chats"
              className="block w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              View All Chat Sessions
            </Link>
            <Link
              to="/leads"
              className="block w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Manage Leads
            </Link>
            <Link
              to="/reports"
              className="block w-full text-left px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
            >
              View Reports
            </Link>
          </div>
        </div>

        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h2>
          <p className="text-sm text-gray-500">
            Check the Reports page for detailed analytics and usage statistics.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

