import { prisma } from "../config/db.js";

/**
 * Get all tasks for the authenticated teacher
 * @route GET /tasks
 */
export const getTasks = async (req, res) => {
  try {
    const tasks = await prisma.teacherTask.findMany({
      where: { teacherId: req.user.T_id },
      orderBy: { createdAt: 'desc' } // Most recent first
    });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch tasks"
    });
  }
};

/**
 * Create a new task for the authenticated teacher
 * @route POST /tasks
 */
export const createTask = async (req, res) => {
  try {
    const { text } = req.body;

    // Validation
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: "Task text is required"
      });
    }

    if (text.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Task text cannot exceed 500 characters"
      });
    }

    const task = await prisma.teacherTask.create({
      data: {
        teacherId: req.user.T_id,
        text: text.trim()
      }
    });

    res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: task
    });
  } catch (error) {
    console.error("Error creating task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create task"
    });
  }
};

/**
 * Update a task - only if it belongs to the authenticated teacher
 * @route PATCH /tasks/:id
 */
export const updateTask = async (req, res) => {
  try {
    const taskId = +req.params.id;
    const { text, completed } = req.body;

    // Validate task ID
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID"
      });
    }

    // Check if task exists and belongs to the teacher
    const existingTask = await prisma.teacherTask.findUnique({
      where: { task_id: taskId }
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Security check: Ensure task belongs to the authenticated teacher
    if (existingTask.teacherId !== req.user.T_id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to update this task"
      });
    }

    // Validate input
    const updateData = {};

    if (text !== undefined) {
      if (text.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Task text cannot be empty"
        });
      }
      if (text.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Task text cannot exceed 500 characters"
        });
      }
      updateData.text = text.trim();
    }

    if (completed !== undefined) {
      if (typeof completed !== 'boolean') {
        return res.status(400).json({
          success: false,
          message: "Completed must be a boolean value"
        });
      }
      updateData.completed = completed;
      // Set completedAt or clear it
      updateData.completedAt = completed ? new Date() : null;
    }

    // Check if there's anything to update
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: "No valid fields to update"
      });
    }

    // Update the task
    const task = await prisma.teacherTask.update({
      where: { task_id: taskId },
      data: updateData
    });

    res.status(200).json({
      success: true,
      message: "Task updated successfully",
      data: task
    });
  } catch (error) {
    console.error("Error updating task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update task"
    });
  }
};

/**
 * Delete a task - only if it belongs to the authenticated teacher
 * @route DELETE /tasks/:id
 */
export const deleteTask = async (req, res) => {
  try {
    const taskId = +req.params.id;

    // Validate task ID
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID"
      });
    }

    // Check if task exists and belongs to the teacher
    const existingTask = await prisma.teacherTask.findUnique({
      where: { task_id: taskId }
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    // Security check: Ensure task belongs to the authenticated teacher
    if (existingTask.teacherId !== req.user.T_id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to delete this task"
      });
    }

    // Delete the task
    await prisma.teacherTask.delete({
      where: { task_id: taskId }
    });

    res.status(200).json({
      success: true,
      message: "Task deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete task"
    });
  }
};

/**
 * Get a single task by ID
 * @route GET /tasks/:id
 */
export const getTaskById = async (req, res) => {
  try {
    const taskId = +req.params.id;

    // Validate task ID
    if (isNaN(taskId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid task ID"
      });
    }

    const task = await prisma.teacherTask.findUnique({
      where: { task_id: taskId }
    });

    if (!task) {
      return res.status(404).json({
        success: false,
        message: "Task not found"
      });
    }

    //  Ensuring task belongs to the authenticated teacher
    if (task.teacherId !== req.user.T_id) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to view this task"
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch task"
    });
  }
};