import express from "express";
import { getTeacherDashboard } from "../controllers/teacherDashboard.controller.js";
import { protect, restrictToTeacher } from "../middleware/auth.js";

const router = express.Router();

router.get(
  "/dashboard",
  protect,
  restrictToTeacher,
  getTeacherDashboard
);

export default router;