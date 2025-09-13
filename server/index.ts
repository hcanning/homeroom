import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import {
  login,
  logout,
  setupAdmin,
  whoami,
  status,
  setupAdminForce,
} from "./routes/auth";
import {
  createStudent,
  createTeacher,
  listStudents,
  listTeachers,
  requireSuperadmin,
  requireTeacher,
  updateTeacher,
  deleteTeacher,
  getTeacherMe,
  updateTeacherMe,
  updateStudent,
  deleteStudent,
} from "./routes/admin-and-teachers";
import { getTodayAttendance, saveTodayAttendance } from "./routes/attendance";

export function createServer() {
  const app = express();

  // Middleware
  app.use(
    cors({
      origin: true,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health/demo
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });
  app.get("/api/demo", handleDemo);

  // Auth/setup
  app.post("/api/setup-admin", setupAdmin);
  app.post("/api/auth/login", login);
  app.post("/api/auth/logout", logout);
  app.get("/api/auth/whoami", whoami);
  app.get("/api/status", status);
  app.post("/api/setup-admin/force", setupAdminForce);

  // Superadmin -> teacher management
  app.get("/api/teachers", requireSuperadmin, listTeachers);
  app.post("/api/teachers", requireSuperadmin, createTeacher);
  app.patch("/api/teachers/:id", requireSuperadmin, updateTeacher);
  app.delete("/api/teachers/:id", requireSuperadmin, deleteTeacher);

  // Teacher -> students
  app.get("/api/students", requireTeacher, listStudents);
  app.get("/api/teacher/me", requireTeacher, getTeacherMe);
  app.patch("/api/teacher/me", requireTeacher, updateTeacherMe);
  app.post("/api/students", requireTeacher, createStudent);
  app.patch("/api/students/:id", requireTeacher, updateStudent);
  app.delete("/api/students/:id", requireTeacher, deleteStudent);

  // Teacher -> attendance
  app.get("/api/attendance/today", requireTeacher, getTodayAttendance);
  app.post("/api/attendance/today", requireTeacher, saveTodayAttendance);

  return app;
}
