import express from "express";
import { getTasks, createTask, updateTask, deleteTask, getTaskById } from "../controllers/teacherTask.controller.js";
import { protect, restrictToTeacher } from "../middleware/auth.js";

const router = express.Router();

router.use(protect, restrictToTeacher);
router.get("/", getTasks);
router.get("/:id", getTaskById);
router.post("/", createTask);
router.patch("/:id", updateTask);
router.delete("/:id", deleteTask);

export default router;