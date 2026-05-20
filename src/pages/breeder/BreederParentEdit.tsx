// /breeder/parents/:dogId/edit  AND  /breeder/parents/new
//
// Edit (or create) one parent dog. Required fields per the breeding_dogs
// schema: name, role, breed, composition, color. Photos go into the
// breeding_dogs.photos array (PR 1 migration). Legacy photo_path is
// kept as the single primary; on save, we mirror photos[0] into it if
// it was previously null.

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router-dom";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import { PhotoCaptureSlot } from "@/components/breeder/PhotoCaptureSlot";
import { useBreederAuth } from "@/hooks/use-breeder-auth";
import { MAIN_BREEDS, OTHER_BREED_OPTION } from "@/lib/breed-utils";
import {
  createBreederParent,
  listBreederParents,
  updateBreederParent,
  type BreederParentRow,
} from "@/lib/breeder/api";

const PARENTS_QK = ["breeder", "parents"] as const;
const NEW_ID = "new";

export default function BreederParentEdit() {
  const { dogId } = useParams<{ dogId: string }>();
  const isNew = !dogId || dogId === NEW_ID;
  const { session } = useBreederAuth();

  const { data: parents = [], isLoading } = useQuery({
    queryKey: PARENTS_QK,
    enabled: !!session && !isNew,
    queryFn: async () => {
      if (!session) throw new Error("No session");
      const res = await listBreederParents(session.token);
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
  });

  const existing = useMemo(
    () => (isNew ? undefined : parents.find((p) => p.id === dogId)),
    [parents, dogId, isNew],
  );

  if (!isNew && isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!isNew && !existing) {
    return (
      <div className="mx-auto max-w-screen-sm px-4 py-6 text-sm text-muted-foreground">
        Parent not found.
      </div>
    );
  }

  return <Form initial={existing} />;
}

function Form({ initial }: { initial?: BreederParentRow }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { session } = useBreederAuth();
  const isNew = !initial;

  const [name, setName] = useState(initial?.name ?? "");
  const [role, setRole] = useState<"Sire" | "Dam">(initial?.role ?? "Dam");
  // Breed: dropdown of MAIN_BREEDS + "Other / Custom" with a free-text fallback.
  // Preserves any pre-existing custom value (e.g., "F1B Goldendoodle") by routing
  // it into the Other path.
  const initialBreedValue = initial?.breed ?? "";
  const initialBreedIsStandard = (MAIN_BREEDS as readonly string[]).includes(initialBreedValue);
  const [breedSelect, setBreedSelect] = useState<string>(
    initialBreedValue === ""
      ? ""
      : initialBreedIsStandard
        ? initialBreedValue
        : OTHER_BREED_OPTION,
  );
  const [otherBreed, setOtherBreed] = useState<string>(
    initialBreedIsStandard ? "" : initialBreedValue,
  );
  const breed =
    breedSelect === OTHER_BREED_OPTION ? otherBreed.trim() : breedSelect.trim();
  const setBreed = (next: string) => {
    if ((MAIN_BREEDS as readonly string[]).includes(next)) {
      setBreedSelect(next);
      setOtherBreed("");
    } else {
      setBreedSelect(OTHER_BREED_OPTION);
      setOtherBreed(next);
    }
  };
  // Suppress unused-var lint until setBreed has another caller; the setter is
  // kept around in case a future flow needs to programmatically set the value.
  void setBreed;
  const [composition, setComposition] = useState(initial?.composition ?? "");
  const [color, setColor] = useState(initial?.color ?? "");
  const [photos, setPhotos] = useState<string[]>(initial?.photos ?? []);
  // Temporary id for new parents — until we save, PhotoCaptureSlot needs a
  // UUID-ish path-stable identifier. The edge function ignores the subjectId
  // beyond using it as a path segment, so a client-side uuid is fine.
  const [draftId] = useState<string>(() => initial?.id ?? crypto.randomUUID());
  const subjectId = initial?.id ?? draftId;

  const saveMut = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("No session");
      if (!name.trim() || !breed.trim() || !composition.trim() || !color.trim()) {
        throw new Error("Name, breed, composition, and color are required");
      }
      if (initial) {
        const res = await updateBreederParent(session.token, initial.id, {
          name: name.trim(),
          role,
          breed: breed.trim(),
          composition: composition.trim(),
          color: color.trim(),
          photos,
          photo_path: initial.photo_path ?? photos[0] ?? null,
        });
        if (!res.ok) throw new Error(res.error);
        return res.data;
      }
      const res = await createBreederParent(session.token, {
        name: name.trim(),
        role,
        breed: breed.trim(),
        composition: composition.trim(),
        color: color.trim(),
        photos,
        photo_path: photos[0] ?? null,
      });
      if (!res.ok) throw new Error(res.error);
      return res.data;
    },
    onSuccess: () => {
      toast.success(initial ? "Parent updated" : "Parent added");
      queryClient.invalidateQueries({ queryKey: PARENTS_QK });
      navigate("/breeder/parents", { replace: true });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function addPhoto(publicUrl: string) {
    setPhotos((prev) => (prev.includes(publicUrl) ? prev : [...prev, publicUrl]));
  }

  function removePhoto(idx: number) {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  }

  return (
    <div className="mx-auto max-w-screen-sm space-y-5 px-4 py-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">{isNew ? "Add a parent" : "Edit parent"}</h1>
      </header>

      <Card className="space-y-4 p-5">
        <div>
          <Label htmlFor="role">Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as "Sire" | "Dam")}>
            <SelectTrigger id="role" className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Dam">Dam (mom)</SelectItem>
              <SelectItem value="Sire">Sire (dad)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="name">Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1"
            placeholder="Luna, Bruno…"
          />
        </div>
        <div>
          <Label htmlFor="breed">Breed</Label>
          <Select
            value={breedSelect}
            onValueChange={(v) => {
              setBreedSelect(v);
              if (v !== OTHER_BREED_OPTION) setOtherBreed("");
            }}
          >
            <SelectTrigger id="breed" className="mt-1">
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
              className="mt-2"
              placeholder="e.g. F1B Goldendoodle"
              aria-label="Custom breed"
            />
          )}
        </div>
        <div>
          <Label htmlFor="composition">Composition</Label>
          <Input
            id="composition"
            value={composition}
            onChange={(e) => setComposition(e.target.value)}
            className="mt-1"
            placeholder="50% Poodle, 50% Golden"
          />
        </div>
        <div>
          <Label htmlFor="color">Color</Label>
          <Input
            id="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="mt-1"
            placeholder="Apricot, Cream…"
          />
        </div>
      </Card>

      <Card className="space-y-3 p-5">
        <h2 className="text-lg font-semibold">Photos</h2>
        <div className="grid grid-cols-2 gap-3">
          {photos.map((url, idx) => (
            <div key={url} className="relative">
              <div className="aspect-square overflow-hidden rounded-xl border bg-muted">
                <img src={url} alt={`${name} photo ${idx + 1}`} className="h-full w-full object-cover" />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="icon"
                onClick={() => removePhoto(idx)}
                aria-label={`Remove photo ${idx + 1}`}
                className="absolute right-1 top-1 h-8 w-8 rounded-full"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <PhotoCaptureSlot
            label={photos.length === 0 ? "Add photo" : "Add another"}
            kind="parent"
            subjectId={subjectId}
            onUploaded={({ publicUrl }) => addPhoto(publicUrl)}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          The first photo doubles as the primary thumbnail.
        </p>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          disabled={saveMut.isPending}
          className="flex-1 h-12"
        >
          Cancel
        </Button>
        <Button
          onClick={() => saveMut.mutate()}
          disabled={saveMut.isPending}
          className="flex-1 h-12"
        >
          {saveMut.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Plus className="mr-2 h-4 w-4" />
          )}
          Save
        </Button>
      </div>
    </div>
  );
}
