import { useState } from 'react';
import { XIcon } from '@/components/icons';
import { api } from '@/services/api';

interface PaymentMethod {
  id: string;
  type: 'mpesa' | 'bank' | 'airtel';
  name: string;
  icon: string;
  accountNumber: string;
  accountName: string;
  bankName?: string;
  fee: number;
  feeType: 'fixed' | 'percentage';
  processingTime: string;
  processingTimeValue: number;
  recommended?: boolean;
  limits: { min: number; max: number };
  verified: boolean;
}

interface WithdrawalModalProps {
  isOpen: boolean;
  onClose: () => void;
  availableBalance?: number;
  paymentMethods?: PaymentMethod[];
}

export function WithdrawalModal({
  isOpen,
  onClose,
  availableBalance = 0,
  paymentMethods: externalPaymentMethods
}: WithdrawalModalProps) {
  const [step, setStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [withdrawalAmount, setWithdrawalAmount] = useState<string | number>('');
  const [customAmount, setCustomAmount] = useState('');
  const [scheduledDate, setScheduledDate] = useState<string | null>(null);
  const [isScheduled, setIsScheduled] = useState(false);
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Payment methods - empty by default (user needs to add their own)
  const [paymentMethods] = useState<PaymentMethod[]>(externalPaymentMethods || []);

  const quickAmounts = [5000, 10000, 20000, 50000];

  const calculateFees = (amount: number, method: PaymentMethod | null) => {
    if (!method || !amount) return { platformFee: 0, methodFee: 0, totalFees: 0, netAmount: 0 };

    const platformFeePercentage = 0.02;
    const platformFee = Math.round(amount * platformFeePercentage);

    let methodFee = 0;
    if (method.feeType === 'percentage') {
      methodFee = Math.round(amount * (method.fee / 100));
    } else {
      methodFee = method.fee;
    }

    const totalFees = platformFee + methodFee;
    const netAmount = amount - totalFees;

    return {
      platformFee,
      methodFee,
      totalFees,
      netAmount: netAmount > 0 ? netAmount : 0
    };
  };

  const validateAmount = (amount: string | number, method: PaymentMethod | null) => {
    const newErrors: Record<string, string> = {};
    const numAmount = parseFloat(String(amount));

    if (!amount || amount === '') {
      newErrors.amount = 'Please enter an amount';
    } else if (isNaN(numAmount) || numAmount <= 0) {
      newErrors.amount = 'Please enter a valid amount';
    } else if (numAmount > availableBalance) {
      newErrors.amount = `Insufficient balance (Available: KES ${availableBalance.toLocaleString()})`;
    } else if (method && numAmount < method.limits.min) {
      newErrors.amount = `Minimum withdrawal: KES ${method.limits.min.toLocaleString()}`;
    } else if (method && numAmount > method.limits.max) {
      newErrors.amount = `Maximum withdrawal: KES ${method.limits.max.toLocaleString()}`;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleAmountSelect = (amount: number) => {
    setWithdrawalAmount(amount);
    setCustomAmount('');
    validateAmount(amount, selectedMethod);
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setWithdrawalAmount(value);
    validateAmount(value, selectedMethod);
  };

  const processWithdrawal = async () => {
    if (!agreeToTerms) {
      setErrors({ terms: 'Please accept the terms and conditions' });
      return;
    }

    if (!selectedMethod) {
      setErrors({ general: 'Please select a payment method' });
      return;
    }

    const amount = parseFloat(String(withdrawalAmount));
    if (!amount || amount <= 0) {
      setErrors({ amount: 'Please enter a valid amount' });
      return;
    }

    setProcessing(true);
    setErrors({});

    try {
      const res = await api.requestWithdrawal(amount, selectedMethod.id);

      if (res.success) {
      handleClose();
        alert(`✅ Withdrawal processed successfully!\n\nAmount: KES ${calculateFees(amount, selectedMethod).netAmount.toLocaleString()}\nMethod: ${selectedMethod.name}\nReference: ${res.data?.reference || `WD-${Date.now()}`}`);
      } else {
        setErrors({ general: res.error || 'Withdrawal failed. Please try again.' });
      }
    } catch (error) {
      setErrors({ general: error instanceof Error ? error.message : 'Withdrawal failed. Please try again.' });
    } finally {
      setProcessing(false);
    }
  };

  const handleClose = () => {
    setStep(1);
    setSelectedMethod(null);
    setWithdrawalAmount('');
    setCustomAmount('');
    setIsScheduled(false);
    setScheduledDate(null);
    setAgreeToTerms(false);
    setErrors({});
    onClose();
  };

  if (!isOpen) return null;

  const fees = calculateFees(parseFloat(String(withdrawalAmount)) || 0, selectedMethod);

  return (
    <>
      <style>{`
        @keyframes modalFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes modalSlideUp {
          from { transform: translateY(50px) scale(0.95); opacity: 0; }
          to { transform: translateY(0) scale(1); opacity: 1; }
        }
        .withdrawal-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 1rem;
          animation: modalFadeIn 0.3s ease;
        }
        .withdrawal-modal-content {
          background: white;
          border-radius: 16px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: modalSlideUp 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .withdrawal-modal-header {
          padding: 2rem;
          border-bottom: 2px solid #e2e8f0;
          position: sticky;
          top: 0;
          background: white;
          z-index: 10;
          border-radius: 16px 16px 0 0;
        }
        .withdrawal-modal-body { padding: 2rem; }
        .withdrawal-modal-footer {
          padding: 1.5rem 2rem;
          border-top: 2px solid #e2e8f0;
          display: flex;
          gap: 1rem;
          position: sticky;
          bottom: 0;
          background: white;
          border-radius: 0 0 16px 16px;
        }
        .withdrawal-step-indicator {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 2rem;
        }
        .withdrawal-step-dot {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #e2e8f0;
          transition: all 0.3s;
        }
        .withdrawal-step-dot.active {
          background: #254E58;
          transform: scale(1.2);
        }
        .withdrawal-step-dot.completed { background: #5d2ba3; }
        .withdrawal-payment-method-card {
          border: 3px solid #e2e8f0;
          border-radius: 12px;
          padding: 1.5rem;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.3s;
          position: relative;
        }
        .withdrawal-payment-method-card:hover {
          border-color: #254E58;
          box-shadow: 0 4px 12px rgba(37, 78, 88, 0.2);
          transform: translateY(-2px);
        }
        .withdrawal-payment-method-card.selected {
          border-color: #254E58;
          background: linear-gradient(135deg, rgba(37, 78, 88, 0.05) 0%, rgba(37, 78, 88, 0.02) 100%);
        }
        .withdrawal-payment-method-card.disabled {
          opacity: 0.5;
          cursor: not-allowed;
          pointer-events: none;
        }
        .withdrawal-recommended-badge {
          position: absolute;
          top: -10px;
          right: 1rem;
          background: linear-gradient(135deg, #5d2ba3 0%, #3d1a7a 100%);
          color: white;
          padding: 0.25rem 0.75rem;
          border-radius: 12px;
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.5px;
        }
        .withdrawal-amount-preset {
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
          cursor: pointer;
          transition: all 0.2s;
          font-weight: 600;
        }
        .withdrawal-amount-preset:hover {
          border-color: #254E58;
          background: rgba(37, 78, 88, 0.05);
        }
        .withdrawal-amount-preset.selected {
          border-color: #254E58;
          background: #254E58;
          color: white;
        }
        .withdrawal-input-group { position: relative; }
        .withdrawal-input-prefix {
          position: absolute;
          left: 1rem;
          top: 50%;
          transform: translateY(-50%);
          font-weight: 600;
          color: #64748b;
          pointer-events: none;
        }
        .withdrawal-input-with-prefix { padding-left: 3rem; }
        .withdrawal-error-message {
          color: #4F4A41;
          font-size: 0.875rem;
          margin-top: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .withdrawal-success-message {
          color: #5d2ba3;
          font-size: 0.875rem;
          margin-top: 0.5rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }
        .withdrawal-fee-breakdown {
          background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
          border-radius: 12px;
          padding: 1.5rem;
          margin-top: 1.5rem;
        }
        .withdrawal-fee-row {
          display: flex;
          justify-content: space-between;
          padding: 0.75rem 0;
          border-bottom: 1px solid #e2e8f0;
        }
        .withdrawal-fee-row:last-child {
          border-bottom: none;
          padding-top: 1rem;
          font-size: 1.125rem;
          font-weight: 700;
        }
        .withdrawal-info-card {
          background: rgba(37, 78, 88, 0.1);
          border-left: 4px solid #254E58;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1rem;
        }
        .withdrawal-warning-card {
          background: rgba(110, 102, 88, 0.1);
          border-left: 4px solid #6E6658;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1rem;
        }
        .withdrawal-checkbox-container {
          display: flex;
          align-items: start;
          gap: 0.75rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .withdrawal-checkbox-container:hover { background: #f1f5f9; }
        .withdrawal-checkbox {
          width: 20px;
          height: 20px;
          min-width: 20px;
          border: 2px solid #cbd5e1;
          border-radius: 4px;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .withdrawal-checkbox.checked {
          background: #254E58;
          border-color: #254E58;
        }
        .withdrawal-spinner {
          border: 3px solid #f3f4f6;
          border-top: 3px solid #254E58;
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 640px) {
          .withdrawal-modal-content {
            max-width: 100%;
            margin: 0;
            border-radius: 16px 16px 0 0;
            max-height: 95vh;
          }
          .withdrawal-modal-overlay {
            align-items: flex-end;
            padding: 0;
          }
        }
      `}</style>

      <div className="withdrawal-modal-overlay" onClick={handleClose}>
        <div className="withdrawal-modal-content" onClick={(e) => e.stopPropagation()}>
          {/* Header */}
          <div className="withdrawal-modal-header">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h2 style={{ fontSize: '1.75rem', fontWeight: '700', marginBottom: '0.5rem', color: '#0f172a' }}>
                  💸 Withdraw Funds
                </h2>
                <p style={{ color: '#64748b', fontSize: '0.875rem' }}>
                  {step === 1 && 'Select your preferred payment method'}
                  {step === 2 && 'Enter withdrawal amount'}
                  {step === 3 && 'Review and confirm withdrawal'}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-10 h-10 rounded-null-full bg-gray-100 text-gray-500 hover:bg-gray-200 flex items-center justify-center transition"
              >
                <XIcon size={20} />
              </button>
            </div>

            {/* Step Indicator */}
            <div className="withdrawal-step-indicator">
              <div className={`withdrawal-step-dot ${step >= 1 ? 'active' : ''} ${step > 1 ? 'completed' : ''}`} />
              <div className={`withdrawal-step-dot ${step >= 2 ? 'active' : ''} ${step > 2 ? 'completed' : ''}`} />
              <div className={`withdrawal-step-dot ${step >= 3 ? 'active' : ''}`} />
            </div>
          </div>

          {/* Body */}
          <div className="withdrawal-modal-body">
            {/* Available Balance Display */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              padding: '1.5rem',
              borderRadius: '12px',
              marginBottom: '2rem'
            }}>
              <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
                Available Balance
              </div>
              <div style={{ fontSize: '2.5rem', fontWeight: '700' }}>
                KES {availableBalance.toLocaleString()}
              </div>
            </div>

            {/* Step 1: Select Payment Method */}
            {step === 1 && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1.5rem', color: '#0f172a' }}>
                  Select Payment Method
                </h3>

                {paymentMethods.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '3rem 1rem',
                    background: '#f8fafc',
                    borderRadius: '12px',
                    border: '2px dashed #e2e8f0'
                  }}>
                    <p style={{ fontSize: '3rem', marginBottom: '1rem' }}>💳</p>
                    <h4 style={{ fontWeight: '700', color: '#0f172a', marginBottom: '0.5rem' }}>
                      No Payment Methods
                    </h4>
                    <p style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '1rem' }}>
                      Add a payment method to start withdrawing funds
                    </p>
                    <button
                      style={{
                        padding: '0.75rem 1.5rem',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                      onClick={() => alert('Add payment method functionality coming soon')}
                    >
                      + Add Payment Method
                    </button>
                  </div>
                ) : (
                  <>
                    {paymentMethods.map(method => (
                      <div
                        key={method.id}
                        className={`withdrawal-payment-method-card ${selectedMethod?.id === method.id ? 'selected' : ''} ${!method.verified ? 'disabled' : ''}`}
                        onClick={() => method.verified && setSelectedMethod(method)}
                      >
                        {method.recommended && (
                          <div className="withdrawal-recommended-badge">⭐ RECOMMENDED</div>
                        )}

                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'start' }}>
                          <div style={{
                            width: '56px',
                            height: '56px',
                            background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                            borderRadius: '12px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '2rem'
                          }}>
                            {method.icon}
                          </div>

                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
                              <h4 style={{ fontSize: '1.125rem', fontWeight: '700', color: '#0f172a' }}>
                                {method.name}
                              </h4>
                              {method.verified && (
                                <span style={{ color: '#10b981', fontSize: '1rem' }}>✓</span>
                              )}
                            </div>

                            <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                              {method.accountNumber}
                            </div>

                            {method.bankName && (
                              <div style={{ color: '#64748b', fontSize: '0.875rem', marginBottom: '0.5rem' }}>
                                {method.bankName}
                              </div>
                            )}

                            <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.75rem', flexWrap: 'wrap' }}>
                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                  Processing Time
                                </div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                                  {method.processingTime}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                  Fee
                                </div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                                  {method.fee === 0 ? 'Free' : `${method.fee}${method.feeType === 'percentage' ? '%' : ' KES'}`}
                                </div>
                              </div>

                              <div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '0.25rem' }}>
                                  Limits
                                </div>
                                <div style={{ fontSize: '0.875rem', fontWeight: '600', color: '#0f172a' }}>
                                  {method.limits.min.toLocaleString()} - {method.limits.max.toLocaleString()}
                                </div>
                              </div>
                            </div>

                            {!method.verified && (
                              <div style={{
                                marginTop: '0.75rem',
                                padding: '0.5rem',
                                background: 'rgba(245, 158, 11, 0.1)',
                                borderRadius: '6px',
                                fontSize: '0.875rem',
                                color: '#f59e0b',
                                fontWeight: '600'
                              }}>
                                ⚠️ Verification required
                              </div>
                            )}
                          </div>

                          {selectedMethod?.id === method.id && (
                            <div style={{
                              width: '24px',
                              height: '24px',
                              background: '#3b82f6',
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: 'white',
                              fontSize: '0.875rem',
                              fontWeight: '700'
                            }}>
                              ✓
                            </div>
                          )}
                        </div>
                      </div>
                    ))}

                    <button
                      style={{
                        width: '100%',
                        padding: '1rem',
                        border: '2px dashed #cbd5e1',
                        background: 'white',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        fontWeight: '600',
                        color: '#64748b',
                        fontSize: '0.875rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '0.5rem',
                        marginTop: '1rem'
                      }}
                      onClick={() => alert('Add payment method functionality coming soon')}
                    >
                      <span style={{ fontSize: '1.25rem' }}>+</span>
                      Add New Payment Method
                    </button>
                  </>
                )}
              </div>
            )}

            {/* Step 2: Enter Amount */}
            {step === 2 && selectedMethod && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1rem', color: '#0f172a' }}>
                  Enter Amount to Withdraw
                </h3>

                {/* Quick Amount Presets */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: '0.75rem',
                  marginBottom: '1.5rem'
                }}>
                  {quickAmounts.map(amount => (
                    <button
                      key={amount}
                      className={`withdrawal-amount-preset ${withdrawalAmount === amount ? 'selected' : ''}`}
                      onClick={() => handleAmountSelect(amount)}
                      disabled={amount > availableBalance}
                      style={{ opacity: amount > availableBalance ? 0.5 : 1 }}
                    >
                      {amount >= 1000 ? `${amount / 1000}K` : amount}
                    </button>
                  ))}
                </div>

                {/* Custom Amount Input */}
                <div className="withdrawal-input-group" style={{ marginBottom: '1rem' }}>
                  <div className="withdrawal-input-prefix">KES</div>
                  <input
                    type="number"
                    className="withdrawal-input-with-prefix"
                    value={customAmount}
                    onChange={(e) => handleCustomAmountChange(e.target.value)}
                    placeholder="Enter custom amount"
                    style={{
                      width: '100%',
                      padding: '1rem',
                      border: `2px solid ${errors.amount ? '#ef4444' : '#e2e8f0'}`,
                      borderRadius: '8px',
                      fontSize: '1rem',
                      fontWeight: '600',
                      transition: 'all 0.2s'
                    }}
                  />
                </div>

                {/* All Available Button */}
                <button
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '2px solid #3b82f6',
                    background: 'white',
                    color: '#3b82f6',
                    borderRadius: '8px',
                    fontWeight: '600',
                    cursor: availableBalance > 0 ? 'pointer' : 'not-allowed',
                    marginBottom: '1rem',
                    transition: 'all 0.2s',
                    opacity: availableBalance > 0 ? 1 : 0.5
                  }}
                  onClick={() => availableBalance > 0 && handleAmountSelect(availableBalance)}
                  disabled={availableBalance <= 0}
                >
                  Withdraw All (KES {availableBalance.toLocaleString()})
                </button>

                {errors.amount && (
                  <div className="withdrawal-error-message">
                    <span>⚠️</span>
                    {errors.amount}
                  </div>
                )}

                {withdrawalAmount && !errors.amount && (
                  <div className="withdrawal-success-message">
                    <span>✓</span>
                    Amount is valid
                  </div>
                )}

                {/* Fee Breakdown */}
                {withdrawalAmount && !errors.amount && (
                  <div className="withdrawal-fee-breakdown">
                    <h4 style={{ fontSize: '1rem', fontWeight: '700', marginBottom: '1rem', color: '#0f172a' }}>
                      Fee Breakdown
                    </h4>

                    <div className="withdrawal-fee-row">
                      <span style={{ color: '#64748b' }}>Withdrawal Amount</span>
                      <span style={{ fontWeight: '600', color: '#0f172a' }}>
                        KES {parseFloat(String(withdrawalAmount)).toLocaleString()}
                      </span>
                    </div>

                    <div className="withdrawal-fee-row">
                      <span style={{ color: '#64748b' }}>Platform Fee (2%)</span>
                      <span style={{ fontWeight: '600', color: '#ef4444' }}>
                        - KES {fees.platformFee.toLocaleString()}
                      </span>
                    </div>

                    {fees.methodFee > 0 && (
                      <div className="withdrawal-fee-row">
                        <span style={{ color: '#64748b' }}>{selectedMethod.name} Fee</span>
                        <span style={{ fontWeight: '600', color: '#ef4444' }}>
                          - KES {fees.methodFee.toLocaleString()}
                        </span>
                      </div>
                    )}

                    <div className="withdrawal-fee-row">
                      <span style={{ color: '#10b981' }}>You'll Receive</span>
                      <span style={{ color: '#10b981' }}>
                        KES {fees.netAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                )}

                {/* Scheduling Option */}
                <div style={{ marginTop: '1.5rem' }}>
                  <div
                    className="withdrawal-checkbox-container"
                    onClick={() => setIsScheduled(!isScheduled)}
                  >
                    <div className={`withdrawal-checkbox ${isScheduled ? 'checked' : ''}`}>
                      {isScheduled && <span style={{ color: 'white', fontSize: '0.875rem' }}>✓</span>}
                    </div>
                    <div>
                      <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '0.25rem' }}>
                        Schedule withdrawal
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                        Process this withdrawal at a later date
                      </div>
                    </div>
                  </div>

                  {isScheduled && (
                    <input
                      type="datetime-local"
                      value={scheduledDate || ''}
                      onChange={(e) => setScheduledDate(e.target.value)}
                      min={new Date().toISOString().slice(0, 16)}
                      style={{
                        width: '100%',
                        padding: '1rem',
                        border: '2px solid #e2e8f0',
                        borderRadius: '8px',
                        marginTop: '1rem',
                        fontSize: '0.875rem'
                      }}
                    />
                  )}
                </div>

                {/* Info Card */}
                <div className="withdrawal-info-card">
                  <div style={{ fontSize: '0.875rem', color: '#3b82f6' }}>
                    <strong>ℹ️ Processing Time:</strong> {selectedMethod.processingTime}
                    {isScheduled && scheduledDate && (
                      <div style={{ marginTop: '0.5rem' }}>
                        Scheduled for: {new Date(scheduledDate).toLocaleString()}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirm */}
            {step === 3 && selectedMethod && withdrawalAmount && (
              <div>
                <h3 style={{ fontSize: '1.125rem', fontWeight: '700', marginBottom: '1.5rem', color: '#0f172a' }}>
                  Confirm Withdrawal
                </h3>

                {/* Summary Card */}
                <div style={{
                  background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                  borderRadius: '12px',
                  padding: '1.5rem',
                  marginBottom: '1.5rem'
                }}>
                  <div style={{ marginBottom: '1.5rem' }}>
                    <div style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '0.5rem' }}>
                      Payment Method
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div style={{ fontSize: '2rem' }}>{selectedMethod.icon}</div>
                      <div>
                        <div style={{ fontWeight: '700', fontSize: '1.125rem', color: '#0f172a' }}>
                          {selectedMethod.name}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: '#64748b' }}>
                          {selectedMethod.accountNumber}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{
                    height: '2px',
                    background: 'linear-gradient(90deg, transparent 0%, #cbd5e1 50%, transparent 100%)',
                    margin: '1.5rem 0'
                  }} />

                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Withdrawal Amount</span>
                      <span style={{ fontWeight: '700', color: '#0f172a' }}>
                        KES {parseFloat(String(withdrawalAmount)).toLocaleString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Total Fees</span>
                      <span style={{ fontWeight: '600', color: '#ef4444' }}>
                        - KES {fees.totalFees.toLocaleString()}
                      </span>
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      paddingTop: '1rem',
                      borderTop: '2px solid #e2e8f0'
                    }}>
                      <span style={{ fontWeight: '700', fontSize: '1.125rem', color: '#10b981' }}>
                        You'll Receive
                      </span>
                      <span style={{ fontWeight: '700', fontSize: '1.5rem', color: '#10b981' }}>
                        KES {fees.netAmount.toLocaleString()}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Processing Time</span>
                      <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#0f172a' }}>
                        {selectedMethod.processingTime}
                      </span>
                    </div>

                    {isScheduled && scheduledDate && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#64748b', fontSize: '0.875rem' }}>Scheduled For</span>
                        <span style={{ fontWeight: '600', fontSize: '0.875rem', color: '#0f172a' }}>
                          {new Date(scheduledDate).toLocaleString()}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms & Conditions */}
                <div
                  className="withdrawal-checkbox-container"
                  onClick={() => setAgreeToTerms(!agreeToTerms)}
                >
                  <div className={`withdrawal-checkbox ${agreeToTerms ? 'checked' : ''}`}>
                    {agreeToTerms && <span style={{ color: 'white', fontSize: '0.875rem' }}>✓</span>}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#64748b', lineHeight: '1.6' }}>
                    I understand that this withdrawal cannot be cancelled once processed. I agree to the{' '}
                    <a href="#" style={{ color: '#3b82f6', textDecoration: 'none', fontWeight: '600' }}>
                      terms and conditions
                    </a>
                    {' '}and confirm all details are correct.
                  </div>
                </div>

                {errors.terms && (
                  <div className="withdrawal-error-message">
                    <span>⚠️</span>
                    {errors.terms}
                  </div>
                )}

                {errors.general && (
                  <div className="withdrawal-error-message">
                    <span>⚠️</span>
                    {errors.general}
                  </div>
                )}

                {/* Warning Card */}
                <div className="withdrawal-warning-card">
                  <div style={{ fontSize: '0.875rem', color: '#92400e', lineHeight: '1.6' }}>
                    <strong>⚠️ Important:</strong> Funds will be sent to{' '}
                    <strong>{selectedMethod.accountNumber}</strong>. Please ensure this is correct as{' '}
                    {isScheduled ? 'scheduled ' : ''}withdrawals cannot be reversed.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="withdrawal-modal-footer">
            <button
              onClick={() => {
                if (step > 1) {
                  setStep(step - 1);
                  setErrors({});
                } else {
                  handleClose();
                }
              }}
              disabled={processing}
              style={{
                flex: 1,
                padding: '1rem',
                border: '2px solid #e2e8f0',
                background: 'white',
                borderRadius: '8px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.2s',
                opacity: processing ? 0.5 : 1
              }}
            >
              {step === 1 ? 'Cancel' : 'Back'}
            </button>

            <button
              onClick={() => {
                if (step === 1 && selectedMethod) {
                  setStep(2);
                } else if (step === 2 && validateAmount(withdrawalAmount, selectedMethod)) {
                  setStep(3);
                } else if (step === 3) {
                  processWithdrawal();
                }
              }}
              disabled={
                (step === 1 && !selectedMethod) ||
                (step === 2 && (!withdrawalAmount || !!errors.amount)) ||
                (step === 3 && !agreeToTerms) ||
                processing
              }
              style={{
                flex: 2,
                padding: '1rem',
                border: 'none',
                background: processing ? '#94a3b8' : 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                color: 'white',
                borderRadius: '8px',
                fontWeight: '700',
                cursor: processing ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                opacity: (
                  (step === 1 && !selectedMethod) ||
                  (step === 2 && (!withdrawalAmount || !!errors.amount)) ||
                  (step === 3 && !agreeToTerms)
                ) ? 0.5 : 1
              }}
            >
              {processing ? (
                <>
                  <div className="withdrawal-spinner" />
                  Processing...
                </>
              ) : (
                <>
                  {step === 1 && 'Continue'}
                  {step === 2 && 'Review Withdrawal'}
                  {step === 3 && '✓ Confirm & Withdraw'}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
