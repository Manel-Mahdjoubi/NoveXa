// @desc    Create a new quiz (temporary storage approach)
// @route   POST /api/quiz/create
// @access  Private (Teacher only)
const createQuiz = (prisma) => async (req, res) => {
  try {
    const { id, title, chapId, courseId, questions } = req.body;

    // Validation
    if (!title || !questions || questions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Please provide quiz title and at least one question'
      });
    }
    
    if (!chapId) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a chapter ID (chapId) for the quiz'
      });
    }

    // Verify user is a teacher
    if (req.user && req.user.role !== 'teacher') {
      return res.status(403).json({
        success: false,
        error: 'Only teachers can create quizzes'
      });
    }

    // Verify the chapter exists and belongs to the teacher's course
    const chapter = await prisma.chapter.findUnique({
      where: { chap_id: parseInt(chapId) },
      include: {
        Course: {
          select: {
            C_id: true,
            teacherId: true
          }
        }
      }
    });

    if (!chapter) {
      return res.status(404).json({
        success: false,
        error: 'Chapter not found'
      });
    }

    // Verify the teacher owns the course
    if (chapter.Course.teacherId !== req.user.id) {
      return res.status(403).json({
        success: false,
        error: 'You can only create quizzes for your own courses'
      });
    }

    // Check if a quiz already exists for this chapter
    const existingQuiz = await prisma.quiz.findUnique({
      where: { chapId: parseInt(chapId) }
    });

    let quiz;
    if (existingQuiz) {
      // Delete existing quiz and its questions/options
      await prisma.option.deleteMany({
        where: {
          Question: {
            quizId: existingQuiz.quiz_id
          }
        }
      });
      
      await prisma.question.deleteMany({
        where: {
          quizId: existingQuiz.quiz_id
        }
      });

      // Update the quiz
      quiz = await prisma.quiz.update({
        where: { quiz_id: existingQuiz.quiz_id },
        data: {
          quiz_title: title
        }
      });
      
      console.log('Updated existing quiz for chapter:', chapId);
    } else {
      // Create the quiz in the database
      quiz = await prisma.quiz.create({
        data: {
          chapId: parseInt(chapId),
          quiz_title: title
        }
      });
      
      console.log('Created new quiz for chapter:', chapId);
    }

    // Create questions and options
    for (const question of questions) {
      const createdQuestion = await prisma.question.create({
        data: {
          questionText: question.questionText,
          quizId: quiz.quiz_id
        }
      });

      // Create options for this question
      if (question.options && question.options.length > 0) {
        for (const option of question.options) {
          await prisma.option.create({
            data: {
              optionText: option.optionText,
              isCorrect: option.isCorrect || false,
              questionId: createdQuestion.question_id
            }
          });
        }
      }
    }

    console.log('✅ Quiz saved to database:', {
      quizId: quiz.quiz_id,
      title,
      questionCount: questions.length,
      teacherId: req.user?.id,
      chapId: parseInt(chapId),
      courseId: chapter.Course.C_id
    });

    res.status(201).json({
      success: true,
      message: 'Quiz created and saved successfully',
      data: {
        quizId: quiz.quiz_id,
        title: title,
        questionCount: questions.length,
        chapterId: parseInt(chapId),
        courseId: chapter.Course.C_id
      }
    });

  } catch (error) {
    console.error('Create quiz error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error creating quiz: ' + error.message
    });
  }
};

// @desc    Get quiz by ID
// @route   GET /api/quiz/:quizId
// @access  Public
const getQuiz = (prisma) => async (req, res) => {
  try {
    const { quizId } = req.params;

    // Fetch quiz with questions and options
    const quiz = await prisma.quiz.findUnique({
      where: { quiz_id: parseInt(quizId) },
      include: {
        Question: {
          include: {
            Option: true
          }
        }
      }
    });

    if (!quiz) {
      return res.status(404).json({
        success: false,
        error: 'Quiz not found'
      });
    }

    // Format for frontend
    const formattedQuiz = {
      quizId: quiz.quiz_id,
      title: quiz.quiz_title,
      questions: quiz.Question.map(q => ({
        id: q.question_id,
        question: q.questionText,
        options: q.Option.map(o => o.optionText),
        correct: q.Option.findIndex(o => o.isCorrect) // Simplified for frontend (first correct)
      }))
    };

    res.status(200).json({
      success: true,
      data: formattedQuiz
    });

  } catch (error) {
    console.error('Get quiz error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error fetching quiz: ' + error.message
    });
  }
};

// @desc    Submit quiz result
// @route   POST /api/quiz/submit
// @access  Private (Student only)
const submitQuizResult = (prisma) => async (req, res) => {
  try {
    const { quizId, score, answers, chapterId, courseId } = req.body;
    const studentId = req.user.S_id || req.user.id;

    if (!quizId || score === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Please provide quizId and score'
      });
    }

    // Record the attempt
    const attempt = await prisma.quizAttempt.create({
      data: {
        studentId: parseInt(studentId),
        quizId: parseInt(quizId),
        chapterId: parseInt(chapterId),
        courseId: parseInt(courseId),
        score: parseFloat(score),
        completed: true,
        completedAt: new Date()
      }
    });

    // Update enrollment progress
    const enrollment = await prisma.enrollment.findUnique({
      where: {
        studentId_courseId: {
          studentId: parseInt(studentId),
          courseId: parseInt(courseId)
        }
      }
    });

    if (enrollment) {
      const progress = enrollment.progress || {};
      progress.quizzes = progress.quizzes || {};
      progress.quizzes[quizId] = {
        completed: true,
        score: score,
        completedAt: new Date().toISOString()
      };

      await prisma.enrollment.update({
        where: { enrollment_id: enrollment.enrollment_id },
        data: { progress }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Quiz result submitted successfully',
      data: attempt
    });

  } catch (error) {
    console.error('Submit quiz error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error submitting quiz result: ' + error.message
    });
  }
};

export {
  createQuiz,
  getQuiz,
  submitQuizResult
};