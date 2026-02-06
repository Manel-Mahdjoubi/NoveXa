import express from "express";
import {
    getResources,
    submitResource,
    getAllResourcesAdmin,
    updateResourceStatus,
} from "../controllers/library.controller.js";
import { protect } from "../middleware/auth.js";

const router = express.Router();

// Public/Approved resources
router.get("/", getResources);

// Authenticated: Submit resource
router.post("/", protect, submitResource);

// Admin routes (placeholder for now/future)
// You might want a specific restrictToAdmin middleware here
router.get("/admin", protect, getAllResourcesAdmin);
router.patch("/:id/status", protect, updateResourceStatus);

export default router;