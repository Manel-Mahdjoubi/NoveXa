// courseData.js - Shared course content for both pages
const courseContentData = {
    courseInfo: {
        title: "Machine Learning Fundamentals (ML101)",
        description:
            "Introduction to supervised & unsupervised learning, data preprocessing, model training, and evaluation metrics. Students learn how to implement basic ML algorithms and analyze their performance.",
        duration: "20h Course · 12h TD · 8h TP",
        language: "English",
        rating: "4.7",
        learners: "350",
        certificate: "Certified",
        price: "Free",
        image: "../images/machineLearning.jpg"
    },

    sections: [
        // SECTION 1
        {
            title: "1. Introduction to Machine Learning",
            lectureCount: 5,
            duration: "35 min",
            lectures: [
                {
                    title: "What is Machine Learning?",
                    type: "video",
                    duration: "8 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "ML vs Traditional Programming",
                    type: "video",
                    duration: "7 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Types of Learning (Supervised & Unsupervised)",
                    type: "video",
                    duration: "8 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Applications of Machine Learning",
                    type: "video",
                    duration: "6 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "ML Pipeline Overview",
                    type: "video",
                    duration: "6 min",
                    videoUrl: "",
                    completed: false
                }
            ],
            quiz: {
                hasQuiz: true,
                quizName: "QUIZ 1"
            }
        },

        // SECTION 2
        {
            title: "2. Data Cleaning & Preprocessing",
            lectureCount: 4,
            duration: "40 min",
            lectures: [
                {
                    title: "Understanding Data Types",
                    type: "video",
                    duration: "10 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Handling Missing Data",
                    type: "video",
                    duration: "9 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Normalization & Standardization",
                    type: "video",
                    duration: "11 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Train/Test Split & Data Leakage",
                    type: "video",
                    duration: "10 min",
                    videoUrl: "",
                    completed: false
                }
            ],
            quiz: null
        },

        // SECTION 3
        {
            title: "3. Supervised Learning: Regression",
            lectureCount: 4,
            duration: "35 min",
            lectures: [
                {
                    title: "Introduction to Regression Models",
                    type: "video",
                    duration: "9 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Linear Regression Explained",
                    type: "video",
                    duration: "10 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Gradient Descent Intuition",
                    type: "video",
                    duration: "8 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Overfitting & Regularization (L1/L2)",
                    type: "video",
                    duration: "8 min",
                    videoUrl: "",
                    completed: false
                }
            ],
            quiz: null
        },

        // SECTION 4
        {
            title: "4. Supervised Learning: Classification",
            lectureCount: 4,
            duration: "36 min",
            lectures: [
                {
                    title: "Binary Classification Basics",
                    type: "video",
                    duration: "8 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Logistic Regression",
                    type: "video",
                    duration: "10 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "k-NN Classifier",
                    type: "video",
                    duration: "9 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Decision Boundaries Visualization",
                    type: "video",
                    duration: "9 min",
                    videoUrl: "",
                    completed: false
                }
            ],
            quiz: null
        },

        // SECTION 5
        {
            title: "5. Model Evaluation",
            lectureCount: 5,
            duration: "45 min",
            lectures: [
                {
                    title: "Train vs Test Performance",
                    type: "video",
                    duration: "12 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Accuracy & Error Rate",
                    type: "video",
                    duration: "9 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Precision, Recall & F1 Score",
                    type: "video",
                    duration: "11 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "Confusion Matrix Explained",
                    type: "video",
                    duration: "7 min",
                    videoUrl: "",
                    completed: false
                },
                {
                    title: "ROC Curve & AUC",
                    type: "video",
                    duration: "6 min",
                    videoUrl: "",
                    completed: false
                }
            ],
            quiz: {
                hasQuiz: true,
                quizName: "QUIZ 2"
            }
        }
    ],

    // RESOURCES
    resources: [
        {
            name: "Lecture Slides (Complete)",
            type: "PDF",
            size: "12.4 MB",
            icon: "📄",
            url: "#"
        },
        {
            name: "Python Notebooks",
            type: "ZIP",
            size: "6.9 MB",
            icon: "💻",
            url: "#"
        },
        {
            name: "Mini Datasets Pack",
            type: "ZIP",
            size: "22.1 MB",
            icon: "📊",
            url: "#"
        },
        {
            name: "ML Fundamentals Reference Sheet",
            type: "PDF",
            size: "2.7 MB",
            icon: "📚",
            url: "#"
        }
    ],

    // Helper function to get total lecture count
    getTotalLectures: function() {
        return this.sections.reduce((total, section) => {
            return total + section.lectures.length;
        }, 0);
    },

    // Helper function to get completed lecture count
    getCompletedLectures: function() {
        return this.sections.reduce((total, section) => {
            return total + section.lectures.filter(lecture => lecture.completed).length;
        }, 0);
    },

    // Helper function to get progress percentage
    getProgressPercentage: function() {
        const total = this.getTotalLectures();
        const completed = this.getCompletedLectures();
        return total > 0 ? Math.round((completed / total) * 100) : 0;
    },

    // Mark lecture as complete
    markLectureComplete: function(sectionIndex, lectureIndex) {
        if (this.sections[sectionIndex] && this.sections[sectionIndex].lectures[lectureIndex]) {
            this.sections[sectionIndex].lectures[lectureIndex].completed = true;
            this.saveProgress();
        }
    },

    // Save progress to localStorage
    saveProgress: function() {
        const progressData = {
            sections: this.sections.map(section => ({
                lectures: section.lectures.map(lecture => ({
                    completed: lecture.completed
                }))
            })),
            lastUpdated: new Date().toISOString()
        };
        localStorage.setItem('courseProgress_' + this.courseInfo.title, JSON.stringify(progressData));
    },

    // Load progress from localStorage
    loadProgress: function() {
        const savedProgress = localStorage.getItem('courseProgress_' + this.courseInfo.title);
        if (savedProgress) {
            try {
                const progressData = JSON.parse(savedProgress);
                progressData.sections.forEach((section, sectionIndex) => {
                    section.lectures.forEach((lecture, lectureIndex) => {
                        if (this.sections[sectionIndex] && this.sections[sectionIndex].lectures[lectureIndex]) {
                            this.sections[sectionIndex].lectures[lectureIndex].completed = lecture.completed;
                        }
                    });
                });
            } catch (e) {
                console.error('Error loading progress:', e);
            }
        }
    },

    // Reset all progress (useful for testing or user reset)
    resetProgress: function() {
        this.sections.forEach(section => {
            section.lectures.forEach(lecture => {
                lecture.completed = false;
            });
        });
        localStorage.removeItem('courseProgress_' + this.courseInfo.title);
        console.log('Progress reset successfully');
    }
};

// Load progress when script loads
courseContentData.loadProgress();