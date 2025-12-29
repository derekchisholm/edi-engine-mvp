import { useState } from 'react';
import { generateEdi940, generateEdi997, parseEdi850, type OrderData, type AckData } from './api';
import { FileMapper } from './FileMapper';

export const Workbench = () => {
  // --- Workbench State ---
  const [activeTab, setActiveTab] = useState<'940' | '997' | '850' | 'import'>('940');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<string>('');
  const [showToast, setShowToast] = useState(false);

  // 940 State
  const [po, setPo] = useState('PO-2025-001');
  const [sku, setSku] = useState('WIDGET-01');
  const [qty, setQty] = useState(10);

  // 997 State
  const [ackControlNum, setAckControlNum] = useState('10001');
  const [ackAccepted, setAckAccepted] = useState(true);

  // 850 State
  const [rawX12, setRawX12] = useState('');

  // --- Handlers ---
  const handle940Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: OrderData = {
        poNumber: po,
        shipTo: { name: "Acme Logistics", address1: "123 Business Rd", city: "Tech City", state: "CA", zip: "90210" },
        items: [{ sku: sku, quantity: Number(qty) }]
      };
      const result = await generateEdi940(payload);
      setOutput(result);
    } catch (err) {
      setOutput('Error generating 940');
    } finally { setLoading(false); }
  };

  const handle997Submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: AckData = { receivedControlNumber: ackControlNum, accepted: ackAccepted };
      const result = await generateEdi997(payload);
      setOutput(result);
    } catch (err) {
      setOutput('Error generating 997');
    } finally { setLoading(false); }
  };

  const handle850Parse = async () => {
    setLoading(true);
    try {
      const dataToSend = rawX12 || `ISA*00*...`; 
      const result = await parseEdi850(dataToSend);
      setOutput(JSON.stringify(result, null, 2));
    } catch (err) {
      setOutput('Error parsing 850.');
    } finally { setLoading(false); }
  };

  const handleBatchImport = async (mappedData: any[]) => {
    setLoading(true);
    setActiveTab('940');
    let bigOutput = '';
    try {
      for (const [index, row] of mappedData.entries()) {
        const payload: OrderData = {
            poNumber: row.poNumber || `BATCH-${index}`,
            shipTo: { 
              name: row.name || "Unknown", 
              address1: row.address || "Unknown", // Mapped from CSV 'address' to JSON 'address1'
              city: row.city || "Unknown", 
              state: row.state || "Unknown", 
              zip: row.zip || "00000" 
            },
            items: [{ sku: row.sku || "MISC", quantity: Number(row.quantity) || 1 }]
        };
        const result = await generateEdi940(payload);
        bigOutput += `\n--- ORDER ${index + 1} (${payload.poNumber}) ---\n${result}`;
      }
      setOutput(bigOutput);
      setShowToast(true);
    } catch (err) {
        setOutput("Error processing batch.");
    } finally { setLoading(false); }
  };

  // --- UI Helpers ---
  const handleCopy = () => {
    if (!output) return;
    navigator.clipboard.writeText(output);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
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

  return (
    <div className="container" style={{maxWidth: '100%', padding: 0}}>
      {/* Toast */}
      <div className={`toast ${showToast ? 'show' : ''}`}>Copied to Clipboard!</div>

      {/* Internal Workbench Tabs */}
      <div className="tabs" style={{marginBottom: '1rem'}}>
        <button className={activeTab === '940' ? 'active' : ''} onClick={() => {setActiveTab('940'); setOutput('')}}>Generate 940</button>
        <button className={activeTab === '997' ? 'active' : ''} onClick={() => {setActiveTab('997'); setOutput('')}}>Generate 997</button>
        <button className={activeTab === '850' ? 'active' : ''} onClick={() => {setActiveTab('850'); setOutput('')}}>Parse 850</button>
        <button className={activeTab === 'import' ? 'active' : ''} onClick={() => setActiveTab('import')}>Batch Import</button>
      </div>

      <div className="main-layout">
        {/* INPUT AREA */}
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
              <button disabled={loading} type="submit" className={ackAccepted ? '' : 'danger-btn'}>{ackAccepted ? 'Generate Acceptance' : 'Generate Rejection'}</button>
            </form>
          )}

          {activeTab === '850' && (
            <div>
              <h2>Parse Purchase Order</h2>
              <textarea rows={10} className="code-input" value={rawX12} onChange={e => setRawX12(e.target.value)} placeholder="Paste X12 content here..." />
              <button style={{marginTop: '1rem'}} disabled={loading} onClick={handle850Parse}>Parse to JSON</button>
            </div>
          )}

          {activeTab === 'import' && (
             <div style={{width: '100%'}}>
               <h2>Batch Processing</h2>
               <FileMapper onComplete={handleBatchImport} />
             </div>
          )}
        </div>

        {/* OUTPUT AREA */}
        {activeTab !== 'import' && (
        <div className="card output-card">
          <div className="output-header">
            <h2>Output</h2>
            <div className="output-actions">
              <button onClick={handleCopy} disabled={!output} className="secondary-btn">Copy</button>
              <button onClick={handleDownload} disabled={!output} className="secondary-btn">Download</button>
            </div>
          </div>
          <pre>{output || "Ready..."}</pre>
        </div>
        )}
      </div>
    </div>
  );
};
