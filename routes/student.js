const express = require('express');
const controller = require('../controllers/admin');
// const { requireAuth, forwardAuth } = require('../middlewares/adminAuth');

const router = express.Router();

// 1. ADMIN

// 1.1 Login
router.post('/login', controller.postLoginStudent);

// 2.STAFFS
router.get('/getStaff', controller.getStaffBy);

// 3.STUDENTS
router.get('/getStudent', controller.getStudentsBy);

router.get('/getClass', controller.getAllClass);

// 6.COURSES
router.get('/getCourse', controller.getAllCoursesBy);

// 5.1 All department
router.get('/getAttendance', controller.getAttendanceByClass);

// 7.Exam
router.get('/getmarks', controller.getMarks);
// 7.Notifications
router.get('/getNotifications', controller.getNotifications);

module.exports = router;