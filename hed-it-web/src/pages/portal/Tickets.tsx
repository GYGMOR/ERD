import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Ticket as TicketIcon, 
  Search, 
  Plus, 
  Send, 
  Paperclip,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface Message {
  id: string;
  sender_id: string;
  message: string;
  created_at: string;
  first_name: string;
  last_name: string;
  role: string;
}

interface Ticket {
  id: string;
  subject: string;
  status: 'open' | 'in_progress' | 'closed' | 'resolved';
  created_at: string;
}

const Tickets = () => {
  const { user, token } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const fetchTickets = async () => {
    try {
      const response = await fetch('/api/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setTickets(data.data);
    } catch (err) {
      console.error('Failed to fetch tickets');
    }
  };

  const fetchMessages = async (ticketId: string) => {
    try {
      const response = await fetch(`/api/tickets/${ticketId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) setMessages(data.data);
    } catch (err) {
      console.error('Failed to fetch messages');
    }
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const handleSelectTicket = (ticket: Ticket) => {
    setSelectedTicket(ticket);
    fetchMessages(ticket.id);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedTicket) return;

    try {
      const response = await fetch(`/api/tickets/${selectedTicket.id}/comments`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ message: newMessage })
      });
      const data = await response.json();
      if (data.success) {
        setMessages([...messages, {
          id: Date.now().toString(),
          sender_id: user?.id || '',
          message: newMessage,
          created_at: new Date().toISOString(),
          first_name: user?.firstName || '',
          last_name: user?.lastName || '',
          role: user?.role || ''
        }]);
        setNewMessage('');
      }
    } catch (err) {
      console.error('Failed to send message');
    }
  };

  return (
    <div className="portal-tickets">
      <div className="tickets-layout">
        
        {/* Sidebar: Ticket List */}
        <div className={`tickets-sidebar ${selectedTicket ? 'hidden-mobile' : ''}`}>
          <div className="sidebar-header">
            <h3>Support Tickets</h3>
            <button className="btn-icon primary"><Plus size={20} /></button>
          </div>
          <div className="search-bar">
            <Search size={18} />
            <input type="text" placeholder="Tickets suchen..." />
          </div>
          <div className="ticket-list">
            {tickets.map((ticket) => (
              <div 
                key={ticket.id} 
                className={`ticket-item ${selectedTicket?.id === ticket.id ? 'active' : ''}`}
                onClick={() => handleSelectTicket(ticket)}
              >
                <div className="ticket-item-header">
                  <span className={`status-pill ${ticket.status}`}>
                    {ticket.status === 'closed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                    {ticket.status}
                  </span>
                  <span className="ticket-date">{new Date(ticket.created_at).toLocaleDateString()}</span>
                </div>
                <p className="ticket-subject">{ticket.subject}</p>
                <p className="ticket-preview">Klicken für Details...</p>
              </div>
            ))}
          </div>
        </div>

        {/* Main: Chat Interface */}
        <div className={`chat-main ${!selectedTicket ? 'hidden-mobile' : ''}`}>
          {selectedTicket ? (
            <div className="chat-container">
              <div className="chat-header">
                <button className="back-btn" onClick={() => setSelectedTicket(null)}><ChevronLeft size={24} /></button>
                <div>
                  <h4>{selectedTicket.subject}</h4>
                  <p className="chat-status">Ticket #{selectedTicket.id.slice(0, 8)}</p>
                </div>
              </div>

              <div className="messages-area">
                {messages.map((msg, i) => (
                  <div key={i} className={`message-wrapper ${msg.sender_id === user?.id ? 'sent' : 'received'}`}>
                    <div className="message-bubble">
                      {msg.role !== 'customer' && <span className="sender-name">{msg.first_name} (hed-it.ch)</span>}
                      <p className="message-text">{msg.message}</p>
                      <span className="message-time">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>

              <form className="chat-input" onSubmit={handleSendMessage}>
                <button type="button" className="btn-icon"><Paperclip size={20} /></button>
                <input 
                  type="text" 
                  placeholder="Nachricht schreiben..." 
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                />
                <button type="submit" className="btn-icon primary"><Send size={20} /></button>
              </form>
            </div>
          ) : (
            <div className="no-ticket-selected">
              <TicketIcon size={64} className="text-muted" />
              <h4>Wähle ein Ticket aus</h4>
              <p>Wähle ein Ticket aus der Liste, um die Kommunikation zu sehen.</p>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .portal-tickets { height: calc(100vh - var(--nav-height) - 80px); }
        .tickets-layout { display: grid; grid-template-columns: 350px 1fr; height: 100%; background: var(--bg-card); border: 1px solid var(--border); border-radius: 24px; overflow: hidden; }
        
        .tickets-sidebar { border-right: 1px solid var(--border); display: flex; flex-direction: column; }
        .sidebar-header { padding: 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); }
        .sidebar-header h3 { font-size: 18px; margin: 0; }
        
        .search-bar { padding: 16px 24px; display: flex; align-items: center; gap: 12px; color: var(--text-muted); border-bottom: 1px solid var(--border); }
        .search-bar input { background: none; border: none; color: white; width: 100%; outline: none; }

        .ticket-list { flex: 1; overflow-y: auto; }
        .ticket-item { padding: 20px 24px; border-bottom: 1px solid var(--border); cursor: pointer; transition: background 0.3s; }
        .ticket-item:hover { background: rgba(255,255,255,0.02); }
        .ticket-item.active { background: var(--primary-glow); border-left: 4px solid var(--primary); }
        
        .ticket-item-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .status-pill { display: flex; align-items: center; gap: 4px; padding: 4px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .status-pill.open { background: rgba(0, 242, 255, 0.1); color: var(--primary); }
        .status-pill.closed { background: rgba(16, 185, 129, 0.1); color: #10b981; }
        .ticket-date { font-size: 12px; color: var(--text-muted); }
        .ticket-subject { font-weight: 700; font-size: 15px; margin: 0; }
        .ticket-preview { font-size: 13px; color: var(--text-muted); margin: 4px 0 0; }

        .chat-main { display: flex; flex-direction: column; height: 100%; position: relative; }
        .chat-container { display: flex; flex-direction: column; height: 100%; }
        .chat-header { padding: 24px; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 16px; }
        .chat-header h4 { margin: 0; font-size: 18px; }
        .chat-status { font-size: 12px; color: var(--text-muted); margin: 0; }
        .back-btn { background: none; border: none; color: white; cursor: pointer; display: none; }

        .messages-area { flex: 1; padding: 32px; overflow-y: auto; display: flex; flex-direction: column; gap: 24px; }
        .message-wrapper { display: flex; flex-direction: column; max-width: 70%; }
        .message-wrapper.sent { align-self: flex-end; align-items: flex-end; }
        .message-wrapper.received { align-self: flex-start; align-items: flex-start; }
        
        .message-bubble { padding: 16px 20px; border-radius: 20px; position: relative; }
        .sent .message-bubble { background: var(--primary); color: #000; border-bottom-right-radius: 4px; }
        .received .message-bubble { background: rgba(255,255,255,0.05); color: white; border-bottom-left-radius: 4px; }
        
        .sender-name { font-size: 11px; font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block; opacity: 0.7; }
        .message-text { margin: 0; font-size: 15px; line-height: 1.5; }
        .message-time { font-size: 10px; margin-top: 8px; display: block; opacity: 0.6; }

        .chat-input { padding: 24px; border-top: 1px solid var(--border); display: flex; gap: 16px; align-items: center; }
        .chat-input input { flex: 1; background: rgba(255,255,255,0.03); border: 1px solid var(--border); border-radius: 12px; padding: 14px 20px; color: white; outline: none; }
        
        .no-ticket-selected { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; color: var(--text-muted); text-align: center; }

        .btn-icon { width: 44px; height: 44px; border-radius: 12px; border: 1px solid var(--border); background: none; color: white; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .btn-icon.primary { background: var(--primary); color: #000; border: none; }

        @media (max-width: 768px) {
          .tickets-layout { grid-template-columns: 1fr; }
          .hidden-mobile { display: none; }
          .back-btn { display: block; }
        }
      `}</style>
    </div>
  );
};

export default Tickets;
