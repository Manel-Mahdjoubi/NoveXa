import { prisma } from "../config/db.js";
import { Prisma } from "@prisma/client";
import fs from "fs";

export const getTeacherDashboard = async (req, res) => {
  try {
    if (!req.user) return res.status(401).json({ message: "Not logged in" });
    if (req.user.role !== "teacher") {
      return res.status(403).json({ message: "Access denied." });
    }

    const teacherId = req.user.T_id;

    // 1. Fetch courses with enrollment progress and lecture counts
    const courses = await prisma.course.findMany({
      where: { teacherId },
      select: {
        C_id: true,
        C_title: true,
        Chapter: {
          select: {
            Lecture: { select: { lec_id: true } }
          }
        },
        Enrollment: {
          select: {
            studentId: true,
            progress: true
          }
        }
      }
    });

    if (courses.length === 0) {
      return res.json({
        teacher: { name: req.user.T_firstname },
        courses: [],
        performance: { lectureAttendees: 0, completedCourses: 0, doingQuizzes: 0 },
        tasks: []
      });
    }

    const courseIds = courses.map((c) => c.C_id);

    // 2. Fetch QuizAttempts and Tasks in parallel
    const [quizAttempts, tasks] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { courseId: { in: courseIds }, completed: true },
        select: { courseId: true, studentId: true }
      }),
      prisma.teacherTask.findMany({
        where: { teacherId, completed: false },
        orderBy: { createdAt: 'desc' },
        take: 5
      })
    ]);

    // 3. Process metrics
    let totalEnrollments = 0;
    let totalStarted = 0;
    let totalCompleted = 0;
    let totalWithQuizzes = 0;

    // Map quiz attempts for easy lookup
    const quizMap = new Set(quizAttempts.map(q => `${q.courseId}-${q.studentId}`));

    const formattedCourses = courses.map(course => {
      const lectureCount = course.Chapter.reduce((sum, ch) => sum + ch.Lecture.length, 0);
      const studentCount = course.Enrollment.length;
      totalEnrollments += studentCount;

      course.Enrollment.forEach(enroll => {
        const progressData = enroll.progress || {};
        const lectures = progressData.lectures || {};
        const completedCount = Object.values(lectures).filter(l => l.completed).length;

        if (completedCount > 0) totalStarted++;
        if (lectureCount > 0 && completedCount >= lectureCount) totalCompleted++;
        if (quizMap.has(`${course.C_id}-${enroll.studentId}`)) totalWithQuizzes++;
      });

      return {
        courseId: course.C_id,
        title: course.C_title,
        enrollmentCount: studentCount,
        avgGrade: 'N/A', 
      };
    });

    // 4. Final Performance Calculation (Percentages)
    const performance = {
      lectureAttendees: totalEnrollments > 0 ? Math.round((totalStarted / totalEnrollments) * 100) : 0,
      completedCourses: totalEnrollments > 0 ? Math.round((totalCompleted / totalEnrollments) * 100) : 0,
      doingQuizzes: totalEnrollments > 0 ? Math.round((totalWithQuizzes / totalEnrollments) * 100) : 0,
    };

    res.json({
      teacher: { name: req.user.T_firstname },
      courses: formattedCourses,
      performance,
      tasks
    });
  } catch (err) {
    console.error("Teacher Dashboard Error:", err);
    res.status(500).json({ message: "Dashboard error" });
  }
};