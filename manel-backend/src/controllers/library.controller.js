import { prisma } from "../config/db.js";

/**
 * Get all approved library resources
 * @route GET /api/library
 */
export const getResources = async (req, res) => {
    try {
        const { subject, type, search } = req.query;

        const where = {
            status: "approved",
        };

        if (subject) {
            where.subject = { equals: subject, mode: "insensitive" };
        }

        if (type) {
            where.type = type.toUpperCase();
        }

        if (search) {
            where.OR = [
                { title: { contains: search, mode: "insensitive" } },
                { description: { contains: search, mode: "insensitive" } },
            ];
        }

        const resources = await prisma.libraryResource.findMany({
            where,
            orderBy: { createdAt: "desc" },
        });

        res.status(200).json({
            success: true,
            count: resources.length,
            data: resources,
        });
    } catch (error) {
        console.error("Error fetching library resources:", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch library resources",
        });
    }
};

/**
 * Submit a new resource for review
 * @route POST /api/library
 */
export const submitResource = async (req, res) => {
    try {
        const { title, description, type, subject, url } = req.body;

        // Basic validation
        if (!title || !subject || !url) {
            return res.status(400).json({
                success: false,
                message: "Title, subject, and URL are required",
            });
        }

        // Determine uploader info from authenticated user
        const uploaderId = req.user.S_id || req.user.T_id;
        const uploaderRole = req.user.role;
        const firstName = req.user.S_firstname || req.user.T_firstname || 'User';
        const lastName = req.user.S_lastname || req.user.T_lastname || '';
        const uploadedBy = `${firstName} ${lastName}`.trim();

        const resource = await prisma.libraryResource.create({
            data: {
                title: title.trim(),
                description: description ? description.trim() : null,
                type: (type || "FILE").toUpperCase(),
                subject: subject.trim(),
                url: url.trim(),
                status: "pending",
                uploadedBy,
                uploaderId,
                uploaderRole,
                updatedAt: new Date(),
            },
        });

        res.status(201).json({
            success: true,
            message: "Resource submitted for review",
            data: resource,
        });
    } catch (error) {
        console.error("Error submitting library resource:", error);
        res.status(500).json({
            success: false,
            message: "Failed to submit resource",
        });
    }
};

/**
 * Admin: Get all resources (including pending)
 * @route GET /api/library/admin
 */
export const getAllResourcesAdmin = async (req, res) => {
    try {
        const resources = await prisma.libraryResource.findMany({
            orderBy: { createdAt: "desc" },
        });

        res.status(200).json({
            success: true,
            data: resources,
        });
    } catch (error) {
        console.error("Error fetching all resources (admin):", error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch resources",
        });
    }
};

/**
 * Admin: Update resource status (approve/reject)
 * @route PATCH /api/library/:id/status
 */
export const updateResourceStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!["approved", "rejected", "pending"].includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Invalid status",
            });
        }

        const resource = await prisma.libraryResource.update({
            where: { id: parseInt(id) },
            data: { status, updatedAt: new Date() },
        });

        res.status(200).json({
            success: true,
            message: `Resource status updated to ${status}`,
            data: resource,
        });
    } catch (error) {
        console.error("Error updating resource status:", error);
        res.status(500).json({
            success: false,
            message: "Failed to update status",
        });
    }
};