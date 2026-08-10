import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../lib/auth-store';
import AvatarUpload from '../components/AvatarUpload';
import { TOPICS } from '../lib/topics';

export default function EditProfile() {
  const { session, profile, refreshProfile } = useAuthStore();
  const navigate = useNavigate();

  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url ?? null);
  const [fullName, setFullName] = useState(profile?.full_name ?? '');
  const [headline, setHeadline] = useState(profile?.headline ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [company, setCompany] = useState(profile?.company ?? '');
  const [yearsExperience, setYearsExperience] = useState(profile?.years_experience?.toString() ?? '');
  const [price, setPrice] = useState(profile?.price_per_session?.toString() ?? '');
  const [expertise, setExpertise] = useState<string[]>(profile?.expertise ?? []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!session || !profile) return null;

  const toggleExpertise = (id: string) => {
    setExpertise((prev) => (prev.includes(id) ? prev.filter((t) => t !== id) : [...prev, id]));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaved(false);
    setSaving(true);

    const updates: Record<string, unknown> = {
      full_name: fullName,
      headline: headline || null,
      bio: bio || null,
      avatar_url: avatarUrl || null,
    };

    if (profile.role === 'mentor') {
      updates.company = company || null;
      updates.years_experience = yearsExperience ? Number(yearsExperience) : null;
      updates.price_per_session = price ? Number(price) : null;
      updates.expertise = expertise;
    }

    const { error: updateError } = await supabase.from('profiles').update(updates).eq('id', session.user.id);

    setSaving(false);

    if (updateError) {
      setError(updateError.message);
      return;
    }

    await refreshProfile();
    setSaved(true);
  };

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <h1 className="text-2xl font-bold mb-1">Edit profile</h1>
      <p className="text-slate-500 text-sm mb-8">
        {profile.role === 'mentor'
          ? 'This is what students see when browsing interviewers.'
          : 'Update your basic details.'}
      </p>

      <div className="mb-8">
        <AvatarUpload
          userId={session.user.id}
          currentUrl={avatarUrl}
          name={fullName}
          onUploaded={(url) => setAvatarUrl(url)}
        />
      </div>

      <form onSubmit={handleSubmit} className="card p-6 space-y-4">
        {error && (
          <div className="alert-error">
            <AlertCircle size={15} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}
        {saved && (
          <div className="alert-success">
            <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
            Profile updated.
          </div>
        )}

        <div>
          <label className="label-text">Full name</label>
          <input required value={fullName} onChange={(e) => setFullName(e.target.value)} className="input-field" />
        </div>

        <div>
          <label className="label-text">Headline</label>
          <input
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            className="input-field"
            placeholder={profile.role === 'mentor' ? 'Senior Engineer at Acme' : 'Preparing for SDE roles'}
          />
        </div>

        <div>
          <label className="label-text">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="input-field min-h-24 resize-none"
            placeholder="A few lines about your background..."
          />
        </div>

        {profile.role === 'mentor' && (
          <>
            <div>
              <label className="label-text">Topics you can interview for</label>
              <div className="flex flex-wrap gap-2">
                {TOPICS.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleExpertise(t.id)}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-all ${
                      expertise.includes(t.id)
                        ? 'bg-brand-50 border-brand-500 text-brand-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-text">Company</label>
              <input value={company} onChange={(e) => setCompany(e.target.value)} className="input-field" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label-text">Years of experience</label>
                <input
                  type="number"
                  min={0}
                  value={yearsExperience}
                  onChange={(e) => setYearsExperience(e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="label-text">Price / session (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>
          </>
        )}

        <div className="flex gap-3 pt-2">
          <button type="submit" disabled={saving} className="btn-primary flex-1">
            {saving ? 'Saving...' : 'Save changes'}
          </button>
          <button type="button" onClick={() => navigate('/dashboard')} className="btn-secondary">
            Back
          </button>
        </div>
      </form>
    </div>
  );
}
