import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Footer from "@/components/Footer";
import { Upload } from "lucide-react";
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

export default function Admin() {
  const [teacherForm, setTeacherForm] = useState({
    email: "",
    password: "",
    name: "",
    pronouns: "",
    dept: "",
    homeroom: "",
    photoUrl: "",
  });
  const readFileAsDataURL = (file: File) =>
    new Promise<string>((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result));
      fr.onerror = reject;
      fr.readAsDataURL(file);
    });
  const [teachers, setTeachers] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    email: "",
    password: "",
    name: "",
    pronouns: "",
    dept: "",
    homeroom: "",
    photoUrl: "",
  });
  const [isEditOpen, setIsEditOpen] = useState(false);
  const nav = useNavigate();

  const loadTeachers = async () => {
    let res = await fetch("/api/teachers", { credentials: "include" });
    if (res.status === 401) {
      // retry once in case cookie just set
      await new Promise((r) => setTimeout(r, 150));
      res = await fetch("/api/teachers", { credentials: "include" });
      if (res.status === 401) return nav("/");
    }
    const data = await res.json();
    setTeachers(data.teachers ?? []);
  };

  useEffect(() => {
    loadTeachers();
  }, []);

  const createTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(teacherForm),
    });
    if (res.status === 401) return nav("/");
    if (!res.ok) return alert("Failed to create teacher");
    setTeacherForm({
      email: "",
      password: "",
      name: "",
      pronouns: "",
      dept: "",
      homeroom: "",
      photoUrl: "",
    });
    loadTeachers();
  };

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    nav("/");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-indigo-50 to-violet-100">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="text-3xl sm:text-4xl font-normal tracking-tight text-primary">
            Homeroom App
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => nav("/")}>
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
                <span>Create Teacher</span>
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
              <form onSubmit={createTeacher} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="t-photo">Photo</Label>
                    <div className="flex items-center gap-2">
                      <input
                        id="t-photo"
                        className="sr-only"
                        type="file"
                        accept="image/*"
                        onChange={async (e) => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const data = await readFileAsDataURL(f);
                          setTeacherForm({ ...teacherForm, photoUrl: data });
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        aria-label="Upload photo"
                        onClick={() =>
                          document.getElementById("t-photo")?.click()
                        }
                      >
                        <span>Upload Photo</span>
                        <Upload className="w-4 h-4" />
                      </Button>
                      {teacherForm.photoUrl && (
                        <img
                          src={teacherForm.photoUrl}
                          alt="Preview"
                          className="h-16 w-16 rounded-md object-cover"
                        />
                      )}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="t-name">Name</Label>
                    <Input
                      id="t-name"
                      value={teacherForm.name}
                      onChange={(e) =>
                        setTeacherForm({ ...teacherForm, name: e.target.value })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="t-pronouns">Pronouns</Label>
                    <Select
                      value={teacherForm.pronouns}
                      onValueChange={(v) =>
                        setTeacherForm({ ...teacherForm, pronouns: v })
                      }
                    >
                      <SelectTrigger id="t-pronouns">
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
                    <Label htmlFor="t-email">Email</Label>
                    <Input
                      id="t-email"
                      type="email"
                      value={teacherForm.email}
                      onChange={(e) =>
                        setTeacherForm({
                          ...teacherForm,
                          email: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="t-password">Password</Label>
                    <Input
                      id="t-password"
                      type="password"
                      value={teacherForm.password}
                      onChange={(e) =>
                        setTeacherForm({
                          ...teacherForm,
                          password: e.target.value,
                        })
                      }
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="t-dept">Department</Label>
                    <Input
                      id="t-dept"
                      value={teacherForm.dept}
                      onChange={(e) =>
                        setTeacherForm({ ...teacherForm, dept: e.target.value })
                      }
                      placeholder="Science"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="t-homeroom">Homeroom Identifier</Label>
                    <Input
                      id="t-homeroom"
                      value={teacherForm.homeroom}
                      onChange={(e) =>
                        setTeacherForm({
                          ...teacherForm,
                          homeroom: e.target.value,
                        })
                      }
                      placeholder="e.g. Room 101 or Auto Repair"
                    />
                  </div>
                </div>
                <Button type="submit" className="w-full">
                  Create Teacher
                </Button>
              </form>
            </CardContent>
          )}
        </Card>
        <div>
          <Card>
            <CardHeader>
              <CardTitle>Teachers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button variant="outline" onClick={loadTeachers}>
                  Refresh
                </Button>
              </div>
              {teachers.length === 0 ? (
                <p className="text-muted-foreground">
                  No teachers yet. Create one using the form.
                </p>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-4">
                  {teachers.map((t) => (
                    <li key={t.id} className="rounded-lg border p-4 bg-white">
                      {false ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`e-name-${t.id}`}>Name</Label>
                              <Input
                                id={`e-name-${t.id}`}
                                value={editForm.name}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    name: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`e-pronouns-${t.id}`}>
                                Pronouns
                              </Label>
                              <Input
                                id={`e-pronouns-${t.id}`}
                                value={editForm.pronouns}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    pronouns: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`e-email-${t.id}`}>Email</Label>
                              <Input
                                id={`e-email-${t.id}`}
                                type="email"
                                value={editForm.email}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    email: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`e-password-${t.id}`}>
                                New Password
                              </Label>
                              <Input
                                id={`e-password-${t.id}`}
                                type="password"
                                placeholder="Leave blank to keep"
                                value={editForm.password}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    password: e.target.value,
                                  })
                                }
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`e-dept-${t.id}`}>
                                Department
                              </Label>
                              <Input
                                id={`e-dept-${t.id}`}
                                value={editForm.dept}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    dept: e.target.value,
                                  })
                                }
                              />
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor={`e-homeroom-${t.id}`}>
                                Homeroom Identifier
                              </Label>
                              <Input
                                id={`e-homeroom-${t.id}`}
                                value={(editForm as any).homeroom ?? ""}
                                onChange={(e) =>
                                  setEditForm({
                                    ...editForm,
                                    homeroom: (e.target as HTMLInputElement)
                                      .value,
                                  } as any)
                                }
                                placeholder="e.g. Room 101 or Auto Repair"
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <Label htmlFor={`e-photo-${t.id}`}>Photo</Label>
                              <div className="flex items-center gap-2">
                                <input
                                  id={`e-photo-${t.id}`}
                                  className="sr-only"
                                  type="file"
                                  accept="image/*"
                                  onChange={async (e) => {
                                    const f = e.target.files?.[0];
                                    if (!f) return;
                                    const data = await readFileAsDataURL(f);
                                    setEditForm({
                                      ...editForm,
                                      photoUrl: data,
                                    });
                                  }}
                                />
                                <Button
                                  type="button"
                                  variant="outline"
                                  aria-label="Upload photo"
                                  onClick={() =>
                                    document
                                      .getElementById(`e-photo-${t.id}`)
                                      ?.click()
                                  }
                                >
                                  <span>Upload Photo</span>
                                  <Upload className="w-4 h-4" />
                                </Button>
                                {editForm.photoUrl && (
                                  <img
                                    src={editForm.photoUrl}
                                    alt="Preview"
                                    className="h-16 w-16 rounded-md object-cover"
                                  />
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={async () => {
                                const res = await fetch(
                                  `/api/teachers/${t.id}`,
                                  {
                                    method: "PATCH",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    credentials: "include",
                                    body: JSON.stringify(editForm),
                                  },
                                );
                                if (!res.ok) return alert("Failed to save");
                                setEditingId(null);
                                setEditForm({
                                  email: "",
                                  password: "",
                                  name: "",
                                  pronouns: "",
                                  dept: "",
                                  homeroom: "",
                                  photoUrl: "",
                                });
                                loadTeachers();
                              }}
                            >
                              Save
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setEditingId(null);
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center gap-4">
                          {t.photoUrl ? (
                            <img
                              src={t.photoUrl}
                              alt={t.name}
                              className="h-12 w-12 rounded-full object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200" />
                          )}
                          <div className="flex-1">
                            <div className="font-medium">{t.name}</div>
                            {(t as any).homeroom && (
                              <div className="inline-flex items-center gap-2 mt-1 rounded-md border border-emerald-400 bg-emerald-50 px-2 py-1 text-sm text-emerald-700">
                                <span>{(t as any).homeroom}</span>
                              </div>
                            )}
                            <div className="text-sm text-muted-foreground mt-1">
                              {t.email}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {[t.pronouns, t.dept].filter(Boolean).join(" • ")}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              aria-label="Edit"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingId(t.id);
                                setEditForm({
                                  email: t.email ?? "",
                                  password: "",
                                  name: t.name ?? "",
                                  pronouns: t.pronouns ?? "",
                                  dept: t.dept ?? "",
                                  homeroom: (t as any).homeroom ?? "",
                                  photoUrl: t.photoUrl ?? "",
                                });
                                setIsEditOpen(true);
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="w-4 h-4"
                              >
                                <path d="M12 20h9" />
                                <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
                              </svg>
                            </Button>
                            <Button
                              aria-label="Delete"
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={async () => {
                                if (
                                  !confirm(
                                    "Delete this teacher? This will also remove their students.",
                                  )
                                )
                                  return;
                                const res = await fetch(
                                  `/api/teachers/${t.id}`,
                                  { method: "DELETE", credentials: "include" },
                                );
                                if (!res.ok) return alert("Failed to delete");
                                loadTeachers();
                              }}
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                className="w-4 h-4"
                              >
                                <polyline points="3 6 5 6 21 6" />
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                                <path d="M10 11v6" />
                                <path d="M14 11v6" />
                                <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
                              </svg>
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>

      <Dialog
        open={isEditOpen}
        onOpenChange={(o) => {
          setIsEditOpen(o);
          if (!o) setEditingId(null);
        }}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Edit Teacher</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`e-photo`}>Photo</Label>
                <div className="flex items-center gap-2">
                  <input
                    id={`e-photo`}
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
                    onClick={() => document.getElementById(`e-photo`)?.click()}
                  >
                    <span>Upload Photo</span>
                    <Upload className="w-4 h-4" />
                  </Button>
                  {editForm.photoUrl && (
                    <img
                      src={editForm.photoUrl}
                      alt="Preview"
                      className="h-16 w-16 rounded-md object-cover"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`e-name`}>Name</Label>
                <Input
                  id={`e-name`}
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm({ ...editForm, name: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-pronouns`}>Pronouns</Label>
                <Select
                  value={editForm.pronouns}
                  onValueChange={(v) =>
                    setEditForm({ ...editForm, pronouns: v })
                  }
                >
                  <SelectTrigger id={`e-pronouns`}>
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`e-email`}>Email</Label>
                <Input
                  id={`e-email`}
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm({ ...editForm, email: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-password`}>New Password</Label>
                <Input
                  id={`e-password`}
                  type="password"
                  placeholder="Leave blank to keep"
                  value={editForm.password}
                  onChange={(e) =>
                    setEditForm({ ...editForm, password: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`e-dept`}>Department</Label>
                <Input
                  id={`e-dept`}
                  value={editForm.dept}
                  onChange={(e) =>
                    setEditForm({ ...editForm, dept: e.target.value })
                  }
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor={`e-homeroom`}>Homeroom Identifier</Label>
                <Input
                  id={`e-homeroom`}
                  value={editForm.homeroom ?? ""}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
                      homeroom: (e.target as HTMLInputElement).value,
                    })
                  }
                  placeholder="e.g. Room 101 or Auto Repair"
                />
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
                  const res = await fetch(`/api/teachers/${editingId}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    credentials: "include",
                    body: JSON.stringify(editForm),
                  });
                  if (!res.ok) return alert("Failed to save");
                  setIsEditOpen(false);
                  setEditingId(null);
                  setEditForm({
                    email: "",
                    password: "",
                    name: "",
                    pronouns: "",
                    dept: "",
                    homeroom: "",
                    photoUrl: "",
                  });
                  loadTeachers();
                }}
              >
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
