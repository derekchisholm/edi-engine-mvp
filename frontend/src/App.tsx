import { useState } from 'react';
import { generateEdi940, generateEdi997, parseEdi850, type OrderData, type AckData } from './api';
import { FileMapper } from './FileMapper';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState<'940' | '997' | '850' | 'import'>('940');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>('');
  
  // Polish State: Toast Notification
  const [showToast, setShowToast] = useState(false);

  // --- 940 State ---
  const [po, setPo] = useState('PO-2025-001');
  const [sku, setSku] = useState('WIDGET-01');
  const [qty, setQty] = useState(10);

  // --- 997 State ---
  const [ackControlNum, setAckControlNum] = useState('10001');
  const [ackAccepted, setAckAccepted] = useState(true);

  // --- 850 State ---
  const [rawX12, setRawX12] = useState('');

  // --- API Handlers ---

  const handle940Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: OrderData = {
        poNumber: po,
        shipTo: { name: "Acme Logistics", address: "123 Business Rd", city: "Tech City", state: "CA", zip: "90210" },
        items: [{ sku: sku, quantity: Number(qty) }]
      };
      const result = await generateEdi940(payload);
      setOutput(result);
    } catch (err) {
      setOutput('Error generating 940');
      console.error(err);
    } finally { setLoading(false); }
  };

  const handle997Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: AckData = {
        receivedControlNumber: ackControlNum,
        accepted: ackAccepted
      };
      const result = await generateEdi997(payload);
      setOutput(result);
    } catch (err) {
      setOutput('Error generating 997');
      console.error(err);
    } finally { setLoading(false); }
  };

  const handle850Parse = async () => {
    setLoading(true);
    try {
      const dataToSend = rawX12 || `ISA*00* *00* *ZZ*SENDER...`; // (Truncated for brevity, same as before)
      const result = await parseEdi850(dataToSend);
      setOutput(JSON.stringify(result, null, 2));
    } catch (err) {
      setOutput('Error parsing 850.');
      console.error(err);
    } finally { setLoading(false); }
  };

  // --- Polish Features: Copy & Download ---

  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000); // Hide after 2 seconds
  };

  const handleDownload = () => {
    if (!output) return;
    const extension = activeTab === '850' ? 'json' : 'x12';
    const blob = new Blob([output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `edi-${activeTab}-${Date.now()}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBatchImport = async (mappedData: any[]) => {
    setLoading(true);
    setActiveTab('940');

    let bigOutput = '';

    try {
      // Iterate through mapped rows and generate EDI for each
      for (const [index, row] of mappedData.entries()) {
        const payload: OrderData = {
          poNumber: row.poNumber || `BATCH-${index}`,
          shipTo: {
            name: row.name || "Unknown",
            address: row.address || "Unknown",
            city: row.city || "Unknown",
            state: row.state || "Unknown",
            zip: row.zip || "00000"
          },
          items: [{
            sku: row.sku || "MISC",
            quantity: Number(row.quantity) || 1
          }]
        };

        const result = await generateEdi940(payload);
        bigOutput += `\n--- ORDER ${index + 1} (${payload.poNumber}) ---\n${result}`;
      }
      setOutput(bigOutput);
      setShowToast(true); // Reuse toast to say "Done"
    } catch (err) {
      console.error(err);
      setOutput("Error processing batch.");
    } finally {
      setLoading(false);
    }

  };

  // --- Render ---

  return (
    <div className="container">
      {/* Toast Notification */}
      <div className={`toast ${showToast ? 'show' : ''}`}>Copied to Clipboard!</div>

      <header>
        <h1>EDI Engine Pro</h1>
        <div className="tabs">
          <button className={activeTab === '940' ? 'active' : ''} onClick={() => {setActiveTab('940'); setOutput('')}}>Generate 940 (Ship)</button>
          <button className={activeTab === '997' ? 'active' : ''} onClick={() => {setActiveTab('997'); setOutput('')}}>Generate 997 (Ack)</button>
          <button className={activeTab === '850' ? 'active' : ''} onClick={() => {setActiveTab('850'); setOutput('')}}>Parse 850 (Order)</button>
          <button className={activeTab === 'import' ? 'active' : ''} onClick={() => setActiveTab('import')}>Batch Import</button>
        </div>
      </header>

      <div className="main-layout">
        {/* INPUT CARD */}
        <div className="card">
          {activeTab === '940' && (
            <form onSubmit={handle940Submit}>
              <h2>New Warehouse Order</h2>
              <div className="form-group"><label>PO Number</label><input value={po} onChange={e => setPo(e.target.value)} /></div>
              <div className="form-group"><label>SKU</label><input value={sku} onChange={e => setSku(e.target.value)} /></div>
              <div className="form-group"><label>Quantity</label><input type="number" value={qty} onChange={e => setQty(Number(e.target.value))} /></div>
              <button disabled={loading} type="submit">Generate 940</button>
            </form>
          )}

          {activeTab === '997' && (
            <form onSubmit={handle997Submit}>
              <h2>Send Acknowledgment</h2>
              <div className="form-group"><label>Reference Group ID</label><input value={ackControlNum} onChange={e => setAckControlNum(e.target.value)} /></div>
              <div className="form-group" style={{display:'flex', alignItems:'center', gap: '10px'}}>
                <input type="checkbox" style={{width:'auto'}} checked={ackAccepted} onChange={e => setAckAccepted(e.target.checked)} />
                <label style={{margin:0}}>Accept Transaction?</label>
              </div>
              <button disabled={loading} type="submit" className={ackAccepted ? '' : 'danger-btn'}>
                {ackAccepted ? 'Generate Acceptance' : 'Generate Rejection'}
              </button>
            </form>
          )}

          {activeTab === '850' && (
            <div>
              <h2>Parse Purchase Order</h2>
              <textarea 
                rows={10} 
                className="code-input"
                value={rawX12}
                onChange={e => setRawX12(e.target.value)}
                placeholder="Paste X12 content here..."
              />
              <button style={{marginTop: '1rem'}} disabled={loading} onClick={handle850Parse}>Parse to JSON</button>
            </div>
          )}

          {activeTab === 'import' && (
            <div className="card" style={{gridColumn: '1 / -1'}}> {/* Full width card */}
              <h2>Batch Processing</h2>
              <FileMapper onComplete={handleBatchImport} />
            </div>
          )}
        </div>

        {/* OUTPUT CARD */}
        <div className="card output-card">
          <div className="output-header">
            <h2>{activeTab === '850' ? 'JSON Result' : 'X12 Output'}</h2>
            {/* ACTION BUTTONS */}
            <div className="output-actions">
              <button onClick={handleCopy} disabled={!output} className="secondary-btn">Copy</button>
              <button onClick={handleDownload} disabled={!output} className="secondary-btn">Download</button>
            </div>
          </div>
          <pre>{output || "Ready..."}</pre>
        </div>
      </div>
    </div>
  );
}

export default App;