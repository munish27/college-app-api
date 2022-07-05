const express = require('express');
const controller = require('../controllers/admin');
// const { requireAuth, forwardAuth } = require('../middlewares/adminAuth');

const router = express.Router();

// 1. ADMIN

// 1.1 Login
router.post('/login', controller.postLogin);
// 1.2 Register
router.post('/register', controller.postRegister);

// 2.STAFFS
// 2.1 Add staff
router.post('/addStaff', controller.postAddStaff);
// 2.2 Get staffs on query
router.get('/getStaff', controller.getStaffBy);
// 2.3 Get all staffs
router.get('/getAllStaffs', controller.getAllStaff);
// 2.4 Modify existing staffs
// router.post('/settings/staff', requireAuth, controller.postStaffSettings);

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
// 5.2 Add department
router.post('/addDept', controller.postAddDept);
// 5.3 Modify existing department
// router.post('/settings/department', requireAuth, controller.postDeptSettings);

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
// 6.3 Add course
router.post('/addCourse', controller.postAddCourse);
// 6.4 Modify existing courses
// router.post('/settings/course', requireAuth, controller.postCourseSettings);


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
router.post('/addNotification', controller.postNotification);

module.exports = router;