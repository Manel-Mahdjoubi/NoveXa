import prisma from "../config/prisma.js";

export const getEnrollmentsByStudent = async (studentId) => {
  const enrollments = await prisma.enrollment.findMany({
    where: { studentId },
    select: {
      courseId: true,
      progress: true,
    },
  });

  // Convert array → object indexed by courseId
  const map = {};
  enrollments.forEach((e) => {
    map[e.courseId] = {
      status: e.status,
      progress: e.progress,
    };
  });

  return map;
};