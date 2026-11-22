import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  User,
  Phone,
  Mail,
  Lock,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
  Trash2,
  Building,
  ShieldCheck,
  Award,
} from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../lib/useAuth';

interface ProfileSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNotify?: (message: string) => void;
}

/**
 * Resizes and crops avatar into a square WebP/JPEG via Canvas.
 * Generates an efficient, high-fidelity fallback Data URL (~25-50KB) if storage upload fails.
 */
function compressAvatarImage(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const size = 320;
        const width = img.naturalWidth || img.width;
        const height = img.naturalHeight || img.height;
        const cropSize = Math.min(width, height);
        const cropX = (width - cropSize) / 2;
        const cropY = (height - cropSize) / 2;

        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, cropX, cropY, cropSize, cropSize, 0, 0, size, size);
          resolve(canvas.toDataURL('image/jpeg', 0.85));
        } else {
          resolve(e.target?.result as string);
        }
      };
      img.onerror = () => resolve(e.target?.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });
}

export const ProfileSettingsModal: React.FC<ProfileSettingsModalProps> = ({
  isOpen,
  onClose,
  onNotify,
}) => {
  const { user, orgName, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<'profile' | 'password'>('profile');

  // Profile Fields
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [urlInput, setUrlInput] = useState('');
  const [showUrlField, setShowUrlField] = useState(false);
  const [experienceYears, setExperienceYears] = useState('');
  const [bio, setBio] = useState('');

  // Password Fields
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // States
  const [loadingData, setLoadingData] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Feedback Messages
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch current user data from public.users table on modal open
  useEffect(() => {
    if (!isOpen || !user?.id) return;

    let isMounted = true;
    setLoadingData(true);
    setProfileSuccess(null);
    setProfileError(null);
    setPasswordSuccess(null);
    setPasswordError(null);

    async function fetchUserData() {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('full_name, phone, avatar_url, experience_years, bio')
          .eq('id', user!.id)
          .maybeSingle();

        if (isMounted) {
          if (!error && data) {
            setFullName(data.full_name || user!.user_metadata?.full_name || '');
            setPhone(data.phone || user!.user_metadata?.phone || '');
            const fetchedAvatar = data.avatar_url || user!.user_metadata?.avatar_url || '';
            setAvatarUrl(fetchedAvatar);
            setUrlInput(fetchedAvatar);
            setExperienceYears(data.experience_years || user!.user_metadata?.experience_years || '');
            setBio(data.bio || user!.user_metadata?.bio || '');
          } else {
            // Fallback to auth metadata
            setFullName(user!.user_metadata?.full_name || user!.email?.split('@')[0] || '');
            setPhone(user!.user_metadata?.phone || '');
            const metaAvatar = user!.user_metadata?.avatar_url || '';
            setAvatarUrl(metaAvatar);
            setUrlInput(metaAvatar);
            setExperienceYears(user!.user_metadata?.experience_years || '');
            setBio(user!.user_metadata?.bio || '');
          }
        }
      } catch (err: any) {
        console.warn('Error fetching user profile:', err);
        if (isMounted) {
          setFullName(user!.user_metadata?.full_name || user!.email?.split('@')[0] || '');
          setPhone(user!.user_metadata?.phone || '');
          setAvatarUrl(user!.user_metadata?.avatar_url || '');
          setExperienceYears(user!.user_metadata?.experience_years || '');
          setBio(user!.user_metadata?.bio || '');
        }
      } finally {
        if (isMounted) setLoadingData(false);
      }
    }

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [isOpen, user]);

  if (!isOpen) return null;

  // Compute initials for avatar fallback
  const initials = (
    fullName
      .split(' ')
      .filter(Boolean)
      .map((n) => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase() ||
    user?.email?.slice(0, 2).toUpperCase() ||
    'EP'
  );

  // Handle Avatar Image File Upload
  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setUploadingAvatar(true);
    setProfileError(null);

    try {
      const fileExt = file.name.split('.').pop() || 'jpg';
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      // 1. Attempt upload to Supabase Storage 'avatars' bucket
      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
        });

      if (!error && data?.path) {
        const { data: publicUrlData } = supabase.storage
          .from('avatars')
          .getPublicUrl(data.path);

        if (publicUrlData?.publicUrl) {
          setAvatarUrl(publicUrlData.publicUrl);
          setUrlInput(publicUrlData.publicUrl);
          setUploadingAvatar(false);
          return;
        }
      }

      // 2. Storage bucket not configured or error -> fallback to compressed canvas Data URL
      console.info('Supabase avatars bucket unavailable, converting to compressed avatar image…');
      const compressedDataUrl = await compressAvatarImage(file);
      setAvatarUrl(compressedDataUrl);
      setUrlInput('');
    } catch (err: any) {
      console.warn('Avatar upload fallback triggered:', err);
      const compressedDataUrl = await compressAvatarImage(file);
      setAvatarUrl(compressedDataUrl);
      setUrlInput('');
    } finally {
      setUploadingAvatar(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    setSavingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    const trimmedName = fullName.trim();
    const trimmedPhone = phone.trim();
    const finalAvatar = avatarUrl.trim();
    const trimmedExp = experienceYears.trim();
    const trimmedBio = bio.trim();

    try {
      // 1. Update public.users table
      const { error: dbError } = await supabase
        .from('users')
        .update({
          full_name: trimmedName,
          phone: trimmedPhone,
          avatar_url: finalAvatar,
          experience_years: trimmedExp,
          bio: trimmedBio,
        })
        .eq('id', user.id);

      if (dbError) {
        console.warn('Database update error on public.users:', dbError);
      }

      // 2. Update Supabase Auth user metadata so session reflects it
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          full_name: trimmedName,
          phone: trimmedPhone,
          avatar_url: finalAvatar,
          experience_years: trimmedExp,
          bio: trimmedBio,
        },
      });

      if (authError) {
        console.warn('Auth user_metadata update warning:', authError);
      }

      // 3. Immediately refresh React AuthContext so Header & other widgets update
      if (refreshUser) {
        await refreshUser();
      }

      setProfileSuccess('Profile changes saved successfully!');
      onNotify?.('Profile updated successfully!');

      setTimeout(() => {
        setProfileSuccess(null);
      }, 3500);
    } catch (err: any) {
      setProfileError(err.message || 'Failed to save profile changes. Please try again.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordSuccess(null);
    setPasswordError(null);

    if (newPassword.length < 6) {
      setPasswordError('Password must be at least 6 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match. Please verify both fields.');
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordSuccess('Your password has been changed securely.');
      setNewPassword('');
      setConfirmPassword('');
      onNotify?.('Password updated successfully!');

      setTimeout(() => {
        setPasswordSuccess(null);
      }, 4000);
    } catch (err: any) {
      setPasswordError(err.message || 'Failed to update password. Please try again.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0b1c30]/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-[#f8fafc] to-white">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#eff4ff] border border-[#dce9ff] flex items-center justify-center text-[#005d42]">
              <ShieldCheck className="w-5 h-5 text-[#005d42]" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-[#0b1c30]">
                User Profile &amp; Settings
              </h2>
              <p className="text-[12px] text-[#6e7a73]">
                Manage your broker identity, contact details, and account credentials
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 px-6 bg-slate-50/50">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'profile'
                ? 'border-[#005d42] text-[#005d42]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Profile Details</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('password')}
            className={`py-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'password'
                ? 'border-[#005d42] text-[#005d42]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Security &amp; Password</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loadingData ? (
            <div className="py-16 text-center flex flex-col items-center justify-center gap-3">
              <Loader2 className="w-7 h-7 text-[#005d42] animate-spin" />
              <p className="text-xs text-[#6e7a73] font-medium">Loading profile from database…</p>
            </div>
          ) : activeTab === 'profile' ? (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              {profileSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{profileSuccess}</span>
                </div>
              )}

              {profileError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-800 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{profileError}</span>
                </div>
              )}

              {/* Avatar Section */}
              <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-4 rounded-xl bg-slate-50 border border-slate-200/80">
                <div className="relative group shrink-0">
                  <div className="w-20 h-20 rounded-full bg-[#005d42] text-white flex items-center justify-center font-bold text-xl overflow-hidden shadow-sm border-2 border-white ring-2 ring-slate-200">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={fullName || 'Avatar'}
                        className="w-full h-full object-cover"
                        onError={() => setAvatarUrl('')}
                      />
                    ) : (
                      initials
                    )}
                  </div>
                  {uploadingAvatar && (
                    <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center">
                      <Loader2 className="w-6 h-6 text-white animate-spin" />
                    </div>
                  )}
                </div>

                <div className="flex-1 space-y-2 text-center sm:text-left">
                  <span className="text-xs font-bold text-[#0b1c30]">Profile Picture</span>
                  <p className="text-[11px] text-[#6e7a73] leading-relaxed">
                    Upload an avatar image to Supabase Storage or provide a direct image link.
                  </p>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarFile}
                      accept="image/*"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                      className="px-3 py-1.5 rounded-lg bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs disabled:opacity-50"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>{uploadingAvatar ? 'Uploading…' : 'Upload Photo'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowUrlField(!showUrlField)}
                      className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-[#0b1c30] text-xs font-medium transition-colors cursor-pointer"
                    >
                      {showUrlField ? 'Hide URL Input' : 'Use Image URL'}
                    </button>

                    {avatarUrl && (
                      <button
                        type="button"
                        onClick={() => {
                          setAvatarUrl('');
                          setUrlInput('');
                        }}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                        title="Remove photo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {showUrlField && (
                    <div className="pt-2 flex items-center gap-2">
                      <input
                        type="url"
                        value={urlInput}
                        onChange={(e) => setUrlInput(e.target.value)}
                        placeholder="https://example.com/avatar.jpg"
                        className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:ring-2 focus:ring-[#005d42] focus:outline-hidden"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          if (urlInput.trim()) {
                            setAvatarUrl(urlInput.trim());
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Sarah Jenkins"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#005d42] focus:outline-hidden transition-all bg-white"
                  />
                </div>
              </div>

              {/* Phone Number */}
              <div>
                <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +1 (310) 555-0199 or +92 300 1234567"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#005d42] focus:outline-hidden transition-all bg-white"
                  />
                </div>
              </div>

              {/* Experience Years */}
              <div>
                <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                  Experience
                </label>
                <div className="relative">
                  <Award className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="e.g. 10+ Years"
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#005d42] focus:outline-hidden transition-all bg-white"
                  />
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                  Professional Bio
                </label>
                <textarea
                  placeholder="Short professional bio..."
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#005d42] focus:outline-hidden transition-all bg-white resize-none"
                />
              </div>

              {/* Email (Readonly) */}
              <div>
                <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                  Email Address <span className="text-[11px] text-slate-400 font-normal">(Account Login)</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    disabled
                    value={user?.email || ''}
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Organization (Readonly) */}
              {orgName && (
                <div>
                  <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                    Brokerage Organization
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      disabled
                      value={orgName}
                      className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm bg-slate-100 text-slate-500 cursor-not-allowed"
                    />
                  </div>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile || !fullName.trim()}
                  className="px-5 py-2.5 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <span className="font-bold">Security Notice:</span> Changing your password will update your credentials for this device and all other active sessions.
              </div>

              {passwordSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center gap-2 text-emerald-800 text-xs animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-red-800 text-xs animate-in fade-in">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              {/* New Password */}
              <div>
                <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter at least 6 characters"
                    className="w-full pl-9.5 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#005d42] focus:outline-hidden transition-all bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-[#0b1c30] mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full pl-9.5 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-[#005d42] focus:outline-hidden transition-all bg-white"
                  />
                </div>
                {confirmPassword && newPassword !== confirmPassword && (
                  <p className="text-[11px] text-red-600 mt-1">Passwords do not match.</p>
                )}
              </div>

              {/* Action buttons */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingPassword || newPassword.length < 6 || newPassword !== confirmPassword}
                  className="px-5 py-2.5 rounded-xl bg-[#005d42] hover:bg-[#004d37] text-white text-xs font-semibold shadow-xs transition-colors flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {savingPassword && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Change Password</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
