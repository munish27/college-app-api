const express = require('express');
const controller = require('../controllers/admin');
// const { requireAuth, forwardAuth } = require('../middlewares/adminAuth');

const router = express.Router();

// 1. ADMIN

// 1.1 Login
router.post('/login', controller.postLoginStaff);

// 2.STAFFS
router.get('/getStaff', controller.getStaffBy);

// 3.STUDENTS
// 3.1 Add Student
router.post('/addStudent', controller.postAddStudent);
// 3.2 Get Students on query
router.get('/getStudent', controller.getStudentsBy);
// 3.3 Get all Students
router.get('/getAllStudents', controller.getAllStudents);
// 3.4 Modify existing students
// router.post('/settings/student', requireAuth, controller.postStudentSettings);

// 4.CLASSES (subjects mapping courses ,staffs and section)
// 4.1 All class
router.get('/getClass', controller.getAllClass);
// 4.2 Add class
router.post('/addClass', controller.postAddClass);
// 4.3 Modify existing classes
// router.post('/settings/class', requireAuth, controller.postClassSettings);

// 5.DEPARTMENTS
// 5.1 All department
router.get('/getDept', controller.getDept);

// 5.DEPARTMENTS
// 5.1 All department
router.get('/getSem', controller.getSem);
// 5.2 Add department
router.post('/addSem', controller.postAddSem);
// 5.3 Modify existing department
// router.post('/settings/department', requireAuth, controller.postDeptSettings);

// 6.COURSES
// 6.1 Get all courses
router.get('/getAllCourses', controller.getAllCourses);
// 6.2 Get courses on query
router.get('/getCourse', controller.getAllCoursesBy);


// 7.Attendance
// 5.1 All department
router.get('/getAttendance', controller.getAttendanceByClass);
// 5.2 Add department
router.post('/addAttendance', controller.postAttendanceByClass);
// 5.3 Modify existing department
// router.post('/settings/department', requireAuth, controller.postDeptSettings);

// 7.Exam
// 5.1 All department
router.get('/getExam', controller.getExamByCourse);
// 5.2 Add department
router.post('/addExam', controller.postExam);
// 5.3 Modify existing department
// router.post('/settings/department', requireAuth, controller.postDeptSettings);
// 7.Exam
// 5.1 All department
router.get('/getmarks', controller.getMarks);
// 5.2 Add department
router.post('/addMarks', controller.postMark);
// 5.3 Modify existing department
// router.post('/settings/department', requireAuth, controller.postDeptSettings);
// 7.Notifications
router.get('/getNotifications', controller.getNotifications);
module.exports = router;