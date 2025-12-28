import React, { useEffect, useState } from 'react';
import { getTransactions, type Transaction } from './api';
import './App.css';

export const Dashboard: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setError(null);
        const data = await getTransactions();
        setTransactions(data);
      } catch (err) {
        console.error("Failed to load transactions", err);
        setError("Failed to load transactions. Please check the backend connection.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const getBadgeClass = (status: string) => {
    switch (status) {
      case 'Valid': return 'badge-green';
      case 'Accepted': return 'badge-green';
      case 'Invalid': return 'badge-red';
      case 'Rejected': return 'badge-red';
      case 'Not Acknowledged': return 'badge-grey';
      case 'OUT': return 'badge-black';
      case 'IN': return 'badge-white';
      default: return 'badge-grey';
    }
  };

  const formatDate = (iso: string) => {
    return new Date(iso).toLocaleDateString() + ' ' + new Date(iso).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
  };

  if (loading && transactions.length === 0) return <div className="loading">Loading Dashboard...</div>;

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="dashboard-header">
          <h2>Transactions</h2>
          <span className="live-indicator" style={{ backgroundColor: '#ef4444' }}>● Error</span>
        </div>
        <div className="error-message" style={{ padding: '2rem', textAlign: 'center', color: '#ef4444' }}>
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>Transactions</h2>
        <span className="live-indicator">● Live</span>
      </div>

      <div className="table-wrapper">
        <table className="dashboard-table">
          <thead>
            <tr>
              <th>Validation</th>
              <th>Direction</th>
              <th>Type</th>
              <th>Stream</th>
              <th>Ref Number</th>
              <th>Ack Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr><td colSpan={7} style={{textAlign:'center', padding:'2rem'}}>No transactions found. Generate some EDI!</td></tr>
            ) : (
              transactions.map(tx => (
                <tr key={tx.id}>
                  {/* Validation */}
                  <td><span className={`badge ${getBadgeClass(tx.validation)}`}>{tx.validation}</span></td>
                  
                  {/* Direction */}
                  <td><span className={`badge ${getBadgeClass(tx.direction)}`}>{tx.direction}</span></td>
                  
                  {/* Type */}
                  <td style={{fontWeight: 600}}>{tx.type} Transaction</td>
                  
                  {/* Stream */}
                  <td>
                    <span className="stream-indicator">
                      <span className="dot-yellow">●</span> {tx.stream}
                    </span>
                  </td>

                  {/* Reference Number */}
                  <td className="mono-text">{tx.businessNum}</td>

                  {/* Ack Status */}
                  <td><span className={`badge ${getBadgeClass(tx.ackStatus)}`}>{tx.ackStatus}</span></td>
                  
                  {/* Date */}
                  <td className="date-text">{formatDate(tx.createdAt)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};