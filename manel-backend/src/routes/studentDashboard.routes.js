import express from "express";
import { getStudentDashboard } from "../controllers/studentDashboard.controller.js";
import { protect, restrictToStudent } from "../middleware/auth.js";


const router = express.Router();

router.get("/dashboard", protect, getStudentDashboard);

export default router;