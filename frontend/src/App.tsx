import { useState } from 'react';
import { generateEdi, type OrderData } from './api';
import './App.css';

function App() {
  const [loading, setLoading] = useState(false);
  const [ediOutput, setEdiOutput] = useState<string>('');
  
  // Simple state for the form
  const [po, setPo] = useState('PO-2025-001');
  const [sku, setSku] = useState('WIDGET-01');
  const [qty, setQty] = useState(10);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setEdiOutput('');

    // Construct the payload matching your Backend Schema
    const payload: OrderData = {
      poNumber: po,
      shipTo: {
        name: "Acme Logistics",
        address: "123 Business Rd",
        city: "Tech City",
        state: "CA",
        zip: "90210"
      },
      items: [
        { sku: sku, quantity: Number(qty) }
      ]
    };

    try {
      const result = await generateEdi(payload);
      setEdiOutput(result);
    } catch (error) {
      console.error(error);
      setEdiOutput('Error connecting to API. Is the backend running?');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = () => {
    const blob = new Blob([ediOutput], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${po}.x12`; // Name the file after the PO
    a.click();
  };

  return (
    <div className="container">
      <header>
        <h1>EDI Generator 940</h1>
        <p>Convert Orders to X12 Format</p>
      </header>

      <div className="main-layout">
        {/* Left: The Input Form */}
        <div className="card">
          <h2>New Order</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>PO Number</label>
              <input value={po} onChange={e => setPo(e.target.value)} />
            </div>
            
            <div className="form-group">
              <label>SKU</label>
              <input value={sku} onChange={e => setSku(e.target.value)} />
            </div>

            <div className="form-group">
              <label>Quantity</label>
              <input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} />
            </div>

            <button type="submit" disabled={loading}>
              {loading ? 'Generating...' : 'Generate EDI File'}
            </button>
          </form>
        </div>

        {/* Right: The Output */}
        <div className="card output-card">
          <div className="output-header">
            <h2>X12 Output</h2>
            {ediOutput && (
              <button className="download-btn" onClick={downloadFile}>
                Download .x12
              </button>
            )}
          </div>
          <pre>{ediOutput || "Waiting for input..."}</pre>
        </div>
      </div>
    </div>
  );
}

export default App;