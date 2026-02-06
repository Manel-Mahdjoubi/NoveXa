import { prisma } from '../config/db.js';
import { asyncHandler } from '../middleware/errorHandler.js';
import { organizeFiles, cleanupTempFiles } from '../middleware/upload.middleware.js';
import fs from 'fs';//file system module
import path from 'path'; //path module
import { deleteFolderRecursive } from '../utils/fileUtils.js';


/**
 * @desc    Create a new course
 * @route   POST /api/courses
 * @access  Private/Teacher
 */
export const createCourse = asyncHandler(async (req, res) => {
   // Parse JSON data from FormData
  const courseData = JSON.parse(req.body.courseData || '{}');
  
  const {
    courseName,
    field,
    destinatedTo,
    sessions,
    chapters,
    description,
    maxStudents,
    price,
    certificate,
  } = courseData;

  /*=================================
         Validate required fields
    =================================*/ 
  const errors = [];

  // Organize uploaded files by fieldname to check for missing files
  const filesMap = {};
  if (req.files && req.files.length > 0) {
    req.files.forEach(file => {
      if (!filesMap[file.fieldname]) {
        filesMap[file.fieldname] = [];
      }
      filesMap[file.fieldname].push(file);
    });
  }

  if (!courseName?.trim()) errors.push({ field: 'courseName', message: 'Name is required' });
  if (!field?.trim()) errors.push({ field: 'field', message: 'Field is required' });
  if (!destinatedTo?.trim()) errors.push({ field: 'destinatedTo', message: 'Destination is required' });
  if (!description?.trim()) errors.push({ field: 'description', message: 'Description is required' });
  
  if (!sessions || parseInt(sessions) <= 0) {
    errors.push({ field: 'sessions', message: 'Must be greater than 0' });
  }
  
  if (!maxStudents || parseInt(maxStudents) <= 0) {
    errors.push({ field: 'maxStudents', message: 'Must be greater than 0' });
  }
  
  if (!price || parseFloat(price.toString().replace(/[^0-9.]/g, '')) <= 0) {
    errors.push({ field: 'price', message: 'Price must be greater than 0' });
  }
  
  if (!certificate?.trim()) {
    errors.push({ field: 'certificate', message: 'Certificate is required' });
  }

  // Validate Course Image
  if (!filesMap['courseImage']?.[0]) {
      errors.push({ field: 'courseImage', message: 'Course image is required' });
  }

  // Validate chapters
  if (!chapters || !Array.isArray(chapters) || chapters.length === 0) {
     errors.push({ field: 'chapters', message: 'At least one chapter is required' });
  } else {
      // Validate each chapter
      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        
        if (!chapter.name?.trim()) {
           errors.push({ field: `chapter_${i}_name`, message: `Name required` });
        }
        
        if (!chapter.numLectures || parseInt(chapter.numLectures) <= 0) {
             errors.push({ field: `chapter_${i}_lectures`, message: `Must have lectures` });
        }
        
        // Validate each lecture
        if (chapter.lectures) {
            for (let j = 0; j < chapter.lectures.length; j++) {
              const lecture = chapter.lectures[j];
              
              if (!lecture.name?.trim()) {
                 errors.push({ field: `lecture_${i}_${j}_name`, message: `Name required` });
              }

              // Validate Video
              const videoFieldName = `video_${i}_${j}`;
              if (!filesMap[videoFieldName]?.[0]) {
                  errors.push({ field: videoFieldName, message: 'Video required' });
              }
            }
        }
      }
  }

  // If there are errors, return them
  if (errors.length > 0) {
      if (req.files) cleanupTempFiles(req.files);
      return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors
      });
  }





  // Get teacher ID from authenticated user
  const teacherId = req.user.T_id;


  try {
    // 1. Create the course
    const newCourse = await prisma.course.create({
      data: {
        C_title: courseName.trim(),
        C_desc: description.trim(),
        C_image: 'placeholder.jpg', // Temporary, will update after organizing files
        C_field: field.trim(),
        C_destination: destinatedTo.trim(),
        C_sessnum: parseInt(sessions),
        C_maxstud: parseInt(maxStudents),
        C_price: parseFloat(price.toString().replace(/[^0-9.]/g, '')),
        C_certificate: certificate.toLowerCase().trim() === 'yes',
        Teacher: {
          connect: { T_id: teacherId }
        }
      }
    });

    // Handle course image
    const courseImageFile = filesMap['courseImage']?.[0];
    if (courseImageFile) {
      try {
        const imageResult = await organizeFiles(
          newCourse.C_id,
          'course',
          'image',
          courseImageFile // Pass file object (buffer)
        );
        
        await prisma.course.update({
          where: { C_id: newCourse.C_id },
          data: { C_image: imageResult.url }
        });
      } catch (uploadError) {
        console.error('Course image upload failed:', uploadError);
        // Continue, but maybe with placeholder? Or fail?
        // For now, we continue or let it fail if critical.
        // If strict: throw uploadError;
      }
    }

    // 2. Create chapters with lectures
    // 2. Create chapters with lectures in PARALLEL
    await Promise.all(chapters.map(async (chapter, chapterIndex) => {
      const newChapter = await prisma.chapter.create({
        data: {
          chap_title: chapter.name.trim(),
          numlecture: parseInt(chapter.numLectures),
          courseId: newCourse.C_id
        }
      });

      // 3. Create lectures for this chapter in PARALLEL
      await Promise.all(chapter.lectures.map(async (lecture, lectureIndex) => {
        // Find video for this lecture
        const videoFieldName = `video_${chapterIndex}_${lectureIndex}`;
        const videoFile = filesMap[videoFieldName]?.[0];

        if (!videoFile) {
          throw new Error(`Video is required for lecture ${lecture.name}`);
        }

        // Prepare upload promises
        const videoUploadPromise = organizeFiles(
          newCourse.C_id,
          newChapter.chap_id,
          `lecture_${lectureIndex}`,
          videoFile
        ).then(result => {
           if (!result || !result.url) {
             throw new Error(`Upload succeeded but returned no URL for lecture ${lecture.name}`);
           }
           return result;
        }).catch(error => {
           throw new Error(`Failed to upload video for lecture ${lecture.name}: ${error.message}`);
        });

        // Handle lecture files
        const filesFieldName = `files_${chapterIndex}_${lectureIndex}`;
        const lectureFiles = filesMap[filesFieldName] || [];
        
        const filesUploadPromises = lectureFiles.map(file => 
          organizeFiles(
            newCourse.C_id,
            newChapter.chap_id,
            `lecture_${lectureIndex}`,
            file
          ).then(res => res.url)
        );

        // Wait for uploads to complete
        const [videoResult, filePaths] = await Promise.all([
          videoUploadPromise,
          Promise.all(filesUploadPromises)
        ]);

        // Create lecture
        await prisma.lecture.create({
          data: {
            lec_title: lecture.name.trim(),
            lec_file: JSON.stringify(filePaths),
            lec_vid: videoResult.url,
            lec_duration: videoResult.duration,
            Chapter: {
               connect: { chap_id: newChapter.chap_id }
           }
          }
        });
      }));

      // 4. Create Quiz if exists for this chapter
      if (chapter.quiz) {
        console.log(`Creating quiz for chapter: ${chapter.name}`);
        
        const newQuiz = await prisma.quiz.create({
          data: {
            quiz_title: chapter.quiz.quiz_title,
            chapId: newChapter.chap_id
          }
        });

        // Create questions and options
        // Note: Questions must still be sequential-ish if we want to guarantee order, 
        // usually safer to mapping them but Prisma creation order isn't guaranteed with Promise.all unless we use $transaction or similar.
        // For questions, strict order might not be critical or front-end handles it.
        // Let's use Promise.all for questions too for speed.
        if (chapter.quiz.questions && chapter.quiz.questions.length > 0) {
            await Promise.all(chapter.quiz.questions.map(async (q) => {
                await prisma.question.create({
                    data: {
                        questionText: q.questionText,
                        quizId: newQuiz.quiz_id,
                        Option: {
                            create: q.options.map(opt => ({
                                optionText: opt.optionText,
                                isCorrect: opt.isCorrect
                            }))
                        }
                    }
                });
            }));
        }
      }
    }));


    // Return the complete course with relations
    const course = await prisma.course.findUnique({
      where: { C_id: newCourse.C_id },
      include: {
        Teacher: {
          select: {
            T_id: true,
            T_firstname: true,
            T_lastname: true,
            T_email: true,
          }
        },
        Chapter: {
          include: {
            Lecture: true,
            Quiz:true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      message: 'Course created successfully',
      course
    });
  } catch (error) {
    // Cleanup uploaded files on error
    if (req.files) {
      cleanupTempFiles(req.files);
    }

    console.error('Course creation error:', error);
    
    // Send response if not already sent
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to create course',
        error: error.message
      });
    }
  }
});

/**
 * @desc    Get all courses
 * @route   GET /api/courses
 * @access  Public
 */
export const getAllCourses = asyncHandler(async (req, res) => {
  const { field, minPrice, maxPrice, search, page = 1, limit = 10 } = req.query;

  // Build filter object
  const where = {};

  if (field) {
    where.C_field = { contains: field, mode: 'insensitive' };
  }

  if (minPrice || maxPrice) {
    where.C_price = {};
    if (minPrice) where.C_price.gte = parseFloat(minPrice);
    if (maxPrice) where.C_price.lte = parseFloat(maxPrice);
  }

  if (search) {
    where.OR = [
      { C_title: { contains: search, mode: 'insensitive' } },
      { C_desc: { contains: search, mode: 'insensitive' } }
    ];
  }

  const skip = (parseInt(page) - 1) * parseInt(limit);

  const [courses, total] = await Promise.all([
    prisma.course.findMany({
      where,
      skip,
      take: parseInt(limit),
      include: {
        Teacher: {
          select: {
            T_id: true,
            T_firstname: true,
            T_lastname: true,
            T_pfp: true
          }
        },
        Chapter: {
          select: {
            chap_id: true,
            chap_title: true,
            numlecture: true
          }
        }
      },
      orderBy: { created_at: 'desc' }
    }),
    prisma.course.count({ where })
  ]);

  res.status(200).json({
    success: true,
    count: courses.length,
    total,
    pages: Math.ceil(total / parseInt(limit)),
    currentPage: parseInt(page),
    courses
  });
});

/**
 * @desc    Get single course by ID
 * @route   GET /api/courses/:id
 * @access  Public
 */
export const getCourseById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // Convert id to integer
  const courseId = parseInt(id);
  
  if (isNaN(courseId)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  const course = await prisma.course.findUnique({
    where: { C_id: courseId },
    include: {
      Teacher: {
        select: {
          T_id: true,
          T_firstname: true,
          T_lastname: true,
          T_email: true,
          T_pfp: true,
          T_bio: true
        }
      },
      Chapter: {
        include: {
          Lecture: true,
          Quiz: {
            include: {
              Question: {
                include: {
                  Option: true
                }
              }
            }
          }
        }
      }
    }
  });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  res.status(200).json({
    success: true,
    course
  });
});

/**
 * @desc    Get courses by teacher
 * @route   GET /api/courses/teacher/:teacherId
 * @access  Public
 */
export const getCoursesByTeacher = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  // Convert teacherId to integer
  const tId = parseInt(teacherId);
  
  if (isNaN(tId)) {
    res.status(400);
    throw new Error('Invalid teacher ID');
  }

  const courses = await prisma.course.findMany({
    where: { teacherId: tId },
    include: {
      Chapter: {
        select: {
          chap_id: true,
          chap_title: true,
          numlecture: true
        }
      }
    },
    orderBy: { created_at: 'desc' }
  });

  res.status(200).json({
    success: true,
    count: courses.length,
    courses
  });
});

/**
 * @desc    Update course
 * @route   PUT /api/courses/:id
 * @access  Private/Teacher (own courses only)
 */
export const updateCourse = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const teacherId = req.user.T_id;

  // Convert id to integer
  const courseId = parseInt(id);
  
  if (isNaN(courseId)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  // Check if course exists and belongs to teacher
  const course = await prisma.course.findUnique({
    where: { C_id: courseId }
  });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (course.teacherId !== teacherId) {
    res.status(403);
    throw new Error('Not authorized to update this course');
  }

  const updatedCourse = await prisma.course.update({
    where: { C_id: courseId },
    data: {
      ...(req.body.C_title && { C_title: req.body.C_title }),
      ...(req.body.C_desc && { C_desc: req.body.C_desc }),
      ...(req.body.C_image && { C_image: req.body.C_image }),
      ...(req.body.C_field && { C_field: req.body.C_field }),
      ...(req.body.C_destination && { C_destination: req.body.C_destination }),
      ...(req.body.C_maxstud && { C_maxstud: parseInt(req.body.C_maxstud) }),
      ...(req.body.C_price && { C_price: parseFloat(req.body.C_price) }),
      ...(req.body.C_certificate !== undefined && { C_certificate: req.body.C_certificate })
    },
    include: {
      Teacher: {
        select: {
          T_firstname: true,
          T_lastname: true
        }
      },
      Chapter: true
    }
  });

  res.status(200).json({
    success: true,
    message: 'Course updated successfully',
    course: updatedCourse
  });
});

/**
 * @desc    Request course deletion (Teacher)
 * @route   POST /api/courses/:id/request-deletion
 * @access  Private/Teacher (own courses only)
 */
export const requestCourseDeletion = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { reason } = req.body;
  const teacherId = req.user.T_id;
  const courseId = parseInt(id);

  if (isNaN(courseId)) {
    res.status(400);
    throw new Error('Invalid course ID');
  }

  if (!reason || reason.trim().length < 10) {
    res.status(400);
    throw new Error('Please provide a reason (at least 10 characters)');
  }

  const course = await prisma.course.findUnique({ where: { C_id: courseId } });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (course.teacherId !== teacherId) {
    res.status(403);
    throw new Error('Not authorized to request deletion for this course');
  }

  // Check if there's already a pending deletion request
  const existingRequest = await prisma.deletionRequest.findFirst({
    where: {
      courseId: courseId,
      status: 'pending'
    }
  });

  if (existingRequest) {
    res.status(400);
    throw new Error('A deletion request for this course is already pending');
  }

  // Use transaction to ensure both operations succeed
  await prisma.$transaction([
    prisma.deletionRequest.create({
      data: {
        courseId: courseId,
        teacherId: teacherId,
        reason: reason.trim(),
        status: 'pending'
      }
    }),
    prisma.course.update({
      where: { C_id: courseId },
      data: { deletionRequested: true }
    })
  ]);

  res.status(200).json({
    success: true,
    message: 'Course deletion request sent to admin.'
  });
});

/**
 * @desc    Admin approves/rejects course deletion
 * @route   POST /api/courses/admin/deletion
 * @access  Private/Admin
 */
export const handleCourseDeletionRequest = asyncHandler(async (req, res) => {
  const { courseId, approve } = req.body;

  if (!courseId || typeof approve !== 'boolean') {
    res.status(400);
    throw new Error('courseId and approve (true/false) are required');
  }

  const course = await prisma.course.findUnique({ where: { C_id: courseId } });

  if (!course) {
    res.status(404);
    throw new Error('Course not found');
  }

  if (!course.deletionRequested) {
    res.status(400);
    throw new Error('No deletion request for this course');
  }

  if (approve) {
    // 1. Update DeletionRequest records to approved
    await prisma.deletionRequest.updateMany({
      where: {
        courseId: courseId,
        status: 'pending'
      },
      data: {
        status: 'approved',
        reviewedAt: new Date()
      }
    });

    // 2. Delete course files
    const courseFilesPath = path.join('uploads', 'courses', String(course.C_id));
    deleteFolderRecursive(courseFilesPath);

    // 3. Delete course record from DB (cascades to chapters, lectures, etc.)
    await prisma.course.delete({ where: { C_id: courseId } });

    res.status(200).json({ 
      success: true, 
      message: 'Course and its files deleted successfully' 
    });
  } else {
    // 1. Update DeletionRequest records to rejected
    await prisma.deletionRequest.updateMany({
      where: {
        courseId: courseId,
        status: 'pending'
      },
      data: {
        status: 'rejected',
        reviewedAt: new Date()
      }
    });

    // 2. Reject request on course
    await prisma.course.update({
      where: { C_id: courseId },
      data: { deletionRequested: false }
    });
    
    res.status(200).json({ 
      success: true, 
      message: 'Course deletion request rejected' 
    });
  }
});

/**
 * @desc    Get all courses with pending deletion requests (Admin only)
 * @route   GET /api/courses/admin/deletion-requests
 * @access  Private/Admin
 */
export const getPendingDeletionRequests = asyncHandler(async (req, res) => {
  const courses = await prisma.course.findMany({
    where: { deletionRequested: true },
    include: {
      Teacher: {
        select: {
          T_id: true,
          T_firstname: true,
          T_lastname: true,
          T_email: true
        }
      },
      Chapter: {
        select: {
          chap_id: true,
          chap_title: true
        }
      }
    },
    orderBy: { updated_at: 'desc' }
  });

  res.status(200).json({
    success: true,
    count: courses.length,
    courses
  });
});






/*==========================
   For the quiz-course backend
  ==========================*/

  /**
 * @desc    Link quiz to chapter
 * @route   POST /api/courses/chapters/:chapterId/quiz
 * @access  Private/Teacher
 */
export const linkQuizToChapter = asyncHandler(async (req, res) => {
  const { chapterId } = req.params;
  const { quiz_title, questions } = req.body;

  // Convert chapterId to integer
  const chapId = parseInt(chapterId);
  
  if (isNaN(chapId)) {
    res.status(400);
    throw new Error('Invalid chapter ID');
  }

  // Validate questions array
  if (!questions || !Array.isArray(questions) || questions.length === 0) {
    res.status(400);
    throw new Error('Quiz must have at least one question');
  }

  // Validate each question
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    
    if (!q.questionText?.trim()) {
      res.status(400);
      throw new Error(`Question ${i + 1}: Text is required`);
    }
    
    if (!q.options || !Array.isArray(q.options) || q.options.length < 2) {
      res.status(400);
      throw new Error(`Question ${i + 1}: Must have at least 2 options`);
    }
    
    const correctCount = q.options.filter(opt => opt.isCorrect).length;
    if (correctCount !== 1) {
      res.status(400);
      throw new Error(`Question ${i + 1}: Must have exactly one correct answer`);
    }
  }

  try {
    // Check if chapter exists
    const chapter = await prisma.chapter.findUnique({
      where: { chap_id: chapId },
      include: {
        Course: {
          select: { teacherId: true }
        },
        Quiz: true
      }
    });

    if (!chapter) {
      res.status(404);
      throw new Error('Chapter not found');
    }

    // Check if teacher owns this course
    if (chapter.Course.teacherId !== req.user.T_id) {
      res.status(403);
      throw new Error('Not authorized to add quiz to this chapter');
    }

    // Check if chapter already has a quiz
    if (chapter.Quiz) {
      res.status(400);
      throw new Error('This chapter already has a quiz. Only one quiz per chapter is allowed.');
    }

    // Create quiz with questions and options
    const quiz = await prisma.$transaction(async (tx) => {
      const newQuiz = await tx.quiz.create({
        data: {
          quiz_title: quiz_title?.trim() || `${chapter.chap_title} Quiz`,
          chapId: chapId
        }
      });

      // Create questions with options
      for (const question of questions) {
        const newQuestion = await tx.question.create({
          data: {
            questionText: question.questionText.trim(),
            quizId: newQuiz.quiz_id
          }
        });

        // Create options
        for (const option of question.options) {
          await tx.option.create({
            data: {
              optionText: option.optionText.trim(),
              isCorrect: Boolean(option.isCorrect),
              questionId: newQuestion.question_id
            }
          });
        }
      }

      // Return complete quiz
      return await tx.quiz.findUnique({
        where: { quiz_id: newQuiz.quiz_id },
        include: {
          Question: {
            include: {
              Option: true
            }
          }
        }
      });
    });

    res.status(201).json({
      success: true,
      message: 'Quiz linked to chapter successfully',
      quiz
    });
  } catch (error) {
    console.error('Quiz linking error:', error);
    res.status(500);
    throw new Error(`Failed to link quiz: ${error.message}`);
  }
});

/**
 * @desc    Get quiz by chapter ID
 * @route   GET /api/courses/chapters/:chapterId/quiz
 * @access  Public
 */
export const getQuizByChapter = asyncHandler(async (req, res) => {
  const { chapterId } = req.params;
  const chapId = parseInt(chapterId);
  
  if (isNaN(chapId)) {
    res.status(400);
    throw new Error('Invalid chapter ID');
  }

  const quiz = await prisma.quiz.findUnique({
    where: { chapId: chapId },
    include: {
      Question: {
        include: {
          Option: true
        }
      }
    }
  });

  if (!quiz) {
    res.status(404);
    throw new Error('No quiz found for this chapter');
  }

  res.status(200).json({
    success: true,
    quiz
  });
});