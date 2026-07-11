import React, { useEffect, useState } from 'react';
import Topbar from '../components/Topbar.jsx';
import { api } from '../api/client.js';
import { useAppState } from '../state/AppState.jsx';
import { 
  Users2, 
  UserPlus, 
  Shield, 
  Trash2, 
  UserCheck, 
  RefreshCw, 
  KeyRound, 
  ChevronDown, 
  X, 
  Plus, 
  AlertCircle 
} from 'lucide-react';

export default function Users() {
  const { user: currentUser, showToast } = useAppState();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Invite Form state
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteEmailRole] = useState('Cashier');
  const [inviting, setInviting] = useState(false);

  // Verification state (OTP verification)
  const [verificationModal, setVerificationModal] = useState(null); // { email, verifyToken, otpCode, name }
  const [otpInput, setOtpInput] = useState('');
  const [verifying, setVerifying] = useState(false);

  // Role Update state
  const [editingUser, setEditingUser] = useState(null); // { email, currentRole }
  const [updatingRole, setUpdatingRole] = useState(false);

  // Fetch all users
  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await api.users();
      if (res && res.success && Array.isArray(res.users)) {
        setUsers(res.users);
      }
    } catch (err) {
      console.error('Failed to fetch staff directory:', err);
      showToast('Could not load staff roster', true);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // Handle Invite Form Submission
  const handleInvite = async (e) => {
    e.preventDefault();
    if (!inviteName.trim() || !inviteEmail.trim()) {
      showToast('Please fill in name and email fields', true);
      return;
    }
    setInviting(true);
    try {
      const res = await api.inviteUser({
        email: inviteEmail.trim(),
        name: inviteName.trim(),
        role: inviteRole
      });

      if (res && res.success) {
        showToast(res.message || 'Invitation sent successfully!');
        // Open the verification modal so the invited staff member can type the
        // 6-digit code that was emailed to them. The OTP is delivered by email
        // only — the backend no longer returns it to the caller (that was a
        //security hole). If SMTP isn't configured, the invitee is staged as
        // pending until an admin configures email delivery.
        if (res.warning === 'smtp_not_configured') {
          showToast('Email delivery is not configured — the invitee is staged as pending. Configure SMTP in Settings to send codes.', true);
        }
        setVerificationModal({
          email: inviteEmail.trim(),
          name: inviteName.trim()
        });

        // Clear inputs
        setInviteName('');
        setInviteEmail('');
        setInviteEmailRole('Cashier');

        // Refresh users roster in background
        fetchUsers(true);
      } else {
        throw new Error(res?.error || 'Invitation failed');
      }
    } catch (err) {
      showToast(err.message || 'Failed to send invitation', true);
    } finally {
      setInviting(false);
    }
  };

  // Handle Verification OTP Submission
  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      showToast('Please enter the 6-digit verification code', true);
      return;
    }
    setVerifying(true);
    try {
      const res = await api.verifyOtp({
        email: verificationModal.email,
        otp: otpInput.trim(),
        verifyToken: verificationModal.verifyToken
      });

      if (res && res.success) {
        showToast('Staff account verified and activated!');
        setVerificationModal(null);
        setOtpInput('');
        fetchUsers();
      } else {
        throw new Error(res?.error || 'Verification failed');
      }
    } catch (err) {
      showToast(err.message || 'Invalid code. Verification failed.', true);
    } finally {
      setVerifying(false);
    }
  };

  // Handle User Deletion
  const handleDeleteUser = async (email) => {
    if (email === currentUser?.email) {
      showToast('You cannot remove your own master admin account', true);
      return;
    }
    if (!window.confirm(`Are you sure you want to remove staff member ${email}?`)) {
      return;
    }
    try {
      const res = await api.deleteUser({ email });
      if (res && res.success) {
        showToast('Staff member removed successfully');
        fetchUsers();
      } else {
        throw new Error(res?.error || 'Failed to remove staff');
      }
    } catch (err) {
      showToast(err.message || 'Failed to remove staff', true);
    }
  };

  // Handle Role Update Submission
  const handleRoleUpdate = async (newRole) => {
    setUpdatingRole(true);
    try {
      const res = await api.updateUserRole({
        email: editingUser.email,
        role: newRole
      });

      if (res && res.success) {
        showToast(`Role updated successfully to ${newRole}`);
        setEditingUser(null);
        fetchUsers();
      } else {
        throw new Error(res?.error || 'Failed to update role');
      }
    } catch (err) {
      showToast(err.message || 'Error updating staff role', true);
    } finally {
      setUpdatingRole(false);
    }
  };

  // Helper: Role color chips
  const getRoleBadgeClasses = (role) => {
    switch (role) {
      case 'Admin': return 'bg-brass-500/10 text-brass-500 border border-brass-400/20';
      case 'Manager': return 'bg-amber-500/10 text-amber-500 border border-amber-400/20';
      case 'Cashier': return 'bg-sky-500/10 text-sky-400 border border-sky-400/10';
      case 'Waiter': return 'bg-mint/10 text-mint border border-mint/20';
      case 'Chef': return 'bg-clay/10 text-clay border border-clay/20';
      default: return 'bg-counter-700 text-counter-600 border border-counter-700';
    }
  };

  // Helper: Get user initials
  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  // Gating check: only Admins and Managers should manage staff
  const isAuthorized = currentUser?.role === 'Admin' || currentUser?.role === 'Manager' || currentUser?.permissions?.includes('admin_settings');

  if (!isAuthorized) {
    return (
      <div className="flex-1 flex flex-col min-w-0 bg-counter-950">
        <Topbar title="Staff Directory" subtitle="Access Restricted" />
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center max-w-md mx-auto space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-clay/10 border border-clay/30 flex items-center justify-center text-clay">
            <AlertCircle size={24} />
          </div>
          <h2 className="font-display font-bold text-lg text-paper">Permission Denied</h2>
          <p className="text-sm text-counter-600">
            You are logged in as <span className="font-semibold text-paper">{currentUser?.role || 'Guest'}</span>. Staff directory access and user management is strictly restricted to register Administrators and Managers.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-counter-950 overflow-y-auto">
      <Topbar title="Staff Directory" subtitle={`${users.length} registered staff members`} />

      <div className="p-8 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Staff Roster Table */}
        <div className="lg:col-span-8 bg-counter-900 border border-counter-700/60 rounded-3xl overflow-hidden shadow-sm flex flex-col relative">
          <div className="p-6 border-b border-counter-700/60 flex items-center justify-between">
            <div>
              <h3 className="font-display font-bold text-paper text-base">Active Register Nodes</h3>
              <p className="text-[11px] text-counter-600 mt-0.5">Roster of authorized personnel and their access terminals.</p>
            </div>
            <button 
              onClick={() => fetchUsers()} 
              disabled={loading}
              className="p-2 bg-counter-800 hover:bg-counter-700 border border-counter-700/60 rounded-xl transition-all text-counter-600 hover:text-paper disabled:opacity-40"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>

          <div className="divide-y divide-counter-700/40 overflow-x-auto">
            {loading && users.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-3">
                <div className="w-6 h-6 border-2 border-brass-500 border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-mono text-counter-600">Querying secure roster…</span>
              </div>
            ) : users.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center justify-center gap-2">
                <Users2 className="w-10 h-10 text-counter-700 mb-1" />
                <p className="text-sm font-semibold text-paper">No extra staff members</p>
                <p className="text-xs text-counter-600 max-w-xs">You are currently operating as the sole master admin register. Invite staff members to access other terminals.</p>
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] font-mono font-bold uppercase tracking-wider text-counter-600 border-b border-counter-700/40 bg-counter-950/20">
                    <th className="py-3.5 px-6">Personnel</th>
                    <th className="py-3.5 px-4">Role / Permissions</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-counter-700/20 text-xs">
                  {users.map((u, i) => {
                    const isSelf = u.email === currentUser?.email;
                    return (
                      <tr key={u.email || i} className="hover:bg-counter-800/10 transition-colors group">
                        {/* 1. Personnel profile info */}
                        <td className="py-4 px-6 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-counter-800 border border-counter-700/60 text-paper flex items-center justify-center font-display font-semibold text-xs shrink-0 select-none shadow-inner">
                            {getInitials(u.name)}
                          </div>
                          <div className="min-w-0">
                            <span className="font-semibold text-paper block truncate">{u.name} {isSelf && <span className="text-[10px] font-mono text-brass-500 font-bold ml-1 uppercase bg-brass-500/10 px-1.5 py-0.5 rounded-full">You</span>}</span>
                            <span className="text-[10px] text-counter-600 block truncate mt-0.5">{u.email}</span>
                          </div>
                        </td>

                        {/* 2. Role badge & Permissions list */}
                        <td className="py-4 px-4">
                          <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${getRoleBadgeClasses(u.role)}`}>
                            {u.role || 'Cashier'}
                          </span>
                          <span className="text-[10px] font-mono text-counter-600 block mt-1 truncate max-w-[150px]">
                            {u.permissions?.join(', ') || 'No permissions'}
                          </span>
                        </td>

                        {/* 3. Status badge */}
                        <td className="py-4 px-4">
                          {u.status === 'pending' ? (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-amber-500 font-mono bg-amber-500/5 border border-amber-500/20 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                              <span>PENDING</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-mint font-mono bg-mint/5 border border-mint/15 px-2 py-0.5 rounded-full">
                              <span className="w-1.5 h-1.5 rounded-full bg-mint" />
                              <span>ACTIVE</span>
                            </span>
                          )}
                        </td>

                        {/* 4. Actions buttons */}
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {/* Verify OTP action for pending staff */}
                            {u.status === 'pending' && (
                              <button
                                onClick={() => setVerificationModal({ email: u.email, name: u.name, verifyToken: '', otpCode: '' })}
                                className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-counter-950 font-bold rounded-lg text-[10px] uppercase tracking-wider cursor-pointer shadow transition-all"
                              >
                                Verify
                              </button>
                            )}

                            {/* Edit Role action */}
                            {!isSelf && (
                              <button
                                onClick={() => setEditingUser({ email: u.email, currentRole: u.role || 'Cashier' })}
                                className="p-1.5 hover:bg-counter-800 text-counter-600 hover:text-paper rounded-lg transition-colors cursor-pointer"
                                title="Change Role"
                              >
                                <Shield size={14} />
                              </button>
                            )}

                            {/* Delete action */}
                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u.email)}
                                className="p-1.5 hover:bg-rose-500/10 text-counter-600 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                                title="Remove Staff"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Right Column: Invite Form */}
        <div className="lg:col-span-4 bg-counter-900 border border-counter-700/60 rounded-3xl p-6 shadow-sm flex flex-col gap-5 relative overflow-hidden">
          {/* Top gloss line */}
          <div className="absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent via-brass-500/30 to-transparent" />
          
          <div>
            <h3 className="font-display font-bold text-paper text-base flex items-center gap-2">
              <UserPlus className="w-4 h-4 text-brass-500" />
              <span>Invite Staff Personnel</span>
            </h3>
            <p className="text-[11px] text-counter-600 mt-1 leading-relaxed">
              Create a new register node user. They will receive a 6-digit OTP code to verify their credentials on the terminal.
            </p>
          </div>

          <form onSubmit={handleInvite} className="space-y-4 text-left">
            {/* Input Name */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-counter-600 uppercase tracking-wider font-mono">Full Name</label>
              <input
                type="text"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                placeholder="e.g. Sarah Connor"
                className="w-full bg-counter-950 border border-counter-700/80 rounded-xl px-3 py-2.5 text-xs text-paper focus-ring outline-none placeholder:text-counter-700 font-sans"
                required
              />
            </div>

            {/* Input Email */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-counter-600 uppercase tracking-wider font-mono">Email Address</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="e.g. sarah@cyberdyne.io"
                className="w-full bg-counter-950 border border-counter-700/80 rounded-xl px-3 py-2.5 text-xs text-paper focus-ring outline-none placeholder:text-counter-700 font-sans"
                required
              />
            </div>

            {/* Role dropdown */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-counter-600 uppercase tracking-wider font-mono">Register Role</label>
              <div className="relative">
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteEmailRole(e.target.value)}
                  className="w-full bg-counter-950 border border-counter-700/80 rounded-xl px-3 py-2.5 text-xs text-paper focus-ring outline-none appearance-none cursor-pointer font-sans"
                >
                  <option value="Admin">Admin (Full Access & Settings)</option>
                  <option value="Manager">Manager (Register Shifts & Reports)</option>
                  <option value="Cashier">Cashier (POS Checkout Terminal)</option>
                  <option value="Waiter">Waiter (Tables & Orders Only)</option>
                  <option value="Chef">Chef (Kitchen Order Ticket Terminal)</option>
                </select>
                <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-counter-600">
                  <ChevronDown size={14} />
                </div>
              </div>
            </div>

            {/* Action Submit */}
            <button
              type="submit"
              disabled={inviting}
              className="w-full mt-2 bg-brass-500 hover:bg-brass-400 text-counter-950 font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              {inviting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-counter-950 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">Generating register credentials…</span>
                </>
              ) : (
                <>
                  <Plus className="w-3.5 h-3.5" />
                  <span className="text-xs">Invite Staff Member</span>
                </>
              )}
            </button>
          </form>

          {/* Secure Warning */}
          <div className="bg-counter-950/40 border border-counter-700/40 p-4 rounded-xl text-[10px] text-counter-600 leading-relaxed text-left flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-brass-500 shrink-0 mt-0.5" />
            <span>Role changes apply instantly. Staff members must use their OTP on their custom login interface to authenticate with CloudHub.</span>
          </div>

        </div>

      </div>

      {/* 1. Verification Modal (OTP verification) */}
      {verificationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-counter-800 border border-counter-700 max-w-md w-full rounded-3xl p-6 shadow-drawer relative animate-scaleIn text-left space-y-4">
            
            <div className="flex items-center justify-between border-b border-counter-700 pb-3">
              <h4 className="font-display font-bold text-paper text-base flex items-center gap-2">
                <KeyRound className="w-4.5 h-4.5 text-brass-500" />
                <span>Verify & Activate Staff</span>
              </h4>
              <button 
                onClick={() => {
                  setVerificationModal(null);
                  setOtpInput('');
                }} 
                className="text-counter-600 hover:text-paper"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-2">
              <p className="text-xs text-counter-600 leading-relaxed">
                Enter the 6-digit OTP code generated for <span className="font-semibold text-paper">{verificationModal.name}</span> (<span className="text-[11px] font-mono text-counter-600">{verificationModal.email}</span>) to verify and activate their profile instantly.
              </p>
              
              {/* Dev/Fallback OTP announcement */}
              {verificationModal.otpCode && (
                <div className="bg-brass-500/10 border border-brass-400/25 p-3 rounded-xl flex flex-col gap-1 text-left">
                  <span className="text-[9px] font-bold text-brass-500 uppercase tracking-widest font-mono">SANDBOX DEV BYPASS</span>
                  <p className="text-[11px] text-counter-600 leading-relaxed">
                    SMTP server is in test mode. The secure backend generated the OTP directly:
                  </p>
                  <span className="text-lg font-bold font-mono text-paper tracking-wider bg-counter-900/80 px-2.5 py-1 rounded border border-counter-700/60 inline-block w-fit mt-1 select-all cursor-pointer" title="Click to select">
                    {verificationModal.otpCode}
                  </span>
                </div>
              )}
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[9px] font-bold text-counter-600 uppercase tracking-wider font-mono">6-Digit Verification Code</label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => setOtpInput(e.target.value.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 123456"
                  className="w-full bg-counter-950 border border-counter-700/80 rounded-xl px-4 py-3 text-center text-lg font-mono font-bold tracking-widest text-brass-500 focus-ring outline-none"
                  required
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setVerificationModal(null);
                    setOtpInput('');
                  }}
                  className="w-1/2 bg-counter-900 hover:bg-counter-900/60 text-counter-600 font-bold py-2.5 rounded-xl text-xs cursor-pointer border border-counter-700"
                >
                  Close & Skip
                </button>
                <button
                  type="submit"
                  disabled={verifying}
                  className="w-1/2 bg-brass-500 hover:bg-brass-400 text-counter-950 font-bold py-2.5 rounded-xl text-xs cursor-pointer disabled:opacity-40 flex items-center justify-center gap-1.5"
                >
                  {verifying ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-counter-950 border-t-transparent rounded-full animate-spin" />
                      <span>Verifying…</span>
                    </>
                  ) : (
                    <>
                      <UserCheck size={14} />
                      <span>Verify & Activate</span>
                    </>
                  )}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

      {/* 2. Editing User Role Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-paper/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-counter-800 border border-counter-700 max-w-sm w-full rounded-3xl p-6 shadow-drawer relative animate-scaleIn text-left space-y-4">
            
            <div className="flex items-center justify-between border-b border-counter-700 pb-3">
              <h4 className="font-display font-bold text-paper text-base flex items-center gap-2">
                <Shield className="w-4.5 h-4.5 text-brass-500" />
                <span>Change Staff Access Role</span>
              </h4>
              <button onClick={() => setEditingUser(null)} className="text-counter-600 hover:text-paper">
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-counter-600 leading-relaxed">
              Modify access permissions for staff account <span className="font-semibold text-paper font-mono">{editingUser.email}</span>. Changes take effect on their next terminal API sync.
            </p>

            <div className="grid grid-cols-1 gap-2 pt-2">
              {['Admin', 'Manager', 'Cashier', 'Waiter', 'Chef'].map((roleOption) => {
                const isSelected = editingUser.currentRole === roleOption;
                return (
                  <button
                    key={roleOption}
                    onClick={() => handleRoleUpdate(roleOption)}
                    disabled={updatingRole}
                    className={`w-full p-3 rounded-xl border text-left text-xs font-semibold flex items-center justify-between cursor-pointer transition-all ${
                      isSelected 
                        ? 'bg-brass-500/10 border-brass-500 text-brass-500' 
                        : 'bg-counter-900 border-counter-700/60 hover:bg-counter-800 text-counter-600 hover:text-paper'
                    }`}
                  >
                    <span>{roleOption} Access Node</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-brass-500" />}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setEditingUser(null)}
              className="w-full bg-counter-900 hover:bg-counter-900/60 text-counter-600 font-bold py-2.5 rounded-xl text-xs cursor-pointer border border-counter-700 mt-2"
            >
              Cancel
            </button>

          </div>
        </div>
      )}

    </div>
  );
}
