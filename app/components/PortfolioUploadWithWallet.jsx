'use client'

import { useState } from 'react';
import WalletSelector from './WalletSelector';

/**
 * PortfolioUploadWithWallet Component
 * Upload de portfolio CSV con selección de wallet
 */
export default function PortfolioUploadWithWallet({ userId, apiUrl, onSuccess }) {
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setUploadStatus(null);
  };

  const handleUpload = async () => {
    if (!selectedWallet) {
      setUploadStatus({
        type: 'error',
        message: 'Please select a wallet first'
      });
      return;
    }

    if (!file) {
      setUploadStatus({
        type: 'error',
        message: 'Please select a file'
      });
      return;
    }

    try {
      setUploading(true);
      setUploadStatus(null);

      const formData = new FormData();
      formData.append('file', file);
      formData.append('userId', userId);
      formData.append('walletId', selectedWallet.id);

      const response = await fetch(`${apiUrl}/api/portfolio/upload`, {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setUploadStatus({
        type: 'success',
        message: `Successfully uploaded ${data.positions} positions to ${selectedWallet.name}!`
      });

      // Reset form
      setFile(null);
      if (onSuccess) onSuccess();

    } catch (error) {
      console.error('Upload error:', error);
      setUploadStatus({
        type: 'error',
        message: error.message,
        details: error.details
      });
    } finally {
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    window.open(`${apiUrl}/api/portfolio/template`, '_blank');
  };

  return (
    <div className="portfolio-upload">
      <h3>📤 Upload Portfolio</h3>

      {/* Step 1: Select Wallet */}
      <div className="upload-step">
        <div className="step-number">1</div>
        <div className="step-content">
          <WalletSelector
            userId={userId}
            onWalletSelect={setSelectedWallet}
            selectedWalletId={selectedWallet?.id}
            apiUrl={apiUrl}
          />
        </div>
      </div>

      {/* Step 2: Choose File */}
      <div className="upload-step">
        <div className="step-number">2</div>
        <div className="step-content">
          <label htmlFor="file-upload" className="file-label">
            Choose CSV File
          </label>
          <input
            id="file-upload"
            type="file"
            accept=".csv"
            onChange={handleFileChange}
            disabled={!selectedWallet || uploading}
            className="file-input"
          />
          {file && (
            <div className="file-selected">
              📄 {file.name} ({(file.size / 1024).toFixed(1)} KB)
            </div>
          )}
          <button
            onClick={downloadTemplate}
            className="template-button"
            type="button"
          >
            📥 Download Template
          </button>
        </div>
      </div>

      {/* Step 3: Upload */}
      <div className="upload-step">
        <div className="step-number">3</div>
        <div className="step-content">
          <button
            onClick={handleUpload}
            disabled={!selectedWallet || !file || uploading}
            className="upload-button"
          >
            {uploading ? (
              <>
                <span className="spinner-small"></span>
                Uploading...
              </>
            ) : (
              <>🚀 Upload to {selectedWallet?.name || 'Wallet'}</>
            )}
          </button>
        </div>
      </div>

      {/* Upload Status */}
      {uploadStatus && (
        <div className={`upload-status ${uploadStatus.type}`}>
          <span className="status-icon">
            {uploadStatus.type === 'success' ? '✅' : '⚠️'}
          </span>
          <div className="status-content">
            <div className="status-message">{uploadStatus.message}</div>
            {uploadStatus.details && (
              <div className="status-details">
                {uploadStatus.details.map((detail, i) => (
                  <div key={i}>{detail}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Format Info */}
      <div className="format-info">
        <strong>CSV Format:</strong>
        <br />
        Asset, Amount, Buy Price, Purchase Date, Notes, Transaction ID
        <br />
        <small>
          Supported assets: bitcoin, ethereum, solana, cardano, ripple, polkadot,
          dogecoin, binancecoin, avalanche-2, chainlink (or BTC, ETH, SOL, etc.)
        </small>
      </div>

      <style jsx>{`
        .portfolio-upload {
          background: #1e293b;
          border-radius: 12px;
          padding: 24px;
          border: 1px solid #334155;
        }

        .portfolio-upload h3 {
          margin: 0 0 24px;
          font-size: 18px;
          font-weight: 700;
          color: #f8fafc;
        }

        .upload-step {
          display: flex;
          gap: 16px;
          margin-bottom: 20px;
          align-items: flex-start;
        }

        .step-number {
          width: 32px;
          height: 32px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          color: white;
          flex-shrink: 0;
        }

        .step-content {
          flex: 1;
        }

        .file-label {
          display: block;
          font-weight: 600;
          font-size: 14px;
          color: #e2e8f0;
          margin-bottom: 8px;
        }

        .file-input {
          width: 100%;
          padding: 12px;
          background: #0f172a;
          border: 1px solid #334155;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 14px;
          cursor: pointer;
        }

        .file-input:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .file-selected {
          margin-top: 8px;
          padding: 8px 12px;
          background: rgba(99, 102, 241, 0.1);
          border: 1px solid rgba(99, 102, 241, 0.3);
          border-radius: 6px;
          font-size: 13px;
          color: #a5b4fc;
        }

        .template-button {
          margin-top: 12px;
          padding: 10px 16px;
          background: #334155;
          border: none;
          border-radius: 8px;
          color: #e2e8f0;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          width: 100%;
        }

        .template-button:hover {
          background: #475569;
        }

        .upload-button {
          width: 100%;
          padding: 14px 20px;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }

        .upload-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .upload-button:hover:not(:disabled) {
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }

        .spinner-small {
          width: 14px;
          height: 14px;
          border: 2px solid rgba(255, 255, 255, 0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        .upload-status {
          display: flex;
          gap: 12px;
          padding: 16px;
          border-radius: 8px;
          margin-top: 20px;
          align-items: flex-start;
        }

        .upload-status.success {
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.3);
        }

        .upload-status.error {
          background: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.3);
        }

        .status-icon {
          font-size: 20px;
        }

        .status-content {
          flex: 1;
        }

        .status-message {
          font-size: 14px;
          font-weight: 600;
          color: #f8fafc;
          margin-bottom: 4px;
        }

        .status-details {
          font-size: 12px;
          color: #94a3b8;
          margin-top: 8px;
        }

        .format-info {
          margin-top: 24px;
          padding: 16px;
          background: #0f172a;
          border-radius: 8px;
          font-size: 13px;
          color: #94a3b8;
          line-height: 1.6;
        }

        .format-info strong {
          color: #e2e8f0;
        }

        .format-info small {
          font-size: 11px;
          color: #64748b;
        }
      `}</style>
    </div>
  );
}
