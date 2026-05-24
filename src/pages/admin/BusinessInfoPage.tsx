import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { AlertCircle, CheckCircle2, Loader } from 'lucide-react';

interface SiteSettings {
  phone: string;
  phone_raw: string;
  email: string;
  locations: Array<{ city: string; state: string; isPrimary: boolean }>;
}

export function BusinessInfoPage() {
  const [isEditing, setIsEditing] = useState(false);
  const [locations, setLocations] = useState<SiteSettings['locations']>([]);
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ['site-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('phone, phone_raw, email, locations')
        .eq('id', 1)
        .single();

      if (error) throw error;
      return data as SiteSettings;
    },
  });

  // Initialize form when data loads
  useState(() => {
    if (settings) {
      setPhone(settings.phone);
      setEmail(settings.email);
      setLocations(settings.locations || []);
    }
  }, [settings]);

  // Mutation to update settings
  const updateMutation = useMutation({
    mutationFn: async () => {
      // Auto-generate phone_raw from phone (remove non-digits)
      const phoneRaw = phone.replace(/\D/g, '');

      const { error } = await supabase
        .from('site_settings')
        .update({
          phone,
          phone_raw: phoneRaw,
          email,
          locations,
          updated_at: new Date().toISOString(),
        })
        .eq('id', 1);

      if (error) throw error;
    },
    onSuccess: () => {
      setIsEditing(false);
      // Invalidate cache so other components see the update
      window.location.reload();
    },
  });

  const handleAddLocation = () => {
    setLocations([...locations, { city: '', state: '', isPrimary: false }]);
  };

  const handleRemoveLocation = (index: number) => {
    setLocations(locations.filter((_, i) => i !== index));
  };

  const handleLocationChange = (
    index: number,
    field: 'city' | 'state' | 'isPrimary',
    value: string | boolean
  ) => {
    const updated = [...locations];
    updated[index] = { ...updated[index], [field]: value };
    setLocations(updated);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader className="animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Card>
        <CardHeader>
          <CardTitle>Business Information</CardTitle>
          <p className="text-sm text-gray-600 mt-2">
            Edit contact details and locations. Changes apply immediately across the website.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Phone */}
          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              placeholder="(321) 697-8864"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={!isEditing}
              className="mt-2"
            />
            <p className="text-xs text-gray-500 mt-1">Auto-formatted for tel: links</p>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="Dreampuppies22@gmail.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!isEditing}
              className="mt-2"
            />
          </div>

          {/* Locations */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <Label>Locations</Label>
              {isEditing && (
                <Button size="sm" variant="outline" onClick={handleAddLocation}>
                  + Add Location
                </Button>
              )}
            </div>

            <div className="space-y-3">
              {locations.map((loc, idx) => (
                <div key={idx} className="border rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor={`city-${idx}`} className="text-xs">
                        City
                      </Label>
                      <Input
                        id={`city-${idx}`}
                        placeholder="e.g., Orlando"
                        value={loc.city}
                        onChange={(e) => handleLocationChange(idx, 'city', e.target.value)}
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor={`state-${idx}`} className="text-xs">
                        State
                      </Label>
                      <Input
                        id={`state-${idx}`}
                        placeholder="e.g., Florida"
                        value={loc.state}
                        onChange={(e) => handleLocationChange(idx, 'state', e.target.value)}
                        disabled={!isEditing}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={loc.isPrimary}
                        onChange={(e) => handleLocationChange(idx, 'isPrimary', e.target.checked)}
                        disabled={!isEditing}
                        className="rounded"
                      />
                      <span className="text-sm">Primary location</span>
                    </label>

                    {isEditing && locations.length > 1 && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRemoveLocation(idx)}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Status Messages */}
          {updateMutation.isSuccess && (
            <div className="flex items-center gap-2 p-3 bg-green-50 text-green-800 rounded-lg">
              <CheckCircle2 size={18} />
              <span className="text-sm">Business info updated successfully</span>
            </div>
          )}

          {updateMutation.isError && (
            <div className="flex items-center gap-2 p-3 bg-red-50 text-red-800 rounded-lg">
              <AlertCircle size={18} />
              <span className="text-sm">
                Failed to update: {updateMutation.error?.message || 'Unknown error'}
              </span>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-2 pt-4 border-t">
            {!isEditing ? (
              <Button onClick={() => setIsEditing(true)} className="flex-1">
                Edit
              </Button>
            ) : (
              <>
                <Button
                  onClick={() => setIsEditing(false)}
                  variant="outline"
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => updateMutation.mutate()}
                  disabled={updateMutation.isPending}
                  className="flex-1"
                >
                  {updateMutation.isPending ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
