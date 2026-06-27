import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useNotification } from '../../contexts/NotificationContext';
import { useAuth } from '../../contexts/AuthContext';
import * as XLSX from 'xlsx';
import {
  Users,
  Plus,
  Search,
  Trash2,
  Edit2,
  X,
  QrCode,
  Scale,
  Activity,
  UserCheck,
  TrendingUp,
  Printer,
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  Download,
  AlertCircle,
  Database
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { generateMemberCardPDF, exportToExcel } from '../../utils/exportHelpers';

interface Plan {
  _id: string;
  name: string;
  price: number;
}

interface Member {
  _id: string;
  name: string;
  phone: string;
  email: string;
  gender: 'male' | 'female' | 'other';
  dob: string;
  height: number;
  weight: number;
  address: string;
  planId: Plan | null;
  membershipStart: string;
  membershipEnd: string;
  amountPaid: number;
  remainingAmount: number;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  qrCode: string;
  status: 'active' | 'expired';
  isArchived: boolean;
  emergencyContact?: string;
  notes?: string;
}

interface ProgressLog {
  _id: string;
  weight: number;
  bmi: number;
  chest: number;
  waist: number;
  biceps: number;
  date: string;
}

interface PreviewRow {
  id: string;
  data: any;
  errors: string[];
  isDuplicate: boolean;
  isValid: boolean;
}

export const MemberManagement: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansLoaded, setPlansLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { showToast } = useNotification();
  const { user } = useAuth();
  const isSuspended = user?.status === 'suspended' || user?.subscription?.status === 'suspended' || user?.subscription?.status === 'expired';

  // Migration States
  const [showMigrationModal, setShowMigrationModal] = useState(false);
  const [migrationTab, setMigrationTab] = useState<'import' | 'history'>('import');
  
  // Excel Import States
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [uploadFileName, setUploadFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importSummary, setImportSummary] = useState<{
    successCount: number;
    duplicateCount: number;
    failedCount: number;
    errors: any[];
  } | null>(null);

  // Manual Migration States
  const [showManualMigrateModal, setShowManualMigrateModal] = useState(false);
  const [manualForm, setManualForm] = useState({
    name: '',
    phone: '',
    email: '',
    gender: 'male',
    dob: '',
    height: '',
    weight: '',
    address: '',
    emergencyContact: '',
    planName: '',
    startDate: '',
    expiryDate: '',
    totalAmount: '',
    amountPaid: '',
    remainingDue: '',
    paymentStatus: 'unpaid',
    notes: ''
  });
  const [manualFormErrors, setManualFormErrors] = useState<any>({});
  const [savingManualMigration, setSavingManualMigration] = useState(false);

  // Import History Log State
  const [importHistory, setImportHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Create Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [dob, setDob] = useState('');
  const [height, setHeight] = useState<number | ''>('');
  const [weight, setWeight] = useState<number | ''>('');
  const [address, setAddress] = useState('');
  const [planId, setPlanId] = useState('');
  const [membershipStart, setMembershipStart] = useState(new Date().toISOString().split('T')[0]);
  const [initialPayment, setInitialPayment] = useState<number | ''>('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [adding, setAdding] = useState(false);
  const [whatsAppModalOpen, setWhatsAppModalOpen] = useState(false);
  const [pendingWhatsAppUrl, setPendingWhatsAppUrl] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Edit Modal
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editGender, setEditGender] = useState<'male' | 'female' | 'other'>('male');
  const [editDob, setEditDob] = useState('');
  const [editHeight, setEditHeight] = useState<number | ''>('');
  const [editWeight, setEditWeight] = useState<number | ''>('');
  const [editAddress, setEditAddress] = useState('');
  const [editPlanId, setEditPlanId] = useState('');
  const [editMembershipStart, setEditMembershipStart] = useState('');
  const [editAmountPaid, setEditAmountPaid] = useState<number | ''>('');
  const [editEmergency, setEditEmergency] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [updating, setUpdating] = useState(false);

  // Detail Drawer / Progress Dashboard
  const [detailMember, setDetailMember] = useState<Member | null>(null);
  const [showDrawer, setShowDrawer] = useState(false);
  const [progressLogs, setProgressLogs] = useState<ProgressLog[]>([]);
  const [logWeight, setLogWeight] = useState<number | ''>('');
  const [logChest, setLogChest] = useState<number | ''>('');
  const [logWaist, setLogWaist] = useState<number | ''>('');
  const [logBiceps, setLogBiceps] = useState<number | ''>('');
  const [savingProgress, setSavingProgress] = useState(false);

  useEffect(() => {
    loadMembersData();
  }, []);

  const loadMembersData = async () => {
    setLoading(true);
    setPlansLoading(true);
    setPlansLoaded(false);
    try {
      const [membersData, plansData] = await Promise.all([
        api.get('/members?includeArchived=true'),
        api.get('/plans')
      ]);
      setMembers(membersData);
      setPlans(plansData);
      setPlansLoaded(true);
      if (plansData.length > 0) {
        setPlanId(plansData[0]._id);
        setInitialPayment('');
      } else {
        setPlanId('');
        setInitialPayment('');
      }
    } catch (err: any) {
      showToast(err.message || 'Error retrieving member roster.', 'error');
    } finally {
      setLoading(false);
      setPlansLoading(false);
    }
  };

  // Migration History Log Fetch
  const fetchMigrationHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.get('/members/migration/history');
      setImportHistory(data);
    } catch (err) {
      console.error('Error fetching import history:', err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (showMigrationModal && migrationTab === 'history') {
      fetchMigrationHistory();
    }
  }, [showMigrationModal, migrationTab]);

  // Excel Sample Template Downloader
  const downloadSampleTemplate = () => {
    const headers = [
      'Member Name',
      'Phone Number',
      'Email',
      'Gender',
      'Date of Birth',
      'Age (optional)',
      'Height (cm)',
      'Weight (kg)',
      'Address',
      'Emergency Contact',
      'Membership Plan',
      'Membership Start Date',
      'Membership Expiry Date',
      'Total Plan Amount',
      'Amount Paid',
      'Remaining Due',
      'Payment Status',
      'Medical Notes',
      'Active / Inactive'
    ];

    const sampleRow = [
      'Amit Kumar',
      '9876543210',
      'amit@example.com',
      'male',
      '1995-08-15',
      '30',
      '175',
      '72',
      'Jaipur, Rajasthan',
      '9876543211',
      'Premium Annual',
      '2026-01-01',
      '2027-01-01',
      '12000',
      '10000',
      '2000',
      'partial',
      'Knee injury history',
      'active'
    ];

    const instructions = [
      ['Column Name', 'Required?', 'Allowed Values / Constraints', 'Example'],
      ['Member Name', 'Yes', 'Full Name of the member', 'Amit Kumar'],
      ['Phone Number', 'Yes', '10-digit mobile number (Must be unique)', '9876543210'],
      ['Email', 'No', 'Valid email address format', 'amit@example.com'],
      ['Gender', 'Yes', 'male / female / other', 'male'],
      ['Date of Birth', 'Yes', 'YYYY-MM-DD format', '1995-08-15'],
      ['Age (optional)', 'No', 'Integer number', '30'],
      ['Height (cm)', 'Yes', 'Height in centimeters', '175'],
      ['Weight (kg)', 'Yes', 'Weight in kilograms', '72'],
      ['Address', 'No', 'Text string address', 'Jaipur, Rajasthan'],
      ['Emergency Contact', 'No', '10-digit mobile number', '9876543211'],
      ['Membership Plan', 'Yes', 'Plan name (Creates new plan if not exists)', 'Premium Annual'],
      ['Membership Start Date', 'Yes', 'YYYY-MM-DD format', '2026-01-01'],
      ['Membership Expiry Date', 'Yes', 'YYYY-MM-DD format', '2027-01-01'],
      ['Total Plan Amount', 'Yes', 'Number representing plan cost', '12000'],
      ['Amount Paid', 'Yes', 'Number representing amount paid so far', '10000'],
      ['Remaining Due', 'Yes', 'Total Plan Amount minus Amount Paid', '2000'],
      ['Payment Status', 'Yes', 'paid / partial / unpaid', 'partial'],
      ['Medical Notes', 'No', 'Any medical restrictions or notes', 'Knee injury history'],
      ['Active / Inactive', 'Yes', 'active / inactive', 'active']
    ];

    const wb = XLSX.utils.book_new();
    const wsTemplate = XLSX.utils.aoa_to_sheet([headers, sampleRow]);
    const wsInstructions = XLSX.utils.aoa_to_sheet(instructions);

    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template');
    XLSX.utils.book_append_sheet(wb, wsInstructions, 'Instructions');

    XLSX.writeFile(wb, 'gymledger_migration_template.xlsx');
  };

  // Drag and Drop File Upload Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(sheet);
        processPreviewData(json);
      } catch (err: any) {
        showToast(`Failed to parse Excel file: ${err.message}`, 'error');
      }
    };
    reader.readAsBinaryString(file);
  };

  // Preview Data Processor (with client-side duplicate detection)
  const processPreviewData = (rows: any[]) => {
    const existingPhones = new Set(members.map(m => m.phone.trim()));
    const existingEmails = new Set(members.filter(m => m.email).map(m => m.email.trim().toLowerCase()));

    const processedPhones = new Set<string>();
    const processedEmails = new Set<string>();

    const tempPreview: PreviewRow[] = rows.map((row, idx) => {
      const name = row.name || row['Member Name'];
      const phone = String(row.phone || row['Phone Number'] || '').trim();
      const email = String(row.email || row['Email'] || '').trim().toLowerCase();
      const gender = String(row.gender || row['Gender'] || '').trim().toLowerCase();
      const dob = row.dob || row['Date of Birth'] || row['DOB'];
      const height = Number(row.height || row['Height'] || row['Height (cm)']);
      const weight = Number(row.weight || row['Weight'] || row['Weight (kg)']);
      const planName = String(row.planName || row['Membership Plan'] || '').trim();
      const startDate = row.startDate || row['Membership Start Date'];
      const expiryDate = row.expiryDate || row['Membership Expiry Date'];

      const rowErrors: string[] = [];
      let isDuplicate = false;

      if (!name) rowErrors.push('Name is required');
      if (!phone) {
        rowErrors.push('Phone is required');
      } else {
        if (existingPhones.has(phone) || processedPhones.has(phone)) {
          isDuplicate = true;
          rowErrors.push(`Duplicate phone number: ${phone}`);
        }
        processedPhones.add(phone);
      }

      if (email) {
        if (existingEmails.has(email) || processedEmails.has(email)) {
          isDuplicate = true;
          rowErrors.push(`Duplicate email: ${email}`);
        }
        processedEmails.add(email);
      }

      if (gender !== 'male' && gender !== 'female' && gender !== 'other') {
        rowErrors.push('Gender must be male, female, or other');
      }
      if (!dob) {
        rowErrors.push('Date of Birth is required');
      }
      if (!planName) {
        rowErrors.push('Membership Plan is required');
      }
      if (!startDate) {
        rowErrors.push('Start Date is required');
      }
      if (!expiryDate) {
        rowErrors.push('Expiry Date is required');
      }
      if (isNaN(height) || height <= 0) {
        rowErrors.push('Height must be a positive number');
      }
      if (isNaN(weight) || weight <= 0) {
        rowErrors.push('Weight must be a positive number');
      }

      return {
        id: `row-${idx}-${Math.random()}`,
        data: row,
        errors: rowErrors,
        isDuplicate,
        isValid: rowErrors.length === 0
      };
    });

    setPreviewRows(tempPreview);
  };

  // Trigger batch sequential imports (Sequenced Chunks of size 100)
  const triggerBatchImport = async () => {
    const validRows = previewRows.filter(r => r.isValid && !r.isDuplicate);
    if (validRows.length === 0) {
      showToast('No valid, non-duplicate records to import.', 'error');
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportSummary(null);

    const batchSize = 100;
    let successCount = 0;
    let duplicateCount = 0;
    let failedCount = 0;
    const allErrors: any[] = [];

    for (let i = 0; i < validRows.length; i += batchSize) {
      const batch = validRows.slice(i, i + batchSize).map(r => r.data);
      try {
        const res = await api.post('/members/migrate/excel', {
          fileName: uploadFileName || 'batch_import.xlsx',
          members: batch
        });
        
        successCount += res.importedCount;
        duplicateCount += res.duplicateCount;
        failedCount += res.failedCount;
        if (res.importHistory && res.importHistory.rowErrors) {
          allErrors.push(...res.importHistory.rowErrors);
        }
      } catch (err: any) {
        console.error('Batch import failed:', err);
        failedCount += batch.length;
        allErrors.push({ row: i + 1, error: err.message || 'Batch request failed' });
      }

      setImportProgress(Math.min(100, Math.round(((i + batch.length) / validRows.length) * 100)));
    }

    setImporting(false);
    setImportSummary({
      successCount,
      duplicateCount,
      failedCount,
      errors: allErrors
    });

    setPreviewRows([]);
    setUploadFileName('');
    showToast(`Excel migration finished: ${successCount} successfully imported.`, 'success');
    loadMembersData();
  };

  // Download error log as CSV
  const downloadErrorReport = (errors: any[]) => {
    const csvContent = "data:text/csv;charset=utf-8," 
      + ["Row Number,Name,Error Description"].join(",") + "\n"
      + errors.map(e => `${e.row || ''},"${e.name || ''}","${e.error || ''}"`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `gymledger_import_errors_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Submit manual migration form
  const handleManualMigrationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualFormErrors({});
    
    const errors: any = {};
    if (!manualForm.name) errors.name = 'Full Name is required.';
    if (!manualForm.phone) {
      errors.phone = 'Phone number is required.';
    } else if (!/^\d{10}$/.test(manualForm.phone)) {
      errors.phone = 'Phone number must be exactly 10 digits.';
    }
    if (!manualForm.gender) errors.gender = 'Gender is required.';
    if (!manualForm.dob) errors.dob = 'Date of Birth is required.';
    if (!manualForm.height || isNaN(Number(manualForm.height)) || Number(manualForm.height) <= 0) {
      errors.height = 'Valid height (cm) is required.';
    }
    if (!manualForm.weight || isNaN(Number(manualForm.weight)) || Number(manualForm.weight) <= 0) {
      errors.weight = 'Valid weight (kg) is required.';
    }
    if (!manualForm.planName) errors.planName = 'Membership Plan Name is required.';
    if (!manualForm.startDate) errors.startDate = 'Start Date is required.';
    if (!manualForm.expiryDate) errors.expiryDate = 'Expiry Date is required.';
    if (!manualForm.totalAmount || isNaN(Number(manualForm.totalAmount))) {
      errors.totalAmount = 'Plan amount is required.';
    }
    
    if (Object.keys(errors).length > 0) {
      setManualFormErrors(errors);
      showToast('Please fix all validation errors.', 'error');
      return;
    }

    setSavingManualMigration(true);
    try {
      const payload = {
        ...manualForm,
        height: Number(manualForm.height),
        weight: Number(manualForm.weight),
        totalAmount: Number(manualForm.totalAmount),
        amountPaid: Number(manualForm.amountPaid || 0),
        remainingDue: Number(manualForm.remainingDue || 0)
      };

      await api.post('/members/migrate/manual', payload);
      showToast(`Member ${manualForm.name} migrated successfully!`, 'success');
      
      setManualForm({
        name: '',
        phone: '',
        email: '',
        gender: 'male',
        dob: '',
        height: '',
        weight: '',
        address: '',
        emergencyContact: '',
        planName: '',
        startDate: '',
        expiryDate: '',
        totalAmount: '',
        amountPaid: '',
        remainingDue: '',
        paymentStatus: 'unpaid',
        notes: ''
      });
      setShowManualMigrateModal(false);
      setShowMigrationModal(false);
      loadMembersData();
    } catch (err: any) {
      showToast(err.message || 'Manual migration failed.', 'error');
    } finally {
      setSavingManualMigration(false);
    }
  };

  const handleRegisterMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (plansLoading) {
      showToast('Membership plans are still loading...', 'error');
      return;
    }
    if (!plansLoaded) {
      showToast('Membership plans have not loaded yet.', 'error');
      return;
    }
    if (plans.length === 0) {
      showToast('No Membership Plans Available. Please create a plan first.', 'error');
      return;
    }

    const errors: Record<string, string> = {};
    setFormErrors({});

    if (!name) {
      errors.name = 'Full Name is required.';
    }

    const phoneRegex = /^\d{10}$/;
    if (!phone) {
      errors.phone = 'Phone number is required.';
    } else if (!phoneRegex.test(phone)) {
      errors.phone = 'Phone number must contain exactly 10 digits.';
    }

    if (emergencyContact && !phoneRegex.test(emergencyContact)) {
      errors.emergencyContact = 'Phone number must contain exactly 10 digits.';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
      errors.email = 'Email is required.';
    } else if (!emailRegex.test(email)) {
      errors.email = 'Please enter a valid email.';
    }

    if (!planId) {
      errors.planId = 'Please select a membership plan.';
    }

    if (!dob) {
      errors.dob = 'Date of Birth is required.';
    } else {
      const dobDate = new Date(dob);
      if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
        errors.dob = 'Date of Birth cannot be in the future.';
      } else {
        const age = new Date().getFullYear() - dobDate.getFullYear();
        if (age < 10 || age > 100) {
          errors.dob = 'Age must be between 10 and 100.';
        }
      }
    }

    if (!height) {
      errors.height = 'Height is required.';
    } else if (Number(height) <= 0) {
      errors.height = 'Height must be a positive number.';
    }

    if (!weight) {
      errors.weight = 'Weight is required.';
    } else if (Number(weight) <= 0) {
      errors.weight = 'Weight must be greater than 0.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Validation Failed', 'error');
      return;
    }

    setAdding(true);
    try {
      const res = await api.post('/members', {
        name,
        phone,
        email,
        gender,
        dob,
        height,
        weight,
        address,
        planId,
        membershipStart,
        amountPaid: initialPayment,
        emergencyContact,
        notes
      });
      showToast('Member registered successfully!', 'success');
      setShowAddModal(false);
      resetAddForm();
      loadMembersData();

      if (res && res.whatsappUrl) {
        setPendingWhatsAppUrl(res.whatsappUrl);
        setWhatsAppModalOpen(true);
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to register member.', 'error');
    } finally {
      setAdding(false);
    }
  };

  const handleUpdateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember) return;
    if (plansLoading) {
      showToast('Membership plans are still loading...', 'error');
      return;
    }
    if (!plansLoaded) {
      showToast('Membership plans have not loaded.', 'error');
      return;
    }
    if (plans.length === 0) {
      showToast('No membership plans available.', 'error');
      return;
    }
    if (!editName || !editPhone || !editEmail || !editPlanId) {
      showToast('Name, Phone, Email and Membership plan are required.', 'error');
      return;
    }

    // Strict validations
    const phoneRegex = /^\d{10}$/;
    if (!phoneRegex.test(editPhone)) {
      showToast('Phone number must be exactly 10 digits.', 'error');
      return;
    }
    if (!phoneRegex.test(editEmergency)) {
      showToast('Emergency contact number must be exactly 10 digits.', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editEmail)) {
      showToast('Please enter a valid email address.', 'error');
      return;
    }
    const dobDate = new Date(editDob);
    if (isNaN(dobDate.getTime()) || dobDate > new Date()) {
      showToast('Date of Birth cannot be in the future.', 'error');
      return;
    }
    if (Number(editHeight) <= 0) {
      showToast('Height must be a positive number.', 'error');
      return;
    }
    if (Number(editWeight) <= 0) {
      showToast('Weight must be a positive number.', 'error');
      return;
    }

    setUpdating(true);
    try {
      const res = await api.put(`/members/${selectedMember._id}`, {
        name: editName,
        phone: editPhone,
        email: editEmail,
        gender: editGender,
        dob: editDob,
        height: editHeight,
        weight: editWeight,
        address: editAddress,
        planId: editPlanId,
        membershipStart: editMembershipStart,
        amountPaid: editAmountPaid,
        emergencyContact: editEmergency,
        notes: editNotes
      });
      showToast('Member profile updated.', 'success');
      setShowEditModal(false);
      loadMembersData();

      if (res && res.whatsappUrl) {
        showToast('WhatsApp link generated successfully!', 'info');
        window.open(res.whatsappUrl, '_blank');
      }
    } catch (err: any) {
      showToast(err.message || 'Failed to update member profile.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteMember = async (id: string) => {
    if (!window.confirm('Are you sure you want to archive this member? Their payment and attendance history will be preserved.')) return;
    try {
      await api.delete(`/members/${id}`);
      showToast('Member profile archived successfully.', 'success');
      loadMembersData();
    } catch (err: any) {
      showToast(err.message || 'Failed to archive member.', 'error');
    }
  };

  const handleRestoreMember = async (id: string) => {
    if (!window.confirm('Restore this member profile?')) return;
    try {
      await api.put(`/members/${id}/restore`, {});
      showToast('Member profile restored successfully.', 'success');
      loadMembersData();
    } catch (err: any) {
      showToast(err.message || 'Failed to restore member.', 'error');
    }
  };

  const loadProgressLogs = async (memberId: string) => {
    try {
      const logs = await api.get(`/members/${memberId}/progress`);
      setProgressLogs(logs);
    } catch (err: any) {
      showToast('Error loading progress history.', 'error');
    }
  };

  const handleLogProgress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!detailMember) return;
    setSavingProgress(true);
    try {
      await api.post(`/members/${detailMember._id}/progress`, {
        weight: logWeight,
        chest: logChest,
        waist: logWaist,
        biceps: logBiceps
      });
      showToast('Weight progress parameter logged.', 'success');
      loadProgressLogs(detailMember._id);
      loadMembersData(); // Reload weights in lists
    } catch (err: any) {
      showToast('Failed to log weight progress.', 'error');
    } finally {
      setSavingProgress(false);
    }
  };

  const openAddModal = () => {
    resetAddForm();
    setShowAddModal(true);
  };

  const resetAddForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setGender('male');
    setDob('');
    setHeight('');
    setWeight('');
    setAddress('');
    setEmergencyContact('');
    setNotes('');
    if (plans.length > 0) {
      setPlanId(plans[0]._id);
      setInitialPayment('');
    }
  };

  const openEditModal = (member: Member) => {
    setSelectedMember(member);
    setEditName(member.name);
    setEditPhone(member.phone);
    setEditEmail(member.email);
    setEditGender(member.gender);
    setEditDob(member.dob ? member.dob.split('T')[0] : '');
    setEditHeight(member.height);
    setEditWeight(member.weight);
    setEditAddress(member.address);
    setEditPlanId(member.planId?._id || '');
    setEditMembershipStart(member.membershipStart ? member.membershipStart.split('T')[0] : '');
    setEditAmountPaid(member.amountPaid);
    setEditEmergency(member.emergencyContact || '');
    setEditNotes(member.notes || '');
    setShowEditModal(true);
  };

  const openDetailDrawer = (member: Member) => {
    navigate(`/app/members/${member._id}`);
  };

  const calculateBMI = (hCm: number, wKg: number) => {
    const hM = hCm / 100;
    return parseFloat((wKg / (hM * hM)).toFixed(1));
  };

  const getBMICategory = (bmi: number) => {
    if (bmi < 18.5) return { label: 'Underweight', color: 'text-sky-400' };
    if (bmi < 25) return { label: 'Normal', color: 'text-emerald-400' };
    if (bmi < 30) return { label: 'Overweight', color: 'text-amber-400' };
    return { label: 'Obese', color: 'text-rose-400' };
  };

  const handlePrintCard = () => {
    if (detailMember) {
      const gymName = user?.branding?.gymName || user?.gymName || 'GymLedger';
      generateMemberCardPDF(detailMember, gymName);
    }
  };

  const handleExportExcel = () => {
    const formatted = filteredMembers.map((m) => {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isExpired = new Date(m.membershipEnd) < todayStart;
      return {
        'Full Name': m.name,
        'Phone Number': m.phone,
        'Email Address': m.email || 'N/A',
        'Gender': m.gender.toUpperCase(),
        'Height (cm)': m.height,
        'Weight (kg)': m.weight,
        'Plan Name': m.planId?.name || 'Deleted Plan',
        'Start Date': new Date(m.membershipStart).toLocaleDateString('en-IN'),
        'Expiry Date': new Date(m.membershipEnd).toLocaleDateString('en-IN'),
        'Outstanding Dues (INR)': m.remainingAmount,
        'Membership Status': !isExpired ? 'Active' : 'Expired',
        'Access QR Code': m.qrCode
      };
    });
    exportToExcel(formatted, 'members_roster_report', 'Members');
  };

  const filteredMembers = members.filter((m) => {
    const matchesSearch = m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.phone.includes(searchQuery);
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const isExpired = new Date(m.membershipEnd) < todayStart;

    if (filterStatus === 'archived') {
      return matchesSearch && m.isArchived;
    }
    if (m.isArchived) return false;

    if (filterStatus === 'active') return matchesSearch && !isExpired;
    if (filterStatus === 'expired') return matchesSearch && isExpired;
    return matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Members Directory</h1>
          <p className="text-xs text-muted-foreground">Manage active memberships, weight diagnostics, and QR passes.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={handleExportExcel}
            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-card border hover:bg-muted text-foreground text-sm shadow-sm flex-1 sm:flex-none"
          >
            Export Excel
          </button>
          {!isSuspended && (
            <>
              <button
                onClick={() => {
                  setShowMigrationModal(true);
                  setMigrationTab('import');
                }}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-indigo-600 hover:bg-indigo-700 text-white text-sm shadow-md flex-1 sm:flex-none cursor-pointer"
              >
                <UploadCloud className="w-4 h-4" /> Import Existing Members
              </button>
              <button
                onClick={openAddModal}
                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-primary hover:bg-primary/90 text-primary-foreground text-sm shadow-md flex-1 sm:flex-none cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Register Member
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-card border">
        <div className="relative flex-grow max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-muted-foreground">
            <Search className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or contact number..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border bg-background text-xs focus:outline-none"
          />
        </div>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
        >
          <option value="all">All Members</option>
          <option value="active">Active Members</option>
          <option value="expired">Expired Members</option>
          <option value="archived">Archived Members</option>
        </select>
      </div>

      {/* List content */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-card border">
          <p className="text-sm text-muted-foreground font-semibold">No members registered matching filters.</p>
        </div>
      ) : (
        <>
          {/* Card Layout for Mobile */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {filteredMembers.map((member) => {
              const today = new Date();
              const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
              const isExpired = new Date(member.membershipEnd) < todayStart;
              return (
                <div key={member._id} className="p-4 rounded-xl bg-card border space-y-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm">{member.name}</span>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${
                        !isExpired
                          ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25'
                          : 'bg-rose-950/40 text-rose-400 border-rose-500/25'
                      }`}
                    >
                      {!isExpired ? 'Active' : 'Expired'}
                    </span>
                  </div>

                  <div className="space-y-1 text-xs text-muted-foreground">
                    <div>Phone: <span className="text-foreground">{member.phone}</span></div>
                    <div>Plan: <span className="text-foreground">{member.planId?.name || 'Deleted Plan'}</span></div>
                    <div>Remaining: <span className="text-rose-400 font-bold">₹{member.remainingAmount}</span></div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t">
                    <button
                      onClick={() => openDetailDrawer(member)}
                      className="flex-1 py-2 bg-primary/10 border border-primary/20 text-primary rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-colors"
                    >
                      <Activity className="w-3.5 h-3.5" /> Open Profile
                    </button>
                    {member.isArchived ? (
                      <button
                        onClick={() => handleRestoreMember(member._id)}
                        className="px-4 py-2 bg-emerald-950/40 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-950/60 rounded-lg text-xs font-semibold transition-colors flex-1"
                      >
                        Restore
                      </button>
                    ) : (
                      <>
                        {!isSuspended && (
                          <>
                            <button
                              onClick={() => openEditModal(member)}
                              className="p-2 border hover:bg-muted text-foreground rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteMember(member._id)}
                              className="p-2 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block overflow-hidden rounded-2xl bg-card border shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Member Name</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Contact Info</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Active Plan</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Dues / Expiry</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase">Status</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y text-sm">
                {filteredMembers.map((member) => {
                  const today = new Date();
                  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                  const isExpired = new Date(member.membershipEnd) < todayStart;
                  return (
                    <tr key={member._id} className="hover:bg-muted/15 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-foreground">{member.name}</div>
                        <div className="text-xs text-muted-foreground">{member.gender} | Weight: {member.weight}kg</div>
                      </td>
                      <td className="p-4">
                        <div>{member.phone}</div>
                        <div className="text-xs text-muted-foreground">{member.email}</div>
                      </td>
                      <td className="p-4 font-semibold text-primary">{member.planId?.name || 'Deleted Plan'}</td>
                      <td className="p-4">
                        <div className="font-bold text-rose-400">₹{member.remainingAmount} Balance</div>
                        <div className="text-xs text-muted-foreground">Expires {new Date(member.membershipEnd).toLocaleDateString('en-IN')}</div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase border ${
                            !isExpired
                              ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25'
                              : 'bg-rose-950/40 text-rose-400 border-rose-500/25'
                          }`}
                        >
                          {!isExpired ? 'Active' : 'Expired'}
                        </span>
                      </td>
                      <td className="p-4 text-right flex items-center justify-end gap-2">
                        <button
                          onClick={() => openDetailDrawer(member)}
                          className="px-2.5 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                        >
                          <Activity className="w-3.5 h-3.5" /> Profile
                        </button>
                        {member.isArchived ? (
                          <button
                            onClick={() => handleRestoreMember(member._id)}
                            className="px-2.5 py-1.5 bg-emerald-950/40 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-950/60 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1"
                          >
                            Restore
                          </button>
                        ) : (
                          <>
                            {!isSuspended && (
                              <>
                                <button
                                  onClick={() => openEditModal(member)}
                                  className="p-1.5 border hover:bg-muted rounded-lg text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteMember(member._id)}
                                  className="p-1.5 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-card border rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Register New Member</h2>

            <form onSubmit={handleRegisterMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Rohan Khanna"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {formErrors.name && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 91111 91111"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {formErrors.phone && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="member@gmail.com"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {formErrors.email && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.email}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gender</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">DOB</label>
                  <input
                    type="date"
                    required
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {formErrors.dob && <p className="text-[10px] text-rose-500 mt-1 font-medium">{formErrors.dob}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={height}
                    onChange={(e) => setHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {formErrors.height && <p className="text-[10px] text-rose-500 mt-1 font-medium">{formErrors.height}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={weight}
                    onChange={(e) => setWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {formErrors.weight && <p className="text-[10px] text-rose-500 mt-1 font-medium">{formErrors.weight}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Address Location</label>
                <input
                  type="text"
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street and Area details..."
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Membership Plan</label>
                  {plansLoading ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">Loading Plans...</option>
                    </select>
                  ) : !plansLoaded ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">Plans Not Loaded</option>
                    </select>
                  ) : plans.length === 0 ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">No Plans Available</option>
                    </select>
                  ) : (
                    <select
                      value={planId}
                      onChange={(e) => {
                        setPlanId(e.target.value);
                        const planObj = plans.find((p) => p._id === e.target.value);
                        if (planObj) setInitialPayment(planObj.price);
                      }}
                      className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none z-10"
                    >
                      <option value="" className="bg-card text-foreground">Select a plan</option>
                      {plans.map((p) => (
                        <option key={p._id} value={p._id} className="bg-card text-foreground">
                          {p.name} (₹{p.price})
                        </option>
                      ))}
                    </select>
                  )}
                  {formErrors.planId && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.planId}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={membershipStart}
                    onChange={(e) => setMembershipStart(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Deposit Collected (₹)</label>
                  <input
                    type="number"
                    required
                    value={initialPayment}
                    onChange={(e) => setInitialPayment(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    required
                    value={emergencyContact}
                    onChange={(e) => setEmergencyContact(e.target.value)}
                    placeholder="Guardian Phone..."
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {formErrors.emergencyContact && <p className="text-xs text-rose-500 mt-1 font-medium">{formErrors.emergencyContact}</p>}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Staff Notes</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Medical conditions, goals..."
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
                  disabled={adding}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {adding ? 'Registering...' : 'Register Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg bg-card border rounded-3xl p-6 shadow-2xl relative my-8">
            <button
              onClick={() => setShowEditModal(false)}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Edit Member Profile</h2>

            <form onSubmit={handleUpdateMember} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number</label>
                  <input
                    type="tel"
                    required
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    required
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gender</label>
                  <select
                    value={editGender}
                    onChange={(e) => setEditGender(e.target.value as any)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">DOB</label>
                  <input
                    type="date"
                    required
                    value={editDob}
                    onChange={(e) => setEditDob(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={editHeight}
                    onChange={(e) => setEditHeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={editWeight}
                    onChange={(e) => setEditWeight(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Address</label>
                <input
                  type="text"
                  required
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Active Plan</label>
                  {plansLoading ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">Loading Plans...</option>
                    </select>
                  ) : !plansLoaded ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">Plans Not Loaded</option>
                    </select>
                  ) : plans.length === 0 ? (
                    <select disabled className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-muted-foreground text-sm focus:outline-none">
                      <option className="bg-card text-foreground">No Plans Available</option>
                    </select>
                  ) : (
                    <select
                      value={editPlanId}
                      onChange={(e) => setEditPlanId(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none z-10"
                    >
                      {plans.map((p) => (
                        <option key={p._id} value={p._id} className="bg-card text-foreground">
                          {p.name} (₹{p.price})
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Start Date</label>
                  <input
                    type="date"
                    required
                    value={editMembershipStart}
                    onChange={(e) => setEditMembershipStart(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-muted bg-card text-foreground text-sm focus:ring-1 focus:ring-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Dues Paid (₹)</label>
                  <input
                    type="number"
                    required
                    value={editAmountPaid}
                    onChange={(e) => setEditAmountPaid(Number(e.target.value))}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    required
                    value={editEmergency}
                    onChange={(e) => setEditEmergency(e.target.value)}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Staff Notes</label>
                <input
                  type="text"
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="flex-1 py-2 border hover:bg-muted rounded-xl text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-sm font-semibold"
                >
                  {updating ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Member Detail Drawer */}
      {showDrawer && detailMember && (
        <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-card border-l shadow-2xl flex flex-col justify-between transform transition-all duration-300 animate-slide-over">
          {/* Drawer Header */}
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-extrabold text-base text-foreground">Member Wellness &amp; Pass</h2>
            <button
              onClick={() => setShowDrawer(false)}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Drawer Content */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* 1. Digital Pass */}
            <div className="p-6 rounded-2xl bg-background border space-y-4 flex flex-col items-center justify-center text-center relative overflow-hidden">
              <div id="pass-card-area" className="w-full max-w-xs p-5 bg-card border rounded-2xl flex flex-col items-center text-center space-y-3 relative shadow">
                <span className="text-[10px] bg-primary/10 text-primary px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wide">
                  Gym Entry Pass
                </span>
                
                {/* QR server generated QR code */}
                <div className="w-32 h-32 bg-white p-2 rounded-xl flex items-center justify-center border shadow-inner">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${detailMember.qrCode}`}
                    alt="Member QR Pass"
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div>
                  <div className="font-extrabold text-sm">{detailMember.name}</div>
                  <div className="text-[10px] text-muted-foreground font-mono">{detailMember.qrCode}</div>
                </div>

                <div className="w-full border-t border-dashed pt-2.5 text-[10px] text-muted-foreground">
                  Gym Studio: <span className="font-bold text-foreground">{user?.branding?.gymName || user?.gymName || 'GymLedger'}</span>
                </div>
              </div>

              <button
                onClick={handlePrintCard}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md"
              >
                <Printer className="w-3.5 h-3.5" /> Print QR Pass
              </button>
            </div>

            {/* 2. BMI diagnostics */}
            <div className="p-5 rounded-2xl bg-background border space-y-3">
              <h3 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1">
                <Scale className="w-4 h-4 text-primary" /> BMI Wellness Diagnostics
              </h3>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3 bg-card border rounded-xl">
                  <span className="text-muted-foreground block">BMI Score</span>
                  <span className="text-xl font-bold text-foreground">
                    {calculateBMI(detailMember.height, detailMember.weight)}
                  </span>
                </div>
                <div className="p-3 bg-card border rounded-xl">
                  <span className="text-muted-foreground block">Classification</span>
                  <span className={`text-xl font-bold ${getBMICategory(calculateBMI(detailMember.height, detailMember.weight)).color}`}>
                    {getBMICategory(calculateBMI(detailMember.height, detailMember.weight)).label}
                  </span>
                </div>
              </div>
            </div>

            {/* 3. Weight logger */}
            <div className="p-5 rounded-2xl bg-background border space-y-4">
              <h3 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1">
                <TrendingUp className="w-4 h-4 text-primary" /> Log Weight Progress
              </h3>

              <form onSubmit={handleLogProgress} className="flex gap-2">
                <input
                  type="number"
                  required
                  value={logWeight}
                  onChange={(e) => setLogWeight(Number(e.target.value))}
                  placeholder="New Weight (kg)"
                  className="flex-grow px-3 py-1.5 rounded-lg border bg-card text-xs focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={savingProgress}
                  className="px-4 py-1.5 bg-primary hover:bg-primary/95 text-primary-foreground font-semibold text-xs rounded-lg transition-all"
                >
                  {savingProgress ? 'Logging...' : 'Save Log'}
                </button>
              </form>
            </div>

            {/* 4. Weight history charts */}
            {progressLogs.length > 0 && (
              <div className="p-5 rounded-2xl bg-background border space-y-3">
                <h3 className="font-bold text-xs uppercase text-muted-foreground flex items-center gap-1">
                  <Activity className="w-4 h-4 text-primary" /> Weight History Trend
                </h3>

                <div className="w-full h-44 text-xs font-sans mt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={progressLogs}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={(d) => new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                        stroke="#888888"
                      />
                      <YAxis domain={['auto', 'auto']} stroke="#888888" />
                      <Tooltip />
                      <Line type="monotone" dataKey="weight" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* WhatsApp Welcome Confirmation Modal */}
      {whatsAppModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-card border rounded-3xl p-6 shadow-2xl relative text-center">
            <h3 className="text-lg font-bold text-foreground mb-2">Member Registered Successfully</h3>
            <p className="text-xs text-muted-foreground mb-6">
              Would you like to send the welcome WhatsApp message to this member now?
            </p>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => {
                  if (pendingWhatsAppUrl) {
                    window.open(pendingWhatsAppUrl, '_blank');
                  }
                  setWhatsAppModalOpen(false);
                  setPendingWhatsAppUrl(null);
                }}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
              >
                Send WhatsApp
              </button>
              <button
                onClick={() => {
                  setWhatsAppModalOpen(false);
                  setPendingWhatsAppUrl(null);
                }}
                className="w-full py-2.5 bg-secondary hover:bg-secondary-hover text-foreground rounded-xl text-xs font-semibold transition-all border border-border/40"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Migration Hub Modal */}
      {showMigrationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl bg-card border rounded-3xl p-6 shadow-2xl relative my-8 flex flex-col max-h-[90vh]">
            <button
              onClick={() => {
                setShowMigrationModal(false);
                setPreviewRows([]);
                setUploadFileName('');
                setImportSummary(null);
              }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Database className="w-6 h-6 text-indigo-500" />
              <h2 className="text-xl font-bold">Existing Member Migration Hub</h2>
            </div>

            {/* Tabs */}
            <div className="flex border-b mb-6 gap-4 text-sm font-semibold">
              <button
                onClick={() => setMigrationTab('import')}
                className={`pb-2 border-b-2 transition-colors ${migrationTab === 'import' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                New Import / Manual Entry
              </button>
              <button
                onClick={() => setMigrationTab('history')}
                className={`pb-2 border-b-2 transition-colors ${migrationTab === 'history' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
              >
                Migration Audit Log History
              </button>
            </div>

            {/* Tab: Import */}
            {migrationTab === 'import' && (
              <div className="flex-1 overflow-y-auto space-y-6 pr-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Left Option: Excel template and upload */}
                  <div className="p-5 border rounded-2xl bg-muted/20 space-y-4">
                    <h3 className="font-bold text-sm flex items-center gap-1.5">
                      <FileSpreadsheet className="w-5 h-5 text-emerald-500" /> Excel / CSV Import
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Download our pre-structured dual-sheet Excel template, fill in your historical membership records, and re-upload here.
                    </p>
                    <button
                      onClick={downloadSampleTemplate}
                      className="w-full py-2 border border-emerald-500/30 bg-emerald-950/20 hover:bg-emerald-950/40 text-emerald-400 font-semibold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all"
                    >
                      <Download className="w-4 h-4" /> Download Excel Migration Template
                    </button>

                    <div className="border border-dashed border-border/80 rounded-xl p-4 flex flex-col items-center justify-center text-center relative hover:bg-muted/10 transition-colors">
                      <UploadCloud className="w-8 h-8 text-muted-foreground mb-2" />
                      <span className="text-xs font-semibold text-muted-foreground">
                        {uploadFileName ? uploadFileName : "Select or drag Excel sheet (.xlsx)"}
                      </span>
                      <input
                        type="file"
                        accept=".xlsx"
                        onChange={handleFileUpload}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </div>
                  </div>

                  {/* Right Option: Manual Migration Form Button */}
                  <div className="p-5 border rounded-2xl bg-muted/20 flex flex-col justify-between space-y-4">
                    <div className="space-y-2">
                      <h3 className="font-bold text-sm flex items-center gap-1.5">
                        <Users className="w-5 h-5 text-indigo-500" /> Manual Onboarding
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Need to migrate a single member manually? Onboard individual members without generating fake receipts, keeping their past balance and start dates intact.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowManualMigrateModal(true)}
                      className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-md"
                    >
                      Onboard Single Member Manually
                    </button>
                  </div>
                </div>

                {/* Import progress bar */}
                {importing && (
                  <div className="p-4 border border-indigo-500/30 bg-indigo-950/20 rounded-xl space-y-2">
                    <div className="flex justify-between text-xs font-bold text-indigo-400">
                      <span>Uploading batch records sequentially...</span>
                      <span>{importProgress}%</span>
                    </div>
                    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                      <div className="bg-indigo-500 h-full transition-all duration-300" style={{ width: `${importProgress}%` }} />
                    </div>
                  </div>
                )}

                {/* Import summary completion */}
                {importSummary && (
                  <div className="p-5 border border-emerald-500/20 bg-emerald-950/10 rounded-2xl space-y-3">
                    <h4 className="font-bold text-sm text-emerald-400 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" /> Migration Process Completed
                    </h4>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="p-2 border rounded-lg bg-card">
                        <span className="text-muted-foreground block text-[10px]">SUCCESSFULLY IMPORTED</span>
                        <span className="text-lg font-bold text-emerald-400">{importSummary.successCount}</span>
                      </div>
                      <div className="p-2 border rounded-lg bg-card">
                        <span className="text-muted-foreground block text-[10px]">DUPLICATE SKIPPED</span>
                        <span className="text-lg font-bold text-amber-400">{importSummary.duplicateCount}</span>
                      </div>
                      <div className="p-2 border rounded-lg bg-card">
                        <span className="text-muted-foreground block text-[10px]">FAILED RECORDS</span>
                        <span className="text-lg font-bold text-rose-400">{importSummary.failedCount}</span>
                      </div>
                    </div>
                    {importSummary.errors.length > 0 && (
                      <button
                        onClick={() => downloadErrorReport(importSummary.errors)}
                        className="py-1.5 px-4 border border-rose-500/30 hover:bg-rose-950/20 text-rose-400 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                      >
                        <AlertCircle className="w-4 h-4" /> Download Failure Error Report
                      </button>
                    )}
                  </div>
                )}

                {/* Smart Preview table */}
                {previewRows.length > 0 && (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <h4 className="font-bold text-sm">Smart Preview Table</h4>
                      <div className="flex gap-2 text-xs font-semibold">
                        <span className="px-2 py-0.5 bg-muted rounded-full">Total: {previewRows.length}</span>
                        <span className="px-2 py-0.5 bg-emerald-950/30 text-emerald-400 rounded-full">Valid: {previewRows.filter(r => r.isValid).length}</span>
                        <span className="px-2 py-0.5 bg-amber-950/30 text-amber-400 rounded-full">Duplicates: {previewRows.filter(r => r.isDuplicate).length}</span>
                        <span className="px-2 py-0.5 bg-rose-950/30 text-rose-400 rounded-full">Errors: {previewRows.filter(r => !r.isValid && !r.isDuplicate).length}</span>
                      </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto border rounded-xl">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="border-b bg-muted/40 font-bold">
                            <th className="p-2">Name</th>
                            <th className="p-2">Phone</th>
                            <th className="p-2">Plan</th>
                            <th className="p-2">Dates</th>
                            <th className="p-2">Validation Status / Errors</th>
                            <th className="p-2 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {previewRows.map(row => (
                            <tr key={row.id} className={`hover:bg-muted/10 ${!row.isValid ? 'bg-rose-950/10' : row.isDuplicate ? 'bg-amber-950/10' : ''}`}>
                              <td className="p-2 font-semibold">{row.data['Member Name'] || row.data.name || 'N/A'}</td>
                              <td className="p-2">{row.data['Phone Number'] || row.data.phone || 'N/A'}</td>
                              <td className="p-2">{row.data['Membership Plan'] || row.data.planName || 'N/A'}</td>
                              <td className="p-2 text-[10px] text-muted-foreground">
                                {row.data['Membership Start Date'] || 'N/A'} to {row.data['Membership Expiry Date'] || 'N/A'}
                              </td>
                              <td className="p-2">
                                {row.isValid ? (
                                  <span className="text-emerald-400 font-bold">✓ Valid Ready</span>
                                ) : (
                                  <div className="text-rose-400 space-y-0.5 text-[10px]">
                                    {row.errors.map((err, i) => (
                                      <div key={i}>• {err}</div>
                                    ))}
                                  </div>
                                )}
                              </td>
                              <td className="p-2 text-right">
                                <button
                                  onClick={() => setPreviewRows(prev => prev.filter(r => r.id !== row.id))}
                                  className="text-rose-400 hover:text-rose-300 font-bold px-2 py-1 rounded hover:bg-rose-950/20"
                                >
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setPreviewRows([])}
                        className="px-4 py-2 border rounded-xl text-xs font-semibold hover:bg-muted"
                      >
                        Clear Sheet
                      </button>
                      <button
                        onClick={triggerBatchImport}
                        disabled={importing || previewRows.filter(r => r.isValid && !r.isDuplicate).length === 0}
                        className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {importing ? 'Importing...' : 'Begin Batch Import'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Tab: History */}
            {migrationTab === 'history' && (
              <div className="flex-1 overflow-y-auto">
                {loadingHistory ? (
                  <div className="flex justify-center py-12">
                    <div className="w-8 h-8 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                  </div>
                ) : importHistory.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground text-xs font-semibold">
                    No migration imports recorded yet.
                  </div>
                ) : (
                  <div className="border rounded-2xl overflow-hidden bg-card text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b bg-muted/40 font-bold">
                          <th className="p-3">Import Date</th>
                          <th className="p-3">File / Action</th>
                          <th className="p-3">Imported By</th>
                          <th className="p-3 text-center">Total Rows</th>
                          <th className="p-3 text-center text-emerald-400">Success</th>
                          <th className="p-3 text-center text-rose-400">Failed</th>
                          <th className="p-3 text-center text-amber-400">Duplicate</th>
                          <th className="p-3 text-right">Logs</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {importHistory.map((hist) => (
                          <tr key={hist._id} className="hover:bg-muted/10">
                            <td className="p-3">{new Date(hist.createdAt).toLocaleString('en-IN')}</td>
                            <td className="p-3 font-semibold">{hist.fileName}</td>
                            <td className="p-3 text-muted-foreground">{hist.importedBy}</td>
                            <td className="p-3 text-center font-bold">{hist.totalRecords}</td>
                            <td className="p-3 text-center text-emerald-400 font-bold">{hist.successCount}</td>
                            <td className="p-3 text-center text-rose-400 font-bold">{hist.failedCount}</td>
                            <td className="p-3 text-center text-amber-400 font-bold">{hist.duplicateCount}</td>
                            <td className="p-3 text-right">
                              {hist.rowErrors && hist.rowErrors.length > 0 ? (
                                <button
                                  onClick={() => downloadErrorReport(hist.rowErrors)}
                                  className="text-rose-400 hover:text-rose-300 font-bold hover:underline"
                                >
                                  Download Error Log
                                </button>
                              ) : (
                                <span className="text-muted-foreground">No Errors</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Manual Existing Member Migration Modal */}
      {showManualMigrateModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-2xl bg-card border rounded-3xl p-6 shadow-2xl relative my-8 flex flex-col max-h-[90vh]">
            <button
              onClick={() => {
                setShowManualMigrateModal(false);
                setManualFormErrors({});
              }}
              className="absolute top-4 right-4 p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <h2 className="text-xl font-bold mb-4">Add Existing Migrated Member</h2>

            <form onSubmit={handleManualMigrationSubmit} className="space-y-4 overflow-y-auto pr-2 flex-1">
              <div className="border-b pb-2 font-bold text-xs text-indigo-400 uppercase tracking-wide">
                1. Personal Details
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={manualForm.name}
                    onChange={(e) => setManualForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Amit Kumar"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {manualFormErrors.name && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Phone Number (10 digits)</label>
                  <input
                    type="tel"
                    required
                    value={manualForm.phone}
                    onChange={(e) => setManualForm(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="9876543210"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {manualFormErrors.phone && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.phone}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Email Address</label>
                  <input
                    type="email"
                    value={manualForm.email}
                    onChange={(e) => setManualForm(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="amit@example.com"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Gender</label>
                  <select
                    value={manualForm.gender}
                    onChange={(e) => setManualForm(prev => ({ ...prev, gender: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">DOB</label>
                  <input
                    type="date"
                    required
                    value={manualForm.dob}
                    onChange={(e) => setManualForm(prev => ({ ...prev, dob: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {manualFormErrors.dob && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.dob}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Height (cm)</label>
                  <input
                    type="number"
                    required
                    value={manualForm.height}
                    onChange={(e) => setManualForm(prev => ({ ...prev, height: e.target.value }))}
                    placeholder="175"
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {manualFormErrors.height && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.height}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    required
                    value={manualForm.weight}
                    onChange={(e) => setManualForm(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="70"
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {manualFormErrors.weight && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.weight}</p>}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Address</label>
                  <input
                    type="text"
                    value={manualForm.address}
                    onChange={(e) => setManualForm(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="Area, City..."
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Emergency Contact</label>
                  <input
                    type="tel"
                    value={manualForm.emergencyContact}
                    onChange={(e) => setManualForm(prev => ({ ...prev, emergencyContact: e.target.value }))}
                    placeholder="Emergency Phone..."
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="border-b pb-2 pt-4 font-bold text-xs text-indigo-400 uppercase tracking-wide">
                2. Membership Plan & Financial Opening Balances
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Membership Plan Name</label>
                  <input
                    type="text"
                    required
                    value={manualForm.planName}
                    onChange={(e) => setManualForm(prev => ({ ...prev, planName: e.target.value }))}
                    placeholder="e.g. Premium Annual"
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                  {manualFormErrors.planName && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.planName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={manualForm.startDate}
                      onChange={(e) => setManualForm(prev => ({ ...prev, startDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                    />
                    {manualFormErrors.startDate && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.startDate}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Expiry Date</label>
                    <input
                      type="date"
                      required
                      value={manualForm.expiryDate}
                      onChange={(e) => setManualForm(prev => ({ ...prev, expiryDate: e.target.value }))}
                      className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                    />
                    {manualFormErrors.expiryDate && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.expiryDate}</p>}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Total Price (₹)</label>
                  <input
                    type="number"
                    required
                    value={manualForm.totalAmount}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      const paid = Number(manualForm.amountPaid || 0);
                      setManualForm(prev => ({
                        ...prev,
                        totalAmount: e.target.value,
                        remainingDue: String(val - paid)
                      }));
                    }}
                    placeholder="12000"
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                  {manualFormErrors.totalAmount && <p className="text-xs text-rose-500 mt-1">{manualFormErrors.totalAmount}</p>}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Amount Paid (₹)</label>
                  <input
                    type="number"
                    value={manualForm.amountPaid}
                    onChange={(e) => {
                      const paid = Number(e.target.value);
                      const total = Number(manualForm.totalAmount || 0);
                      setManualForm(prev => ({
                        ...prev,
                        amountPaid: e.target.value,
                        remainingDue: String(total - paid)
                      }));
                    }}
                    placeholder="10000"
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Remaining Due (₹)</label>
                  <input
                    type="number"
                    value={manualForm.remainingDue}
                    onChange={(e) => setManualForm(prev => ({ ...prev, remainingDue: e.target.value }))}
                    placeholder="2000"
                    className="w-full px-3 py-2 rounded-xl border bg-background text-xs focus:outline-none bg-muted/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Payment Status</label>
                  <select
                    value={manualForm.paymentStatus}
                    onChange={(e) => setManualForm(prev => ({ ...prev, paymentStatus: e.target.value }))}
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  >
                    <option value="paid">Paid (Fully)</option>
                    <option value="partial">Partial Dues</option>
                    <option value="unpaid">Unpaid / Pending</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground uppercase mb-1">Medical Notes</label>
                  <input
                    type="text"
                    value={manualForm.notes}
                    onChange={(e) => setManualForm(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder="Any previous ailments or details..."
                    className="w-full px-4 py-2 rounded-xl border bg-background text-sm focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => {
                    setShowManualMigrateModal(false);
                    setManualFormErrors({});
                  }}
                  className="flex-1 py-2.5 border hover:bg-muted rounded-xl text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingManualMigration}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                >
                  {savingManualMigration ? 'Saving Migration...' : 'Confirm Manual Migration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
