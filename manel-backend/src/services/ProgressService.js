import prisma from "../config/prisma.js";

export const getProgressByStudent = async (studentId) => {
  const progressRows = await prisma.progress.findMany({
    where: { studentId },
    select: {
      courseId: true,
      lessonId: true,
    },
  });

  const map = {};
  progressRows.forEach((p) => {
    map[p.courseId] = {
      lastlectureId: p.lectureId,
    };
  });

  return map;
};