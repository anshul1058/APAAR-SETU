import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  X, 
  ShieldCheck, 
  ChevronRight, 
  ArrowUpDown, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { studentService } from '../../services/studentService';
import { Student, VerificationStatus } from '../../types';
import { Pagination } from '../common/Pagination';
import { formatDate, formatNumber, maskApaarId, maskPhone } from '../../utils/formatters';

export const StudentDirectoryPage: React.FC = () => {
  const { refreshTrigger, openAiWithContext } = useAuth();

  const [students, setStudents] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [deptFilter, setDeptFilter] = useState('ALL');
  const [quotaFilter, setQuotaFilter] = useState('ALL');
  const [sortBy, setSortBy] = useState<keyof Student>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    fetchStudents();
  }, [currentPage, pageSize, searchQuery, statusFilter, deptFilter, quotaFilter, sortBy, sortOrder, refreshTrigger]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const res = await studentService.getStudents({
        search: searchQuery,
        status: statusFilter,
        department: deptFilter,
        quota: quotaFilter,
        page: currentPage,
        pageSize,
        sortBy,
        sortOrder
      });
      setStudents(res.data);
      setTotalStudents(res.total);
      setTotalPages(res.totalPages);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSort = (field: keyof Student) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const handleExportCsv = () => {
    studentService.exportStudentsCsv(students);
  };

  return (
    <div className="space-y-6">
      
      {/* Page Header */}
      <div className="bg-white rounded-3xl p-6 border border-stone-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <h1 className="text-xl font-bold text-slate-900">Enrolled Student Directory</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Searchable, sortable candidate registry mapped to masked 12-digit APAAR IDs and Academic Bank of Credits.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCsv}
            className="px-4 py-2.5 rounded-xl border border-stone-200 hover:bg-stone-50 text-slate-700 font-semibold text-xs flex items-center gap-2 transition-colors shadow-2xs"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Filtered CSV
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by name, masked APAAR, roll..."
              className="w-full pl-9 pr-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none text-slate-700"
            >
              <option value="ALL">All Verification Statuses</option>
              <option value="VERIFIED">Verified Only</option>
              <option value="DUPLICATE_SUSPECT">Duplicate Suspects</option>
              <option value="DISCREPANCY_FLAGGED">Discrepancy Flagged</option>
              <option value="PENDING">Pending Consent</option>
            </select>
          </div>

          <div>
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none text-slate-700"
            >
              <option value="ALL">All Departments</option>
              <option value="Computer Science & Engineering">CSE</option>
              <option value="Electronics & Communication">ECE</option>
              <option value="Mechanical Engineering">Mechanical</option>
              <option value="Electrical Engineering">Electrical</option>
              <option value="Civil Engineering">Civil</option>
            </select>
          </div>

          <div>
            <select
              value={quotaFilter}
              onChange={(e) => {
                setQuotaFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:bg-white focus:outline-none text-slate-700"
            >
              <option value="ALL">All Quotas</option>
              <option value="AICTE Sanctioned">AICTE Sanctioned</option>
              <option value="State Quota">State Quota</option>
              <option value="Management Quota">Management Quota</option>
              <option value="PMSSS (J&K Special)">PMSSS (J&K)</option>
              <option value="Lateral Entry">Lateral Entry</option>
              <option value="EWS Quota">EWS Quota</option>
            </select>
          </div>

        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500 px-1 pt-1">
          <span>Found <strong>{formatNumber(totalStudents)}</strong> matching students</span>
          {(searchQuery || statusFilter !== 'ALL' || deptFilter !== 'ALL' || quotaFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('ALL');
                setDeptFilter('ALL');
                setQuotaFilter('ALL');
                setCurrentPage(1);
              }}
              className="text-blue-600 hover:text-blue-700 font-semibold underline"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Main Table with Loading / Empty States */}
      <div className="bg-white rounded-3xl border border-stone-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto text-blue-600" />
            <p className="text-xs">Loading records from central registry...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <p className="text-sm font-bold text-slate-600">No students matched the query</p>
            <p className="text-xs">Try adjusting your search criteria or resetting filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-stone-50/70 border-b border-stone-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider">
                  <th onClick={() => handleSort('name')} className="py-3.5 px-4 cursor-pointer hover:text-blue-600">
                    <div className="flex items-center gap-1.5">
                      <span>Student</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Masked APAAR ID</th>
                  <th onClick={() => handleSort('department')} className="py-3.5 px-4 cursor-pointer hover:text-blue-600">
                    <div className="flex items-center gap-1.5">
                      <span>Department & Roll</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Admission Quota</th>
                  <th onClick={() => handleSort('abcCreditsEarned')} className="py-3.5 px-4 cursor-pointer hover:text-blue-600">
                    <div className="flex items-center gap-1.5">
                      <span>ABC Credits</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-3.5 px-4">Verification Status</th>
                  <th className="py-3.5 px-4 text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {students.map((stu) => (
                  <tr
                    key={stu.id}
                    onClick={() => setSelectedStudent(stu)}
                    className="hover:bg-blue-50/40 transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-2xs">
                          {stu.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-800">{stu.name}</p>
                          <p className="text-[10px] text-slate-400 font-mono">DOB: {formatDate(stu.dob)}</p>
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-blue-700">
                      {stu.maskedApaarId}
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
                        {formatNumber(stu.abcCreditsEarned)} pts
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          stu.verificationStatus === 'VERIFIED'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : stu.verificationStatus === 'DUPLICATE_SUSPECT'
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {stu.verificationStatus === 'VERIFIED' && <CheckCircle2 className="w-3 h-3" />}
                        {stu.verificationStatus !== 'VERIFIED' && <AlertTriangle className="w-3 h-3" />}
                        {stu.verificationStatus.replace('_', ' ')}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStudent(stu);
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
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalItems={totalStudents}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
        />
      </div>

      {/* Student Dossier Modal */}
      {selectedStudent && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs flex justify-end z-50">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto p-6 space-y-6 flex flex-col justify-between border-l border-stone-200">
            <div>
              <div className="flex items-center justify-between border-b border-stone-200 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-base text-slate-900">Candidate APAAR Dossier</h3>
                </div>
                <button
                  onClick={() => setSelectedStudent(null)}
                  className="p-1.5 rounded-full hover:bg-stone-100 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="mt-6 p-4 rounded-2xl bg-gradient-to-br from-stone-50 to-blue-50/30 border border-stone-200 flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-700 to-indigo-700 text-white font-black text-2xl flex items-center justify-center shadow-md">
                  {selectedStudent.name.charAt(0)}
                </div>
                <div>
                  <h4 className="text-base font-extrabold text-slate-900">{selectedStudent.name}</h4>
                  <p className="text-xs font-mono text-blue-700 font-bold">{selectedStudent.maskedApaarId}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Phone: {selectedStudent.maskedPhone}</p>
                </div>
              </div>

              {selectedStudent.discrepancyReason && (
                <div className="mt-4 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 text-xs">
                  <p className="font-bold flex items-center gap-1.5 mb-1 text-rose-700">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    Central Regulatory Discrepancy
                  </p>
                  <p className="leading-relaxed">{selectedStudent.discrepancyReason}</p>
                </div>
              )}

              <div className="mt-6 space-y-4 text-xs">
                <div>
                  <h5 className="font-bold text-slate-900 mb-2 uppercase text-[10px] tracking-wider text-slate-400">
                    Academic Identity & Quota
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
                      <span className="font-medium text-slate-800">{selectedStudent.program}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Admission Quota:</span>
                      <span className="font-bold text-slate-800">{selectedStudent.quota}</span>
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
                      <span className="font-extrabold text-indigo-700 text-sm">{formatNumber(selectedStudent.abcCreditsEarned)} Credits</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-indigo-900/80">DigiLocker Status:</span>
                      <span className="font-bold text-emerald-700">✓ Cryptographically Synced</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-stone-200 space-y-2">
              <button
                onClick={() => openAiWithContext(`Explain the profile and anomaly flags for student ${selectedStudent.name} (${selectedStudent.maskedApaarId})`)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                AI Profile Explanation
              </button>
              <button
                onClick={() => setSelectedStudent(null)}
                className="w-full py-2 rounded-xl border border-stone-200 text-slate-600 hover:bg-stone-50 text-xs font-semibold"
              >
                Close Dossier
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
