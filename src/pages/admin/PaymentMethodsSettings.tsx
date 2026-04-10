// src/pages/admin/PaymentMethodsSettings.tsx
// Admin page: toggle, edit, reorder, and upload QR codes for payment methods

import { useState, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  fetchPaymentMethods,
  togglePaymentMethod,
  updatePaymentHandle,
  updatePaymentNote,
  uploadQrCode,
  removeQrCode,
  reorderPaymentMethods,
} from '@/lib/admin/payment-methods-config-service';
import type { PaymentMethodConfig } from '@/types/deposit';
import { GripVertical, Upload, Trash2, Save, AlertCircle } from 'lucide-react';

const QK = ['payment-methods-config'];

export default function PaymentMethodsSettings() {
  const queryClient = useQueryClient();
  const { data: methods = [], isLoading } = useQuery({
    queryKey: QK,
    queryFn: fetchPaymentMethods,
  });

  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const toggleMut = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      togglePaymentMethod(id, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK });
      toast.success('Payment method updated');
    },
    onError: () => toast.error('Failed to update'),
  });

  const reorderMut = useMutation({
    mutationFn: reorderPaymentMethods,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK });
      toast.success('Order saved');
    },
    onError: () => toast.error('Failed to reorder'),
  });

  const handleDragStart = useCallback((idx: number) => setDragIdx(idx), []);
  const handleDragOver = useCallback(
    (e: React.DragEvent, overIdx: number) => {
      e.preventDefault();
      if (dragIdx === null || dragIdx === overIdx) return;
      const reordered = [...methods];
      const [moved] = reordered.splice(dragIdx, 1);
      reordered.splice(overIdx, 0, moved);
      // Optimistic UI — save happens on drop
      queryClient.setQueryData(QK, reordered);
      setDragIdx(overIdx);
    },
    [dragIdx, methods, queryClient],
  );

  const handleDrop = useCallback(() => {
    setDragIdx(null);
    // Persist final order
    const current = queryClient.getQueryData<PaymentMethodConfig[]>(QK);
    if (current) {
      reorderMut.mutate(current.map((m, i) => ({ id: m.id, display_order: i })));
    }
  }, [queryClient, reorderMut]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Payment Methods</h1>
      <p className="text-sm text-gray-500">
        Enable or disable payment methods, set handles, and upload QR codes. Drag to reorder.
      </p>

      {isLoading ? (
        <p className="text-gray-500">Loading...</p>
      ) : methods.length === 0 ? (
        <p className="text-gray-500">No payment methods configured.</p>
      ) : (
        <div className="space-y-3">
          {methods.map((m, idx) => (
            <div
              key={m.id}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragOver={(e) => handleDragOver(e, idx)}
              onDrop={handleDrop}
              className={dragIdx === idx ? 'opacity-50' : ''}
            >
              <PaymentMethodCard
                method={m}
                onToggle={(enabled) => toggleMut.mutate({ id: m.id, enabled })}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PaymentMethodCard({
  method: m,
  onToggle,
}: {
  method: PaymentMethodConfig;
  onToggle: (enabled: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [handle, setHandle] = useState(m.handle_or_recipient ?? '');
  const [note, setNote] = useState(m.payment_note ?? '');
  const [dirty, setDirty] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveMut = useMutation({
    mutationFn: async () => {
      await Promise.all([
        updatePaymentHandle(m.id, handle),
        updatePaymentNote(m.id, note),
      ]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK });
      setDirty(false);
      toast.success('Saved');
    },
    onError: () => toast.error('Failed to save'),
  });

  const uploadMut = useMutation({
    mutationFn: (file: File) => uploadQrCode(m.id, m.method_key, file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK });
      toast.success('QR code uploaded');
    },
    onError: () => toast.error('Upload failed'),
  });

  const removeMut = useMutation({
    mutationFn: () => removeQrCode(m.id, m.qr_code_storage_path!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QK });
      toast.success('QR code removed');
    },
    onError: () => toast.error('Failed to remove QR code'),
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Drag handle */}
          <div className="cursor-grab pt-1 text-gray-400 hover:text-gray-600">
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Main content */}
          <div className="flex-1 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-800">{m.display_name}</span>
                <Badge variant="outline" className="text-xs">
                  {m.method_key}
                </Badge>
                {m.requires_manual_confirm && (
                  <Badge variant="secondary" className="text-xs flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Manual confirm
                  </Badge>
                )}
              </div>
              <Switch
                checked={m.is_enabled}
                onCheckedChange={onToggle}
              />
            </div>

            {/* Handle + note */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-gray-500">Handle / Recipient</Label>
                <Input
                  value={handle}
                  onChange={(e) => { setHandle(e.target.value); setDirty(true); }}
                  placeholder="e.g. @dreampuppies"
                  className="mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-gray-500">Payment Note</Label>
                <Input
                  value={note}
                  onChange={(e) => { setNote(e.target.value); setDirty(true); }}
                  placeholder="Instructions shown to buyer"
                  className="mt-1"
                />
              </div>
            </div>

            {/* QR code + save */}
            <div className="flex items-end gap-3 flex-wrap">
              {/* QR preview */}
              {m.qr_code_public_url ? (
                <div className="flex items-center gap-2">
                  <img
                    src={m.qr_code_public_url}
                    alt={`${m.display_name} QR`}
                    className="h-16 w-16 rounded border object-contain"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeMut.mutate()}
                    disabled={removeMut.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              ) : (
                <>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadMut.mutate(f);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploadMut.isPending}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {uploadMut.isPending ? 'Uploading...' : 'Upload QR'}
                  </Button>
                </>
              )}

              {dirty && (
                <Button
                  size="sm"
                  onClick={() => saveMut.mutate()}
                  disabled={saveMut.isPending}
                >
                  <Save className="h-4 w-4 mr-1" />
                  {saveMut.isPending ? 'Saving...' : 'Save'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
