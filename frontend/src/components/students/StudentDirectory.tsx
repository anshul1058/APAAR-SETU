import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  ChevronRight, 
  X, 
  Download, 
  ShieldCheck, 
  Award, 
  Building2,
  ExternalLink
} from 'lucide-react';
import { Student, VerificationStatus, QuotaType } from '../../types';
import { formatApaarId, validateVerhoeffChecksum } from '../../utils/apaarValidator';

interface StudentDirectoryProps {
  students: Student[];
  onAddStudent: (newStudent: Student) => void;
  selectedStudent: Student | null;
  onSelectStudent: (student: Student | null) => void;
  onUpdateStatus: (studentId: string, newStatus: VerificationStatus, note?: string) => void;
}

export const StudentDirectory: React.FC<StudentDirectoryProps> = ({
  students,
  onAddStudent,
  selectedStudent,
  onSelectStudent,
  onUpdateStatus
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [quotaFilter, setQuotaFilter] = useState<string>('ALL');

  // New Student Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newApaar, setNewApaar] = useState('');
  const [newName, setNewName] = useState('');
  const [newRoll, setNewRoll] = useState('');
  const [newDept, setNewDept] = useState('Computer Science & Engineering');
  const [newQuota, setNewQuota] = useState<QuotaType>('AICTE Sanctioned');
  const [addError, setAddError] = useState('');

  // Filter students
  const filteredStudents = students.filter((stu) => {
    const matchesSearch = 
      stu.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stu.apaarId.includes(searchQuery) ||
      stu.rollNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      stu.email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || stu.verificationStatus === statusFilter;
    const matchesDept = departmentFilter === 'ALL' || stu.department === departmentFilter;
    const matchesQuota = quotaFilter === 'ALL' || stu.quota === quotaFilter;

    return matchesSearch && matchesStatus && matchesDept && matchesQuota;
  });

  const handleCreateStudent = (e: React.FormEvent) => {
    e.preventDefault();
    setAddError('');

    const clean = newApaar.replace(/\D/g, '');
    if (clean.length !== 12) {
      setAddError('APAAR ID must contain exactly 12 numeric digits.');
      return;
    }

    if (!validateVerhoeffChecksum(clean)) {
      setAddError('Verhoeff Checksum failed! Please provide a mathematically valid APAAR ID.');
      return;
    }

    if (!newName.trim() || !newRoll.trim()) {
      setAddError('Please complete all required fields.');
      return;
    }

    const created: Student = {
      id: `STU-2026-${String(students.length + 1).padStart(3, '0')}`,
      apaarId: formatApaarId(clean),
      name: newName,
      aadhaarName: newName,
      dob: '2005-03-15',
      gender: 'Male',
      email: `${newRoll.toLowerCase().replace('/', '.')}@dtu.ac.in`,
      phone: '+91 98112 00000',
      rollNumber: newRoll,
      institutionId: 'INST-DTU-01',
      institutionName: 'Delhi Technological University (DTU)',
      aictePermanentId: '1-432890123',
      program: `B.Tech in ${newDept}`,
      department: newDept,
      batchYear: '2024-2028',
      currentSemester: 2,
      quota: newQuota,
      verificationStatus: 'VERIFIED',
      aadhaarLinked: true,
      digiLockerSynced: true,
      abcAccountId: `ABC-${clean.slice(0, 4)}-${clean.slice(8, 12)}`,
      abcCreditsEarned: 42,
      verificationTimestamp: new Date().toLocaleString(),
      avatarSeed: newName.toLowerCase().replace(/\s+/g, '')
    };

    onAddStudent(created);
    setShowAddModal(false);
    setNewApaar('');
    setNewName('');
    setNewRoll('');
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'VERIFIED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Verified
          </span>
        );
      case 'DUPLICATE_SUSPECT':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
            <AlertTriangle className="w-3 h-3" /> Duplicate Suspect
          </span>
        );
      case 'DISCREPANCY_FLAGGED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Flagged Mismatch
          </span>
        );
      case 'PENDING':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3" /> Consent Pending
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Header & Actions */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Institutional Student Directory</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Complete database of enrolled candidates mapped to 12-digit APAAR IDs and Academic Bank of Credits.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md shadow-blue-500/20 self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          Enroll New Student with APAAR
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-sm space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          {/* Search Input */}
          <div className="relative md:col-span-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, APAAR, roll..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none text-slate-700"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="DUPLICATE_SUSPECT">Duplicate Suspects</option>
              <option value="DISCREPANCY_FLAGGED">Discrepancy Flagged</option>
              <option value="PENDING">Pending Consent</option>
            </select>
          </div>

          {/* Department Filter */}
          <div>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none text-slate-700"
            >
              <option value="ALL">All Departments</option>
              <option value="Computer Science & Engineering">Computer Science & Engg</option>
              <option value="Electronics & Communication">Electronics & Comm</option>
              <option value="Mechanical Engineering">Mechanical Engineering</option>
              <option value="Electrical Engineering">Electrical Engineering</option>
              <option value="Civil Engineering">Civil Engineering</option>
            </select>
          </div>

          {/* Quota Filter */}
          <div>
            <select
              value={quotaFilter}
              onChange={(e) => setQuotaFilter(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none text-slate-700"
            >
              <option value="ALL">All Admission Quotas</option>
              <option value="AICTE Sanctioned">AICTE Sanctioned</option>
              <option value="State Quota">State Quota</option>
              <option value="Management Quota">Management Quota</option>
              <option value="PMSSS (J&K Special)">PMSSS (J&K)</option>
              <option value="Lateral Entry">Lateral Entry</option>
              <option value="EWS Quota">EWS Quota</option>
            </select>
          </div>

        </div>

        {/* Count Indicator */}
        <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 px-1">
          <span>Showing <strong>{filteredStudents.length}</strong> matching candidate records</span>
          {(searchQuery || statusFilter !== 'ALL' || departmentFilter !== 'ALL' || quotaFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setDepartmentFilter('ALL');
                setQuotaFilter('ALL');
              }}
              className="text-blue-600 hover:text-blue-700 font-semibold underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Students Data Table */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-stone-50/70 border-b border-stone-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                <th className="py-3.5 px-4">Student</th>
                <th className="py-3.5 px-4">12-Digit APAAR ID</th>
                <th className="py-3.5 px-4">Department & Roll</th>
                <th className="py-3.5 px-4">Quota</th>
                <th className="py-3.5 px-4">ABC Credits</th>
                <th className="py-3.5 px-4">Verification Status</th>
                <th className="py-3.5 px-4 text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filteredStudents.map((stu) => (
                <tr 
                  key={stu.id} 
                  onClick={() => onSelectStudent(stu)}
                  className={`hover:bg-blue-50/40 transition-colors cursor-pointer ${
                    selectedStudent?.id === stu.id ? 'bg-blue-50/70' : ''
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                        {stu.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">{stu.name}</p>
                        <p className="text-[11px] text-slate-400">{stu.email}</p>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-medium text-slate-800">
                    {stu.apaarId}
                  </td>

                  <td className="py-3.5 px-4">
                    <p className="text-slate-800 font-medium">{stu.department}</p>
                    <p className="text-[10px] font-mono text-slate-400">{stu.rollNumber} • Sem {stu.currentSemester}</p>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="px-2 py-0.5 rounded-full bg-stone-100 text-slate-700 text-[10px] font-medium border border-stone-200/60">
                      {stu.quota}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full text-[11px]">
                      {stu.abcCreditsEarned} pts
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    {getStatusBadge(stu.verificationStatus)}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectStudent(stu);
                      }}
                      className="p-1 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student Dossier Drawer Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-end z-50">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto p-6 space-y-6 flex flex-col justify-between">
            <div>
              {/* Drawer Header */}
              <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-base text-slate-900">Student APAAR Dossier</h3>
                </div>
                <button
                  onClick={() => onSelectStudent(null)}
                  className="p-1.5 rounded-full hover:bg-stone-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Student Overview Header */}
              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-stone-50 to-blue-50/30 border border-stone-200 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-md">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">{selectedStudent.name}</h4>
                  <p className="text-xs font-mono text-blue-700 font-bold">{selectedStudent.apaarId}</p>
                  <div className="mt-1 flex items-center gap-2">
                    {getStatusBadge(selectedStudent.verificationStatus)}
                    <span className="text-[10px] text-slate-400">Roll: {selectedStudent.rollNumber}</span>
                  </div>
                </div>
              </div>

              {/* Discrepancy Alert in Drawer if present */}
              {selectedStudent.discrepancyReason && (
                <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Regulatory Alert / Flag
                  </p>
                  <p className="leading-relaxed">{selectedStudent.discrepancyReason}</p>
                </div>
              )}

              {/* Detailed Breakdown Cards */}
              <div className="mt-6 space-y-4 text-xs">
                <div>
                  <h5 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider text-slate-400">
                    Academic Identity & Institution
                  </h5>
                  <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Institution:</span>
                      <span className="font-semibold text-slate-800 text-right">{selectedStudent.institutionName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">AICTE Permanent ID:</span>
                      <span className="font-mono font-bold text-blue-700">{selectedStudent.aictePermanentId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Program:</span>
                      <span className="font-medium text-slate-800 text-right">{selectedStudent.program}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Admission Quota:</span>
                      <span className="font-bold text-slate-800">{selectedStudent.quota}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Batch / Semester:</span>
                      <span className="font-medium text-slate-800">{selectedStudent.batchYear} (Semester {selectedStudent.currentSemester})</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h5 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider text-slate-400">
                    NEP Academic Bank of Credits (ABC)
                  </h5>
                  <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2.5">
                    <div className="flex justify-between">
                      <span className="text-indigo-900/80">ABC Account ID:</span>
                      <span className="font-mono font-bold text-indigo-700">{selectedStudent.abcAccountId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-indigo-900/80">Earned Credits:</span>
                      <span className="font-extrabold text-indigo-700 text-sm">{selectedStudent.abcCreditsEarned} Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-indigo-900/80">DigiLocker Status:</span>
                      <span className="font-bold text-emerald-700">✓ Cryptographically Synced</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons in Drawer */}
            <div className="pt-4 border-t border-stone-200 space-y-2">
              {selectedStudent.verificationStatus !== 'VERIFIED' && (
                <button
                  onClick={() => {
                    onUpdateStatus(selectedStudent.id, 'VERIFIED');
                  }}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors"
                >
                  Confirm & Mark APAAR Verified
                </button>
              )}
              {selectedStudent.verificationStatus !== 'DISCREPANCY_FLAGGED' && (
                <button
                  onClick={() => {
                    onUpdateStatus(selectedStudent.id, 'DISCREPANCY_FLAGGED', 'Manual verification discrepancy flagged by institutional officer');
                  }}
                  className="w-full py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 font-semibold text-xs transition-colors"
                >
                  Flag Discrepancy for Inspection
                </button>
              )}
              <button
                onClick={() => onSelectStudent(null)}
                className="w-full py-2 rounded-xl border border-stone-200 text-slate-600 hover:bg-stone-50 text-xs font-semibold"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 w-full max-w-md shadow-2xl border border-stone-200">
            <div className="flex items-center justify-between pb-3 border-b border-stone-200 mb-4">
              <h3 className="font-bold text-base text-slate-900">Enroll New Candidate</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {addError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                {addError}
              </div>
            )}

            <form onSubmit={handleCreateStudent} className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">12-Digit APAAR ID *</label>
                <input
                  type="text"
                  value={newApaar}
                  onChange={(e) => setNewApaar(formatApaarId(e.target.value))}
                  placeholder="e.g. 9042-3819-5502"
                  maxLength={14}
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl font-mono text-sm focus:border-blue-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">Must satisfy mathematical Verhoeff checksum.</p>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Full Student Name (as per Aadhaar) *</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Kavya Sundaram"
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Institutional Roll Number *</label>
                <input
                  type="text"
                  value={newRoll}
                  onChange={(e) => setNewRoll(e.target.value)}
                  placeholder="e.g. 2024/CSE/154"
                  required
                  className="w-full px-3 py-2 border border-stone-300 rounded-xl text-sm font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-slate-700 block mb-1">Department</label>
                  <select
                    value={newDept}
                    onChange={(e) => setNewDept(e.target.value)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="Computer Science & Engineering">CSE</option>
                    <option value="Electronics & Communication">ECE</option>
                    <option value="Mechanical Engineering">Mechanical</option>
                    <option value="Electrical Engineering">Electrical</option>
                    <option value="Civil Engineering">Civil</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Admission Quota</label>
                  <select
                    value={newQuota}
                    onChange={(e) => setNewQuota(e.target.value as QuotaType)}
                    className="w-full px-3 py-2 border border-stone-300 rounded-xl text-xs focus:border-blue-500 focus:outline-none"
                  >
                    <option value="AICTE Sanctioned">AICTE Sanctioned</option>
                    <option value="State Quota">State Quota</option>
                    <option value="Management Quota">Management</option>
                    <option value="PMSSS (J&K Special)">PMSSS</option>
                    <option value="Lateral Entry">Lateral Entry</option>
                    <option value="EWS Quota">EWS Quota</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                >
                  Register Candidate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
