import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import {
  IndianRupee,
  Plus,
  Search,
  FileText,
  Trash2,
  X,
  CreditCard,
  Printer,
  MessageCircle,
  Mail,
  QrCode
} from 'lucide-react';
import { generateReceiptPDF, exportToExcel } from '../../utils/exportHelpers';

interface Member {
  _id: string;
  name: string;
  phone: string;
  remainingAmount: number;
}

interface Payment {
  _id: string;
  memberId: {
    _id: string;
    name: string;
    phone: string;
    remainingAmount: number;
  } | null;
  amount: number;
  pendingAmount: number;
  paymentMethod: 'cash' | 'card' | 'upi';
  receiptNumber: string;
  paymentDate: string;
  notes: string;
}

interface ReceiptDetails {
  receiptNumber: string;
  paymentDate: string;
  amount: number;
  pendingAmount: number;
  paymentMethod: string;
  notes: string;
  member: {
    name: string;
    phone: string;
    address: string;
  } | null;
  branding: {
    logo?: string;
    gymName: string;
    address: string;
    contactNumber: string;
  };
}

export const PaymentsTracker: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { showToast } = useNotification();

  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'upi'>('upi');
  const [notes, setNotes] = useState('');
  const [logging, setLogging] = useState(false);

  // Receipt Modal
  const [receipt, setReceipt] = useState<ReceiptDetails | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [loadingReceipt, setLoadingReceipt] = useState(false);

  useEffect(() => {
    loadPaymentsData();
  }, []);

  const loadPaymentsData = async () => {
    setLoading(true);
    try {
      const [paymentsData, membersData] = await Promise.all([
        api.get('/payments'),
        api.get('/members')
      ]);
      setPayments(paymentsData);
      setMembers(membersData);
    } catch (err: any) {
      showToast(err.message || 'Error fetching payment parameters.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !amount || amount <= 0) {
      showToast('Please specify a valid member and amount.', 'error');
      return;
    }
    setLogging(true);
    try {
      await api.post('/payments', {
        memberId: selectedMemberId,
        amount,
        paymentMethod,
        notes
      });
      showToast('Payment transaction recorded successfully.', 'success');
      setShowAddModal(false);
      resetAddForm();
      loadPaymentsData();
    } catch (err: any) {
      showToast(err.message || 'Failed to record transaction.', 'error');
    } finally {
      setLogging(false);
    }
  };

  const handleFetchReceipt = async (id: string) => {
    setLoadingReceipt(true);
    setShowReceiptModal(true);
    try {
      const data = await api.get(`/payments/${id}/receipt`);
      setReceipt(data);
    } catch (err: any) {
      showToast(err.message || 'Failed to load receipt details.', 'error');
      setShowReceiptModal(false);
    } finally {
      setLoadingReceipt(false);
    }
  };

  const handleDeletePayment = async (id: string) => {
    if (!window.confirm('Delete payment record? This soft-deletes the transaction from ledger.')) return;
    try {
      await api.delete(`/payments/${id}`);
      showToast('Payment transaction deleted.', 'success');
      setPayments(prev => prev.filter(p => p._id !== id));
    } catch (err: any) {
      showToast(err.message || 'Failed to delete transaction.', 'error');
    }
  };

  const resetAddForm = () => {
    setSelectedMemberId('');
    setAmount(0);
    setPaymentMethod('upi');
    setNotes('');
  };

  const handlePrint = () => {
    if (receipt) {
      generateReceiptPDF(receipt);
    }
  };

  const handleShareWhatsApp = () => {
    if (!receipt) return;
    const msg = `Hello ${receipt.member?.name},\n\nThank you for your payment at *${receipt.branding.gymName}*!\n\n*Payment Details:*\nReceipt No: ${receipt.receiptNumber}\nAmount Paid: ₹${receipt.amount}\nRemaining Dues: ₹${receipt.pendingAmount}\nPayment Method: ${receipt.paymentMethod.toUpperCase()}\nDate: ${new Date(receipt.paymentDate).toLocaleDateString('en-IN')}\n\nRemarks: ${receipt.notes || 'N/A'}\n\nHave a great workout session!`;
    const url = `https://wa.me/${receipt.member?.phone.replace(/\D/g, '').length === 10 ? '91' + receipt.member?.phone.replace(/\D/g, '') : receipt.member?.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
  };

  const handleShareEmail = () => {
    if (!receipt) return;
    const subject = `Payment Receipt - ${receipt.receiptNumber} - ${receipt.branding.gymName}`;
    const body = `Hello ${receipt.member?.name},\n\nThis is to confirm receipt of ₹${receipt.amount} for your membership subscription at ${receipt.branding.gymName}.\n\nReceipt Details:\nReceipt No: ${receipt.receiptNumber}\nRemaining Dues: ₹${receipt.pendingAmount}\nDate: ${new Date(receipt.paymentDate).toLocaleString('en-IN')}\n\nThank you for working out with us!`;
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  };

  const handleExportExcel = () => {
    const formatted = payments.map((p) => ({
      'Receipt Number': p.receiptNumber,
      'Member Name': p.memberId?.name || 'Deleted Member',
      'Member Phone': p.memberId?.phone || 'N/A',
      'Amount (INR)': p.amount,
      'Dues Balance (INR)': p.pendingAmount,
      'Payment Method': p.paymentMethod.toUpperCase(),
      'Payment Date': new Date(p.paymentDate).toLocaleDateString('en-IN'),
      'Notes': p.notes || ''
    }));
    exportToExcel(formatted, 'payments_ledger_report', 'Payments');
  };

  const filteredPayments = payments.filter((p) => {
    const memberName = p.memberId?.name || '';
    return (
      p.receiptNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      memberName.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Payments Ledger</h1>
          <p className="text-xs text-muted-foreground">Log collections, view transactions, and print invoice receipts.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-sm shadow-sm flex-1 sm:flex-none"
          >
            Export Excel
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-sm shadow-md flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4" /> Collect Payment
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
          <Search className="w-4 h-4" />
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter ledger by receipt number or member name..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border bg-card text-sm focus:outline-none"
        />
      </div>

      {/* Main Ledger Display */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : filteredPayments.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <p className="text-sm text-muted-foreground">No payments transactions found.</p>
        </div>
      ) : (
        <>
          {/* Mobile view cards */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredPayments.map((p) => (
              <div key={p._id} className="p-4 rounded-xl bg-card border space-y-3 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-muted-foreground font-mono">{p.receiptNumber}</span>
                  <span className="text-xs font-extrabold text-emerald-400">₹{p.amount}</span>
                </div>
                
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div>Member: <span className="text-foreground font-semibold">{p.memberId?.name || 'Deleted Member'}</span></div>
                  <div>Method: <span className="text-foreground uppercase">{p.paymentMethod}</span></div>
                  <div>Date: <span className="text-foreground">{new Date(p.paymentDate).toLocaleDateString('en-IN')}</span></div>
                  <div>Balance Dues: <span className="text-foreground font-bold">₹{p.pendingAmount}</span></div>
                </div>

                <div className="flex gap-2 pt-2 border-t">
                  <button
                    onClick={() => handleFetchReceipt(p._id)}
                    className="flex-grow py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5" /> View Invoice
                  </button>
                  <button
                    onClick={() => handleDeletePayment(p._id)}
                    className="p-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                    title="Delete Receipt"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-card border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Receipt Number</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Member Profile</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Amount Paid</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Payment Method</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Receipt Date</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Dues Balance</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredPayments.map((p) => (
                  <tr key={p._id} className="hover:bg-muted/15 transition-colors">
                    <td className="p-4 font-mono font-bold text-xs text-muted-foreground">{p.receiptNumber}</td>
                    <td className="p-4">
                      <div className="font-bold text-foreground">{p.memberId?.name || 'Deleted Member'}</div>
                      <div className="text-xs text-muted-foreground">{p.memberId?.phone || 'N/A'}</div>
                    </td>
                    <td className="p-4 font-bold text-emerald-400">₹{p.amount}</td>
                    <td className="p-4">
                      <span className="px-2 py-0.5 rounded bg-muted text-xs font-semibold uppercase text-foreground">
                        {p.paymentMethod}
                      </span>
                    </td>
                    <td className="p-4 text-xs text-muted-foreground">
                      {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-4 font-bold text-rose-400">₹{p.pendingAmount}</td>
                    <td className="p-4 text-right flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleFetchReceipt(p._id)}
                        className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3.5 h-3.5" /> Receipt
                      </button>
                      <button
                        onClick={() => handleDeletePayment(p._id)}
                        className="p-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Collect Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-card border rounded-3xl p-6 shadow-2xl relative">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Record Payment Receipt</h2>

            <form onSubmit={handleLogPayment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Select Member</label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => {
                    setSelectedMemberId(e.target.value);
                    const memberObj = members.find((m) => m._id === e.target.value);
                    if (memberObj) setAmount(memberObj.remainingAmount);
                  }}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                >
                  <option value="">-- Choose Member with Dues --</option>
                  {members.map((m) => (
                    <option key={m._id} value={m._id}>
                      {m.name} (Pending: ₹{m.remainingAmount})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Amount Collected (₹)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(Number(e.target.value))}
                  placeholder="e.g. 1500"
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Payment Method</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['upi', 'cash', 'card'] as const).map((method) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => setPaymentMethod(method)}
                      className={`py-2 rounded-xl border text-xs font-semibold uppercase transition-all ${
                        paymentMethod === method
                          ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                          : 'bg-background hover:bg-muted text-foreground'
                      }`}
                    >
                      {method}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Transaction remarks / Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. UPI transaction Ref ID: 129381..."
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2 border hover:bg-muted rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={logging}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {logging ? 'Saving Transaction...' : 'Record Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      {showReceiptModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-card border rounded-3xl p-6 shadow-2xl relative my-8 print:border-none print:shadow-none print:bg-white print:text-black">
            {/* Close Button (Hidden in printing) */}
            <button
              onClick={() => setShowReceiptModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {loadingReceipt || !receipt ? (
              <div className="flex justify-center py-10">
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            ) : (
              <div className="space-y-6">
                 {/* Share & Print Control Controls (Hidden in printing) */}
                 <div className="flex flex-wrap gap-2 border-b pb-4 print:hidden items-center justify-end">
                   <button
                     onClick={handleShareWhatsApp}
                     className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                   >
                     <MessageCircle className="w-4 h-4" /> Share WhatsApp
                   </button>
                   <button
                     onClick={handleShareEmail}
                     className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                   >
                     <Mail className="w-4 h-4" /> Send Email
                   </button>
                   <button
                     onClick={handlePrint}
                     className="px-3.5 py-2 bg-primary hover:bg-primary/95 text-primary-foreground text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all cursor-pointer shadow-sm"
                   >
                     <Printer className="w-4 h-4" /> Download PDF
                   </button>
                 </div>

                 {/* Printable Content Area */}
                 <div id="printable-receipt" className="space-y-6 text-foreground font-sans p-2">
                   {/* Gym Header */}
                   <div className="text-center space-y-1">
                     {receipt.branding.logo ? (
                       <img
                         src={receipt.branding.logo}
                         alt="Logo"
                         className="w-12 h-12 rounded-full object-cover mx-auto mb-2 border"
                       />
                     ) : (
                       <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-2">
                         <QrCode className="w-6 h-6 text-primary" />
                       </div>
                     )}
                     <h3 className="font-extrabold text-xl">{receipt.branding.gymName}</h3>
                     <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest bg-muted/40 px-3 py-1 rounded-full inline-block">
                       OFFICIAL TAX INVOICE &amp; RECEIPT
                     </p>
                     <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1">{receipt.branding.address || 'Gym Premises Address'}</p>
                     <p className="text-[11px] text-muted-foreground font-medium">Contact: {receipt.branding.contactNumber}</p>
                   </div>

                   {/* Receipt Meta */}
                   <div className="grid grid-cols-2 gap-4 p-3 bg-muted/30 border rounded-xl text-xs">
                     <div>
                       <span className="block text-muted-foreground font-semibold uppercase text-[9px] tracking-wider">Receipt Number</span>
                       <span className="font-mono font-bold text-foreground text-sm">{receipt.receiptNumber}</span>
                     </div>
                     <div className="text-right">
                       <span className="block text-muted-foreground font-semibold uppercase text-[9px] tracking-wider">Date &amp; Time</span>
                       <span className="font-semibold text-foreground">
                         {new Date(receipt.paymentDate).toLocaleString('en-IN')}
                       </span>
                     </div>
                   </div>

                   {/* Member Meta */}
                   <div className="space-y-1 text-xs">
                     <span className="block font-semibold uppercase text-muted-foreground text-[9px] tracking-wider">Billed To (Recipient)</span>
                     <div className="font-bold text-sm text-foreground">{receipt.member?.name || 'Gym Member'}</div>
                     <div className="text-muted-foreground">Phone: {receipt.member?.phone}</div>
                     {receipt.member?.address && (
                       <div className="text-muted-foreground">Address: {receipt.member.address}</div>
                     )}
                   </div>

                   {/* Details Block */}
                   <div className="border border-collapse rounded-xl overflow-hidden text-xs">
                     <div className="grid grid-cols-2 bg-muted/40 p-2.5 font-semibold text-muted-foreground border-b uppercase text-[9px] tracking-wide">
                       <span>Description</span>
                       <span className="text-right">Amount</span>
                     </div>
                     <div className="grid grid-cols-2 p-3 font-medium border-b">
                       <span>Gym Membership Service Collection</span>
                       <span className="text-right font-bold text-foreground">₹{receipt.amount}.00</span>
                     </div>
                     <div className="grid grid-cols-2 p-3 text-muted-foreground">
                       <span>Remaining Outstanding Dues</span>
                       <span className="text-right font-bold text-rose-400">₹{receipt.pendingAmount}.00</span>
                     </div>
                   </div>

                   {/* Footer Meta */}
                   <div className="text-center text-[10px] text-muted-foreground pt-4 border-t border-dashed space-y-4">
                     <div>
                       Payment Method: <span className="font-bold uppercase text-foreground">{receipt.paymentMethod}</span>
                       {receipt.notes && <div className="mt-1 italic">Remarks: {receipt.notes}</div>}
                     </div>

                     {/* Dynamic QR Verification Invoice Badge */}
                     <div className="flex flex-col items-center justify-center p-3 bg-muted/15 border border-border/40 rounded-xl max-w-xs mx-auto space-y-1.5">
                       <QrCode className="w-12 h-12 text-muted-foreground/80" />
                       <div className="text-[8px] text-muted-foreground uppercase font-extrabold tracking-widest text-center">
                         Invoice Authenticity QR Verification
                       </div>
                       <div className="text-[7px] font-mono text-muted-foreground break-all max-w-[180px] text-center">
                         https://gymledger.in/verify/{receipt.receiptNumber}
                       </div>
                     </div>

                     <div className="pt-2 font-bold text-foreground text-xs uppercase tracking-wide">Thank you for working out with us!</div>
                   </div>
                 </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
