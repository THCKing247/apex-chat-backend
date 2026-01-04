import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { format } from 'date-fns';

const API_URL = process.env.REACT_APP_API_URL || 
  (process.env.NODE_ENV === 'production' 
    ? 'https://chat.apextsgroup.com/api'
    : 'http://localhost:5000/api');

interface ChatMessage {
  id: string;
  sender_type: string;
  message: string;
  is_ai: boolean;
  is_human_handoff: boolean;
  created_at: string;
}

interface ChatSession {
  id: string;
  visitor_name: string;
  visitor_email: string;
  status: string;
}

const ChatDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (id) {
      fetchSession();
      fetchMessages();
    }
  }, [id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchSession = async () => {
    try {
      const response = await axios.get(`${API_URL}/chat/sessions/${id}`);
      setSession(response.data);
    } catch (error) {
      console.error('Failed to fetch session:', error);
    }
  };

  const fetchMessages = async () => {
    try {
      const response = await axios.get(`${API_URL}/chat/sessions/${id}/messages`);
      setMessages(response.data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sending) return;

    setSending(true);
    try {
      await axios.post(`${API_URL}/chat/sessions/${id}/messages`, {
        message: newMessage,
      });
      setNewMessage('');
      fetchMessages();
      fetchSession();
    } catch (error) {
      console.error('Failed to send message:', error);
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTakeOver = async () => {
    if (!window.confirm('Take over this chat? This will transfer it to human support.')) {
      return;
    }

    try {
      await axios.post(`${API_URL}/chat/sessions/${id}/handoff`, {
        message: 'A human agent has taken over this conversation.',
      });
      fetchSession();
      fetchMessages();
      alert('Chat transferred to human successfully');
    } catch (error) {
      console.error('Failed to take over chat:', error);
      alert('Failed to take over chat');
    }
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
      <div className="mb-6">
        <button
          onClick={() => navigate('/chats')}
          className="text-sm text-blue-600 hover:text-blue-800 mb-4"
        >
          ← Back to Sessions
        </button>
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {session?.visitor_name || 'Anonymous'}
            </h1>
            <p className="mt-1 text-sm text-gray-600">{session?.visitor_email}</p>
            <span
              className={`mt-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                session?.status === 'human_handoff'
                  ? 'bg-yellow-100 text-yellow-800'
                  : session?.status === 'active'
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              {session?.status === 'human_handoff' ? 'Human Handoff' : session?.status}
            </span>
          </div>
          {session?.status !== 'human_handoff' && (
            <button
              onClick={handleTakeOver}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm font-medium"
            >
              Take Over Chat
            </button>
          )}
        </div>
      </div>

      <div className="bg-white shadow rounded-lg flex flex-col" style={{ height: '600px' }}>
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.sender_type === 'human' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.sender_type === 'human'
                    ? 'bg-blue-600 text-white'
                    : message.is_ai
                    ? 'bg-gray-200 text-gray-900'
                    : 'bg-green-100 text-gray-900'
                }`}
              >
                <p className="text-sm">{message.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.sender_type === 'human'
                      ? 'text-blue-100'
                      : 'text-gray-500'
                  }`}
                >
                  {format(new Date(message.created_at), 'HH:mm')}
                  {message.is_human_handoff && ' • Handoff'}
                </p>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        <div className="border-t border-gray-200 p-4">
          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={sending || session?.status !== 'human_handoff'}
            />
            <button
              type="submit"
              disabled={sending || !newMessage.trim() || session?.status !== 'human_handoff'}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send'}
            </button>
          </form>
          {session?.status !== 'human_handoff' && (
            <p className="mt-2 text-xs text-gray-500 text-center">
              Take over the chat to send messages
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatDetail;

