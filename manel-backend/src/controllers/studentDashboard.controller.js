import { prisma } from "../config/db.js";



export const getStudentDashboard = async (req, res) => {
  try {
    const studentId = req.user.S_id;

    if (!studentId) {
      return res.status(403).json({ message: "Access denied. Not a student account." });
    }


    // 1. Fetch Student & Enrollments (Lightweight - no deep includes)
    const [student, enrollments] = await Promise.all([
      prisma.student.findUnique({
        where: { S_id: studentId },
        select: { S_id: true, S_firstname: true, S_lastname: true, S_email: true },
      }),
      prisma.enrollment.findMany({
        where: { studentId },
        select: {
          courseId: true,
          progress: true,
          Course: {
            select: {
              C_id: true,
              C_title: true,
              Chapter: {
                select: {
                  _count: { select: { Lecture: true } },
                  Lecture: {
                    take: 1, // Only need first lecture of first chapter to find next lesson
                    orderBy: { lec_id: 'asc' },
                    select: { lec_id: true }
                  }
                },
                orderBy: { chap_id: 'asc' },
                take: 1 // Only need first chapter to find next lesson
              }
            }
          }
        }
      }),
    ]);

    if (!student) return res.status(404).json({ message: "Student not found" });

    const courseIds = enrollments.map(e => e.courseId);

    // 2. Batch fetch total lecture counts per course efficiently
    const lectureCountsRaw = await prisma.chapter.groupBy({
      by: ['courseId'],
      where: { courseId: { in: courseIds } },
      _sum: { numlecture: true }
    });

    const lectureCountMap = {};
    lectureCountsRaw.forEach(item => {
      lectureCountMap[item.courseId] = item._sum.numlecture || 0;
    });

    // 3. Batch fetch other related data
    const [quizAttempts, certificates, progressRecords] = await Promise.all([
      prisma.quizAttempt.findMany({
        where: { studentId, courseId: { in: courseIds }, completed: true },
        select: { courseId: true, score: true }
      }),
      prisma.certificate.findMany({
        where: { studentId, courseId: { in: courseIds } },
        select: { courseId: true, certificateId: true }
      }),
      prisma.progress.findMany({
        where: { studentId, courseId: { in: courseIds } },
        distinct: ['courseId'],
        select: { courseId: true }
      })
    ]);

    // 4. Create maps for O(1) lookups
    const quizMap = {};
    quizAttempts.forEach(q => {
      if (!quizMap[q.courseId]) quizMap[q.courseId] = [];
      quizMap[q.courseId].push(q);
    });

    const certMap = {};
    certificates.forEach(c => {
      certMap[c.courseId] = c.certificateId;
    });
    const progressMap = new Set(progressRecords.map(p => p.courseId));

    // 4. Transform data
    const courses = [];
    const dashboardCertificates = [];
    const grades = [];

    for (const enrollment of enrollments) {
      const course = enrollment.Course;
      const cId = course.C_id;

      // Calculate progress using JSON & pre-fetched counts
      const progressData = enrollment.progress || {};
      const completedLecturesList = progressData.lectures || {};
      const finishedLectures = Object.values(completedLecturesList).filter(l => l.completed).length;
      const totalLectures = lectureCountMap[cId] || 0;

      const progressPercent = totalLectures > 0 ? Math.round((finishedLectures / totalLectures) * 100) : 0;

      // Next Lesson Logic (Optimized - first lecture of first chapter)
      let nextLessonId = null;
      if (!progressMap.has(cId)) {
        const firstChap = course.Chapter[0];
        if (firstChap?.Lecture?.[0]) nextLessonId = firstChap.Lecture[0].lec_id;
      }

      // Grade Logic
      const courseQuizzes = quizMap[cId] || [];
      let avgGrade = null;
      if (courseQuizzes.length > 0) {
        const total = courseQuizzes.reduce((sum, q) => sum + (q.score || 0), 0);
        avgGrade = (total / courseQuizzes.length).toFixed(2);
      }

      courses.push({
        courseId: cId,
        title: course.C_title,
        progress: progressPercent,
        nextLessonId
      });

      grades.push({
        courseId: cId,
        courseName: course.C_title,
        grade: avgGrade,
        total: 20
      });

      if (certMap[cId]) {
        dashboardCertificates.push({
          courseId: cId,
          courseName: course.C_title,
          certificateId: certMap[cId],
          available: true
        });
      }
    }

    return res.status(200).json({
      student: {
        id: student.S_id,
        name: `${student.S_firstname} ${student.S_lastname}`,
        email: student.S_email,
      },
      courses,
      grades,
      certificates: dashboardCertificates,
    });
  } catch (error) {
    console.error("Student Dashboard Error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};