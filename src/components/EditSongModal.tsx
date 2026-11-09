import { useEffect, useState } from 'react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import Input from './ui/Input';
import type { Song } from '@/types';
import { updateSong } from '@/lib/songs';
import { useToast } from '@/context/ToastContext';

interface EditSongModalProps {
  open: boolean;
  onClose: () => void;
  song: Song | null;
  onSaved: () => void;
}

export default function EditSongModal({ open, onClose, song, onSaved }: EditSongModalProps) {
  const { showToast } = useToast();
  const [form, setForm] = useState({ title: '', artist: '', album: '', genre: '', year: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (song) {
      setForm({
        title: song.title,
        artist: song.artist,
        album: song.album,
        genre: song.genre,
        year: song.year ? String(song.year) : '',
      });
    }
  }, [song]);

  const handleSave = async () => {
    if (!song) return;
    setSaving(true);
    try {
      await updateSong(song.id, {
        title: form.title.trim() || song.title,
        artist: form.artist.trim() || 'Unknown Artist',
        album: form.album.trim(),
        genre: form.genre.trim(),
        year: form.year ? parseInt(form.year, 10) : null,
      });
      showToast('Song details updated', 'success');
      onSaved();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update song', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Edit Song Details" size="md">
      <div className="p-6 space-y-4">
        <Input label="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
        <Input label="Artist" value={form.artist} onChange={(e) => setForm({ ...form, artist: e.target.value })} />
        <Input label="Album" value={form.album} onChange={(e) => setForm({ ...form, album: e.target.value })} />
        <div className="grid grid-cols-2 gap-4">
          <Input label="Genre" value={form.genre} onChange={(e) => setForm({ ...form, genre: e.target.value })} />
          <Input label="Year" type="number" value={form.year} onChange={(e) => setForm({ ...form, year: e.target.value })} />
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
