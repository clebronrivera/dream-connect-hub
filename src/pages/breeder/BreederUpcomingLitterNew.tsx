// /breeder/upcoming-litters/new
//
// Lets the breeder pre-register an upcoming litter from her dashboard.
// Flow (single-screen, mobile-friendly):
//   1. Pick the breed from the MAIN_BREEDS dropdown (Other → free text).
//   2. Pick the dam from the dropdown of existing breeding_dogs where role='Dam'.
//   3. Pick the sire similarly (role='Sire').
//   4. If a picked parent has no photo on file, surface an inline upload affordance
//      (uses uploadBreederPhoto → updateBreederParent.photos to persist).
//   5. Enter expected dates (breeding + whelping; either or both).
//   6. Submit → calls createUpcomingLitter → routes back to /breeder.
//
// The litter is inserted with lifecycle_status='pre_birth'. The breeder comes
// back to that page later — when babies arrive — and runs the existing
// "Confirm born" flow (BreederLitterSetup), which transitions the row to
// post_birth and seeds the puppy rows.

import { useMemo, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronLeft, Loader2, Plus, Camera, ImageOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import {
  createUpcomingLitter,
  listBreederParents,
  updateBreederParent,
  uploadBreederPhoto,
  type BreederParentRow,
} from "@/lib/breeder/api";
import { MAIN_BREEDS, OTHER_BREED_OPTION } from "@/lib/breed-utils";
import { resolvePuppyPhotosPublicUrl } from "@/lib/puppy-photos";

const PARENTS_QK = ["breeder", "parents"] as const;
const HOME_QK = ["breeder", "home"] as const;

export default function BreederUpcomingLitterNew() {
  const navigate = useNavigate();
  const { session } = useBreederAuth();
  const queryClient = useQueryClient();

  const { data: parents = [], isLoading: parentsLoading } = useQuery({
    queryKey: PARENTS_QK,
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error("No breeder session");
      const res = await listBreederParents(session.token);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const dams = useMemo(() => parents.filter((p) => p.role === "Dam"), [parents]);
  const sires = useMemo(() => parents.filter((p) => p.role === "Sire"), [parents]);

  const [breedSelect, setBreedSelect] = useState<string>("");
  const [otherBreed, setOtherBreed] = useState<string>("");
  const displayBreed =
    breedSelect === OTHER_BREED_OPTION ? otherBreed.trim() : breedSelect.trim();

  const [damId, setDamId] = useState<string>("");
  const [sireId, setSireId] = useState<string>("");
  const [breedingDate, setBreedingDate] = useState<string>("");
  const [expectedWhelpingDate, setExpectedWhelpingDate] = useState<string>("");

  const selectedDam = dams.find((d) => d.id === damId) ?? null;
  const selectedSire = sires.find((s) => s.id === sireId) ?? null;

  const submitMut = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No breeder session");
      if (!displayBreed) throw new Error("Please select a breed");
      const res = await createUpcomingLitter(session.token, {
        displayBreed,
        damId: damId || null,
        sireId: sireId || null,
        breedingDate: breedingDate || null,
        expectedWhelpingDate: expectedWhelpingDate || null,
        isActive: true,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Upcoming litter created");
      queryClient.invalidateQueries({ queryKey: HOME_QK });
      navigate("/breeder", { replace: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canSubmit =
    !!displayBreed &&
    !submitMut.isPending &&
    (breedingDate.length > 0 || expectedWhelpingDate.length > 0);

  if (parentsLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-screen-sm px-4 py-6 space-y-5">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => navigate("/breeder")}
          aria-label="Back"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">New upcoming litter</h1>
      </div>

      <Card className="space-y-5 p-5">
        {/* Breed */}
        <div className="space-y-2">
          <Label htmlFor="breed">Breed</Label>
          <Select
            value={breedSelect}
            onValueChange={(v) => {
              setBreedSelect(v);
              if (v !== OTHER_BREED_OPTION) setOtherBreed("");
            }}
          >
            <SelectTrigger id="breed">
              <SelectValue placeholder="Select a breed" />
            </SelectTrigger>
            <SelectContent>
              {MAIN_BREEDS.map((b) => (
                <SelectItem key={b} value={b}>
                  {b}
                </SelectItem>
              ))}
              <SelectItem value={OTHER_BREED_OPTION}>{OTHER_BREED_OPTION}</SelectItem>
            </SelectContent>
          </Select>
          {breedSelect === OTHER_BREED_OPTION && (
            <Input
              value={otherBreed}
              onChange={(e) => setOtherBreed(e.target.value)}
              placeholder="e.g. F1B Goldendoodle x Mini Poodle"
              aria-label="Custom breed"
            />
          )}
        </div>

        {/* Dam */}
        <ParentPicker
          label="Mom (Dam)"
          role="Dam"
          parents={dams}
          selectedId={damId}
          onSelect={setDamId}
          selected={selectedDam}
        />

        {/* Sire */}
        <ParentPicker
          label="Dad (Sire)"
          role="Sire"
          parents={sires}
          selectedId={sireId}
          onSelect={setSireId}
          selected={selectedSire}
        />

        {/* Dates */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="breeding-date">Breeding date</Label>
            <Input
              id="breeding-date"
              type="date"
              value={breedingDate}
              onChange={(e) => setBreedingDate(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="whelping-date">Expected whelping</Label>
            <Input
              id="whelping-date"
              type="date"
              value={expectedWhelpingDate}
              onChange={(e) => setExpectedWhelpingDate(e.target.value)}
            />
          </div>
        </div>
        <p className="text-xs text-muted-foreground">
          Enter at least one date. The litter will show up on the upcoming list and stay
          in "pre-birth" status until you come back and confirm the puppies arrived.
        </p>

        <Button
          type="button"
          className="w-full"
          disabled={!canSubmit}
          onClick={() => submitMut.mutate()}
        >
          {submitMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : null}
          Create upcoming litter
        </Button>
      </Card>
    </div>
  );
}

interface ParentPickerProps {
  label: string;
  role: "Dam" | "Sire";
  parents: BreederParentRow[];
  selectedId: string;
  onSelect: (id: string) => void;
  selected: BreederParentRow | null;
}

function ParentPicker({
  label,
  role,
  parents,
  selectedId,
  onSelect,
  selected,
}: ParentPickerProps) {
  const { session } = useBreederAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);

  const hasPhoto = !!(selected?.photo_path || (selected?.photos && selected.photos.length > 0));
  const photoUrl = selected
    ? resolvePuppyPhotosPublicUrl(selected.photo_path ?? selected.photos?.[0] ?? null)
    : null;

  async function handleInlineUpload(file: File) {
    if (!session || !selected) return;
    setUploading(true);
    try {
      const up = await uploadBreederPhoto({
        token: session.token,
        file,
        kind: "parent",
        subjectId: selected.id,
      });
      if (!up.ok) throw new Error(up.error);
      const nextPhotos = [...(selected.photos ?? []), up.data.path];
      const res = await updateBreederParent(session.token, selected.id, {
        photos: nextPhotos,
        photo_path: selected.photo_path ?? up.data.path,
      });
      if (!res.ok) throw new Error(res.error);
      toast.success(`Photo added for ${selected.name}`);
      queryClient.invalidateQueries({ queryKey: PARENTS_QK });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button
          asChild
          variant="link"
          size="sm"
          className="h-auto p-0 text-xs"
        >
          <Link to="/breeder/parents/new">
            <Plus className="mr-1 h-3 w-3" />
            Add new {role.toLowerCase()}
          </Link>
        </Button>
      </div>

      {parents.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/40 p-3 text-sm text-muted-foreground">
          No {role.toLowerCase()}s on file yet.{" "}
          <Link to="/breeder/parents/new" className="font-medium text-primary underline">
            Add one now
          </Link>
          .
        </p>
      ) : (
        <Select value={selectedId} onValueChange={onSelect}>
          <SelectTrigger>
            <SelectValue placeholder={`Select a ${role.toLowerCase()}`} />
          </SelectTrigger>
          <SelectContent>
            {parents.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} · {p.breed}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {selected && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/20 p-3">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={selected.name}
              className="h-16 w-16 rounded object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded border-2 border-dashed border-line bg-background text-muted-foreground">
              <ImageOff className="h-6 w-6" aria-hidden />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium">{selected.name}</p>
            <p className="truncate text-xs text-muted-foreground">{selected.breed}</p>
            {!hasPhoto && (
              <label className="mt-1 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-primary">
                <Camera className="h-3 w-3" />
                {uploading ? "Uploading…" : `Add photo of ${selected.name}`}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  aria-hidden
                  tabIndex={-1}
                  disabled={uploading}
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleInlineUpload(f);
                    e.target.value = "";
                  }}
                />
              </label>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
