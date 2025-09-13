import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Check, Pencil, Trash2, Info } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload } from "lucide-react";
import Footer from "@/components/Footer";

interface Student {
  id: string;
  name: string;
  pronouns?: string;
  dept?: string;
  photoUrl?: string;
  createdAt: string;
}

export default function Teacher() {
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState({
    name: "",
    pronouns: "",
    dept: "",
    photoUrl: "",
  });
  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isStudentsOpen, setIsStudentsOpen] = useState(true);
  const [teacherName, setTeacherName] = useState<string>("");
  const [teacherHomeroom, setTeacherHomeroom] = useState<string>("");
  const [teacherId, setTeacherId] = useState<string>("");
  const [teacherEmail, setTeacherEmail] = useState<string>("");
  const [teacherPronouns, setTeacherPronouns] = useState<string>("");
  const [teacherDept, setTeacherDept] = useState<string>("");
  const [teacherPhotoUrl, setTeacherPhotoUrl] = useState<string>("");
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    password: "",
    pronouns: "",
    dept: "",
    homeroom: "",
    photoUrl: "",
  });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    pronouns: "",
    dept: "",
    photoUrl: "",
  });
  const [todaySummary, setTodaySummary] = useState<{
    date: string;
    presentIds: string[];
    savedAt?: string;
  } | null>(null);
  const navigate = useNavigate();

  const load = async () => {
    let res = await fetch("/api/students", { credentials: "include" });
    if (res.status === 401) {
      await new Promise((r) => setTimeout(r, 150));
      res = await fetch("/api/students", { credentials: "include" });
      if (res.status === 401) return navigate("/");
    }
    const data = await res.json();
    setStudents(data.students ?? []);
  };

  const dateKey = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };

  function saveTodaySelection(next: Set<string>, tid: string) {
    if (!tid) return;
    const key = `attendance:${tid}:${dateKey()}`;
    const arr = Array.from(next);
    try {
      localStorage.setItem(key, JSON.stringify(arr));
    } catch {}
  }

  function loadTodaySelection(tid: string) {
    if (!tid) return new Set<string>();
    const key = `attendance:${tid}:${dateKey()}`;
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return new Set<string>();
      const arr = JSON.parse(raw) as string[];
      return new Set(arr);
    } catch {
      return new Set<string>();
    }
  }

  useEffect(() => {
    load();
    (async () => {
      const res = await fetch("/api/teacher/me", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setTeacherName(data.teacher?.name ?? "");
        setTeacherHomeroom(data.teacher?.homeroom ?? "");
        setTeacherId(data.teacher?.id ?? "");
        setTeacherEmail(data.teacher?.email ?? "");
        setTeacherPronouns(data.teacher?.pronouns ?? "");
        setTeacherDept(data.teacher?.dept ?? "");
        setTeacherPhotoUrl(data.teacher?.photoUrl ?? "");
        setProfileForm({
          name: data.teacher?.name ?? "",
          email: data.teacher?.email ?? "",
          password: "",
          pronouns: data.teacher?.pronouns ?? "",
          dept: data.teacher?.dept ?? "",
          homeroom: data.teacher?.homeroom ?? "",
          photoUrl: data.teacher?.photoUrl ?? "",
        });
      }
    })();
  }, []);

  useEffect(() => {
    if (teacherId) {
      setSelected(loadTodaySelection(teacherId));
      fetchToday();
    }
  }, [teacherId]);

  const toggleSelected = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      saveTodaySelection(next, teacherId);
      return next;
    });
  };

  async function fetchToday() {
    try {
      const res = await fetch("/api/attendance/today", {
        credentials: "include",
      });
      if (!res.ok) return;
      const data = await res.json();
      setTodaySummary(data.attendance);
    } catch {}
  }

  async function saveToday() {
    const present = Array.from(selected);
    const res = await fetch("/api/attendance/today", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ present }),
    });
    if (!res.ok) return alert("Failed to save attendance");
    await fetchToday();
  }

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/students", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ ...form, name: form.name.trim() }),
    });
    setLoading(false);
    if (!res.ok) return alert("Failed to create student");
    setForm({ name: "", pronouns: "", dept: "", photoUrl: "" });
    load();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    navigate("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-violet-100">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div>
            <div className="text-3xl sm:text-4xl font-normal tracking-tight text-primary">
              Homeroom
            </div>
            {teacherHomeroom && (
              <div className="inline-flex items-center gap-2 mt-2 rounded-md border border-emerald-400 bg-emerald-50 px-2 py-1 text-lg text-emerald-700">
                <span>{teacherHomeroom}</span>
              </div>
            )}
            <div className="text-2xl font-semibold leading-none tracking-tight mt-2 flex items-center gap-2">
              <span>Teacher: {teacherName || "Teacher"}</span>
              <Button
                aria-label="Edit profile"
                title="Edit Self"
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setIsProfileOpen(true)}
              >
                <Pencil className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              Home
            </Button>
            <Button onClick={logout}>Log out</Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-10 grid grid-cols-1 gap-6 flex-1">
        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center justify-between">
                <span>Create Student</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsCreateOpen((v) => !v)}
                  aria-expanded={isCreateOpen}
                >
                  {isCreateOpen ? "Hide" : "Show"}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          {isCreateOpen && (
            <CardContent>
              <form onSubmit={create} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="photo">Photo</Label>
                  <div className="flex items-center gap-2">
                    <input
                      id="photo"
                      className="sr-only"
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const f = e.target.files?.[0];
                        if (!f) return;
                        const data = await readFileAsDataURL(f);
                        setForm({ ...form, photoUrl: data });
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      aria-label="Upload photo"
                      onClick={() => document.getElementById("photo")?.click()}
                    >
                      <span>Upload Photo</span>
                      <Upload className="w-4 h-4" />
                    </Button>
                    {form.photoUrl && (
                      <img
                        src={form.photoUrl}
                        alt="Preview"
                        className="h-16 w-16 rounded-md object-cover"
                      />
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full name</Label>
                  <Input
                    id="name"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    required
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Pronouns</Label>
                    <Select
                      value={form.pronouns}
                      onValueChange={(v) => setForm({ ...form, pronouns: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select pronouns" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="she/her">she/her</SelectItem>
                        <SelectItem value="he/him">he/him</SelectItem>
                        <SelectItem value="they/them">they/them</SelectItem>
                        <SelectItem value="she/they">she/they</SelectItem>
                        <SelectItem value="he/they">he/they</SelectItem>
                        <SelectItem value="prefer not to say">
                          prefer not to say
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dept">Department</Label>
                    <Input
                      id="dept"
                      value={form.dept}
                      onChange={(e) =>
                        setForm({ ...form, dept: e.target.value })
                      }
                      placeholder="Math"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? "Creating..." : "Create Student"}
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>
                <div className="grid grid-cols-[auto_1fr_auto] items-center">
                  <span>Your Students</span>
                  <div className="hidden sm:flex justify-center">
                    <div className="inline-flex items-center gap-2 rounded-md border border-emerald-400 bg-emerald-50 px-2 py-1 text-xs text-emerald-700">
                      <Info className="w-4 h-4" />
                      <span>
                        Double click image to toggle. Green overlay = present.
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                      {new Date().toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setIsStudentsOpen((v) => !v)}
                      aria-expanded={isStudentsOpen}
                    >
                      {isStudentsOpen ? "Hide" : "Show"}
                    </Button>
                  </div>
                </div>
              </CardTitle>
            </CardHeader>
            {isStudentsOpen && (
              <CardContent>
                {students.length === 0 ? (
                  <p className="text-muted-foreground">
                    No students yet. Create your first student on the left.
                  </p>
                ) : (
                  <ul className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {students.map((s) => (
                      <li
                        key={s.id}
                        className="relative overflow-hidden flex flex-col items-center text-center gap-3 rounded-lg border p-4 bg-white cursor-pointer select-none"
                        onMouseDown={(e) => e.preventDefault()}
                        onDoubleClick={() => toggleSelected(s.id)}
                      >
                        {s.photoUrl ? (
                          <img
                            src={s.photoUrl}
                            alt={s.name}
                            className="h-40 w-40 rounded-md object-cover select-none"
                            draggable={false}
                          />
                        ) : (
                          <div className="h-40 w-40 rounded-md bg-gradient-to-br from-indigo-200 to-violet-200 select-none" />
                        )}
                        <div className="select-none">
                          <div className="font-medium">{s.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {[s.pronouns, s.dept].filter(Boolean).join(" • ")}
                          </div>
                          {!selected.has(s.id) && (
                            <div className="flex gap-1 justify-center mt-1">
                              <Button
                                aria-label="Edit"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingId(s.id);
                                  setEditForm({
                                    name: s.name ?? "",
                                    pronouns: s.pronouns ?? "",
                                    dept: s.dept ?? "",
                                    photoUrl: s.photoUrl ?? "",
                                  });
                                  setIsEditOpen(true);
                                }}
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                aria-label="Delete"
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive"
                                onClick={async (e) => {
                                  e.stopPropagation();
                                  if (!confirm("Delete this student?")) return;
                                  const res = await fetch(
                                    `/api/students/${s.id}`,
                                    {
                                      method: "DELETE",
                                      credentials: "include",
                                    },
                                  );
                                  if (!res.ok) return alert("Failed to delete");
                                  load();
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                        {selected.has(s.id) && (
                          <div className="pointer-events-none absolute inset-0 bg-emerald-600/55 ring-2 ring-emerald-700 rounded-lg flex items-center justify-center">
                            <div className="rounded-full bg-white p-2 shadow-md">
                              <Check className="text-emerald-700 w-8 h-8" />
                            </div>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            )}
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              <div className="flex items-center justify-between">
                <span>Attendance</span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={saveToday}
                  disabled={students.length === 0}
                >
                  Save Attendance -{" "}
                  {new Date().toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!todaySummary ? (
              <div className="text-sm text-muted-foreground">
                No attendance saved today.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="font-medium text-emerald-700 mb-1">
                    Students Present
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {students
                      .filter((s) => todaySummary.presentIds.includes(s.id))
                      .map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center rounded-full border border-emerald-600 bg-white px-3 py-1 text-sm text-emerald-700"
                        >
                          {s.name}
                        </span>
                      ))}
                    {students.filter((s) =>
                      todaySummary.presentIds.includes(s.id),
                    ).length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        None
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <div className="font-medium text-red-600 mb-1">
                    Student(s) Absent
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {students
                      .filter((s) => !todaySummary.presentIds.includes(s.id))
                      .map((s) => (
                        <span
                          key={s.id}
                          className="inline-flex items-center rounded-full border border-red-600 bg-white px-3 py-1 text-sm text-red-600"
                        >
                          {s.name}
                        </span>
                      ))}
                    {students.filter(
                      (s) => !todaySummary.presentIds.includes(s.id),
                    ).length === 0 && (
                      <span className="text-sm text-muted-foreground">
                        None
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />

      <Dialog
        open={isProfileOpen}
        onOpenChange={(o) => {
          setIsProfileOpen(o);
          if (!o)
            setProfileForm({
              name: teacherName,
              email: teacherEmail,
              password: "",
              pronouns: teacherPronouns,
              dept: teacherDept,
              homeroom: teacherHomeroom,
              photoUrl: teacherPhotoUrl,
            });
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-photo">Photo</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="p-photo"
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const data = await readFileAsDataURL(f);
                      setProfileForm({ ...profileForm, photoUrl: data });
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Upload photo"
                    onClick={() => document.getElementById("p-photo")?.click()}
                  >
                    <span>Upload Photo</span>
                    <Upload className="w-4 h-4" />
                  </Button>
                  {profileForm.photoUrl && (
                    <img
                      src={profileForm.photoUrl}
                      alt="Preview"
                      className="h-12 w-12 rounded-md object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-name">Name</Label>
                <Input
                  id="p-name"
                  value={profileForm.name}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-pronouns">Pronouns</Label>
                <Select
                  value={profileForm.pronouns}
                  onValueChange={(v) =>
                    setProfileForm({ ...profileForm, pronouns: v })
                  }
                >
                  <SelectTrigger id="p-pronouns">
                    <SelectValue placeholder="Select pronouns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="she/her">she/her</SelectItem>
                    <SelectItem value="he/him">he/him</SelectItem>
                    <SelectItem value="they/them">they/them</SelectItem>
                    <SelectItem value="she/they">she/they</SelectItem>
                    <SelectItem value="he/they">he/they</SelectItem>
                    <SelectItem value="prefer not to say">
                      prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-email">Email</Label>
                <Input
                  id="p-email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-password">New Password</Label>
                <Input
                  id="p-password"
                  type="password"
                  placeholder="Leave blank to keep"
                  value={profileForm.password}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, password: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="p-dept">Department</Label>
                <Input
                  id="p-dept"
                  value={profileForm.dept}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, dept: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-homeroom">Homeroom Identifier</Label>
                <Input
                  id="p-homeroom"
                  value={profileForm.homeroom}
                  onChange={(e) =>
                    setProfileForm({ ...profileForm, homeroom: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsProfileOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const res = await fetch("/api/teacher/me", {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(profileForm),
                  });
                  if (!res.ok) return alert("Failed to save");
                  const d = await res.json();
                  setTeacherName(d.teacher?.name ?? teacherName);
                  setTeacherHomeroom(d.teacher?.homeroom ?? teacherHomeroom);
                  setTeacherEmail(d.teacher?.email ?? teacherEmail);
                  setTeacherPronouns(d.teacher?.pronouns ?? teacherPronouns);
                  setTeacherDept(d.teacher?.dept ?? teacherDept);
                  setTeacherPhotoUrl(d.teacher?.photoUrl ?? teacherPhotoUrl);
                  setIsProfileOpen(false);
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isEditOpen}
        onOpenChange={(o) => {
          setIsEditOpen(o);
          if (!o) setEditingId(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="m-name">Name</Label>
                <Input
                  id="m-name"
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Pronouns</Label>
                <Select
                  value={editForm.pronouns}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, pronouns: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select pronouns" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="she/her">she/her</SelectItem>
                    <SelectItem value="he/him">he/him</SelectItem>
                    <SelectItem value="they/them">they/them</SelectItem>
                    <SelectItem value="she/they">she/they</SelectItem>
                    <SelectItem value="he/they">he/they</SelectItem>
                    <SelectItem value="prefer not to say">
                      prefer not to say
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="m-dept">Department</Label>
                <Input
                  id="m-dept"
                  value={editForm.dept}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dept: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="m-photo">Photo</Label>
                <div className="flex items-center gap-2">
                  <input
                    id="m-photo"
                    className="sr-only"
                    type="file"
                    accept="image/*"
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      const data = await readFileAsDataURL(f);
                      setEditForm({ ...editForm, photoUrl: data });
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    aria-label="Upload photo"
                    onClick={() => document.getElementById("m-photo")?.click()}
                  >
                    <span>Upload Photo</span>
                    <Upload className="w-4 h-4" />
                  </Button>
                  {editForm.photoUrl && (
                    <img
                      src={editForm.photoUrl}
                      alt="Preview"
                      className="h-20 w-20 rounded-md object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditOpen(false);
                  setEditingId(null);
                }}
              >
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  if (!editingId) return;
                  const res = await fetch(`/api/students/${editingId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(editForm),
                  });
                  if (!res.ok) return alert("Failed to save");
                  setIsEditOpen(false);
                  setEditingId(null);
                  load();
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
