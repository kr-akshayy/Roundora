import { useRef, useState } from 'react';
import { Camera, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import Avatar from './Avatar';

interface AvatarUploadProps {
  userId: string;
  currentUrl?: string | null;
  name?: string | null;
  onUploaded: (url: string) => void;
}

const MAX_SIZE_MB = 3;
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default function AvatarUpload({ userId, currentUrl, name, onUploaded }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    if (!ALLOWED_TYPES.includes(file.type)) {
      setError('Only JPG, PNG, or WEBP images allowed.');
      return;
    }
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`Image must be under ${MAX_SIZE_MB}MB.`);
      return;
    }

    setUploading(true);
    const ext = file.name.split('.').pop();
    // Folder = userId, so storage policies (which check the folder name) let users
    // only touch their own files. Fixed filename means re-uploads overwrite the old photo.
    const path = `${userId}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, cacheControl: '3600' });

    if (uploadError) {
      setError(uploadError.message);
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    // cache-bust so the new photo shows immediately instead of a cached old one
    const freshUrl = `${data.publicUrl}?t=${Date.now()}`;

    const { error: profileError } = await supabase
      .from('profiles')
      .update({ avatar_url: freshUrl })
      .eq('id', userId);

    setUploading(false);

    if (profileError) {
      setError(profileError.message);
      return;
    }

    onUploaded(freshUrl);
  };

  return (
    <div>
      <div className="relative inline-block">
        <Avatar url={currentUrl} name={name} size={88} />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-brand-600 hover:bg-brand-500 border-2 border-dark-bg flex items-center justify-center transition-colors disabled:opacity-60"
          aria-label="Change profile photo"
        >
          {uploading ? (
            <Loader2 size={14} className="text-white animate-spin" />
          ) : (
            <Camera size={14} className="text-white" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
      {error && <p className="text-xs text-rose-400 mt-2">{error}</p>}
      <p className="text-xs text-slate-500 mt-2">JPG, PNG or WEBP. Max {MAX_SIZE_MB}MB.</p>
    </div>
  );
}
