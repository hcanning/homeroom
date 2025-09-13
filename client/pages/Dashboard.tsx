import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Student {
  id: string;
  name: string;
  pronouns?: string;
  dept?: string;
  photoUrl?: string;
  createdAt: string;
}

export default function Dashboard() {
  const [students, setStudents] = useState<Student[]>([]);
  const [form, setForm] = useState({
    name: "",
    pronouns: "",
    dept: "",
    photoUrl: "",
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const res = await fetch("/api/students", { credentials: "include" });
    if (res.status === 401) return navigate("/");
    const data = await res.json();
    setStudents(data.students ?? []);
  };

  useEffect(() => {
    load();
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-violet-100">
      <header className="sticky top-0 z-10 bg-white/70 backdrop-blur border-b">
        <div className="container mx-auto flex items-center justify-between py-4">
          <div className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
            Schola
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              Home
            </Button>
            <Button onClick={logout}>Log out</Button>
          </div>
        </div>
      </header>
      <main className="container mx-auto py-10 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Create Student</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-4">
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
                  <Label htmlFor="pronouns">Pronouns</Label>
                  <Input
                    id="pronouns"
                    value={form.pronouns}
                    onChange={(e) =>
                      setForm({ ...form, pronouns: e.target.value })
                    }
                    placeholder="she/her"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dept">Department</Label>
                  <Input
                    id="dept"
                    value={form.dept}
                    onChange={(e) => setForm({ ...form, dept: e.target.value })}
                    placeholder="Math"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="photoUrl">Photo URL</Label>
                <Input
                  id="photoUrl"
                  value={form.photoUrl}
                  onChange={(e) =>
                    setForm({ ...form, photoUrl: e.target.value })
                  }
                  placeholder="https://..."
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Creating..." : "Create Student"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Your Students</CardTitle>
            </CardHeader>
            <CardContent>
              {students.length === 0 ? (
                <p className="text-muted-foreground">
                  No students yet. Create your first student on the left.
                </p>
              ) : (
                <ul className="grid sm:grid-cols-2 gap-4">
                  {students.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-center gap-4 rounded-lg border p-4 bg-white"
                    >
                      {s.photoUrl ? (
                        <img
                          src={s.photoUrl}
                          alt={s.name}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-200 to-violet-200" />
                      )}
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {[s.pronouns, s.dept].filter(Boolean).join(" • ")}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
