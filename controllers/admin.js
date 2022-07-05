const mysql = require('mysql');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const uuidv4 = require('uuid').v4;
const validator = require('validator');
const firebase = require('firebase-admin');
const moment = require('moment');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    dateStrings: 'date',
    database: 'clg_management',
});

// // Students limit per section
// const SECTION_LIMIT = 20;

// Database query promises
const zeroParamPromise = (sql) => {
    return new Promise((resolve, reject) => {
        db.query(sql, (err, results) => {
            if (err) return reject(err);
            return resolve(results);
        });
    });
};

const queryParamPromise = (sql, queryParam) => {
    return new Promise((resolve, reject) => {
        db.query(sql, queryParam, (err, results) => {
            if (err) return reject(err);
            return resolve(results);
        });
    });
};

exports.postLogin = async (req, res, next) => {
    try {
        const { email, uuid } = req.body;
        if (!email || validator.isEmpty(email)) {
            const err = new Error('Enter valid Email');
            err.status = 401;
            throw err;
        } else if (!uuid || validator.isEmpty(uuid)) {
            const err = new Error('Enter valid UUID');
            err.status = 401;
            throw err;
        }
        const sql1 = 'SELECT * FROM admin WHERE email = ? AND admin_id = ?';
        const users = await queryParamPromise(sql1, [email, uuid]);

        if (!users || users.length < 1) {
            const err = new Error('No Users Found');
            err.status = 404;
            throw err;
        }
        const token = jwt.sign({ id: users[0].admin_id }, process.env.JWT_SECRET);
        res.status(200).send({
            'response_code': 200,
            'data': {
                'name': users[0].name,
                'email': users[0].email,
                'token': token,
                'admin_id': users[0].admin_id,
            }
        });
    } catch (error) {
        next(error);
    }
};

exports.postRegister = async (req, res, next) => {
    const { name, email, uuid } = req.body;
    try {

        if (!email || validator.isEmpty(email)) {
            const err = new Error('Enter valid Email');
            err.status = 401;
            throw err;
        } else if (!uuid || validator.isEmpty(uuid)) {
            const err = new Error('Enter valid UUID');
            err.status = 401;
            throw err;
        } else if (!name || validator.isEmpty(name)) {
            const err = new Error('Enter valid name');
            err.status = 401;
            throw err;
        }

        const sql2 = 'INSERT INTO ADMIN SET ?';
        await queryParamPromise(sql2, {
            admin_id: uuid,
            name: name,
            email: email,
        });
        res.status(201).send({
            'response_code': 201,
            'response_message': "Admin Registered Successfully",
        });
    } catch (error) {
        next(error);
    }
};


exports.postAddStaff = async (req, res, next) => {
    try {
        const { email } = req.body;

        if (!email || validator.isEmpty(email)) {
            const err = new Error('Enter valid email');
            err.status = 401;
            throw err;
        }
        const sql1 = 'SELECT count(*) as `count` from staff where email = ?';
        const count = (await queryParamPromise(sql1, [email]))[0].count;
        if (count !== 0) {
            const err = new Error('Staff already exits');
            err.status = 409;
            throw err;
        } else {
            const {
                dob,
                name,
                gender,
                department,
                address,
                city,
                postalCode,
                contact,
            } = req.body;

            if (!dob || validator.isEmpty(dob)) {
                const err = new Error('Enter valid Date of birth');
                err.status = 401;
                throw err;
            } else if (!name || validator.isEmpty(name)) {
                const err = new Error('Enter valid name');
                err.status = 401;
                throw err;
            } else if (!gender || validator.isEmpty(gender)) {
                const err = new Error('Enter valid gender');
                err.status = 401;
                throw err;
            } else if (!department || validator.isEmpty(department)) {
                const err = new Error('Select valid department');
                err.status = 401;
                throw err;
            } else if (!address || validator.isEmpty(address)) {
                const err = new Error('Enter valid address');
                err.status = 401;
                throw err;
            } else if (!city || validator.isEmpty(city)) {
                const err = new Error('Enter valid city');
                err.status = 401;
                throw err;
            } else if (!postalCode || validator.isEmpty(postalCode) || postalCode.length != 6) {
                const err = new Error('Enter valid phone number');
                err.status = 401;
                throw err;
            } else if (!contact || validator.isEmpty(contact) || contact.length != 10) {
                const err = new Error('Enter valid phone number');
                err.status = 401;
                throw err;
            }

            //check valid department
            const sqlDepartment = 'SELECT * FROM department WHERE dept_id = ?';
            const resultsDepat = await queryParamPromise(sqlDepartment, [department]);
            if (!resultsDepat || resultsDepat.length < 1) {
                const err = new Error('Department not found');
                err.status = 404;
                throw err;
            }


            //firebase create user

            let _firebaseUser;

            try {
                const _checkUser = await firebase.auth().getUserByEmail(email);
                _firebaseUser = _checkUser;
            } catch (error) {

            }

            if (_firebaseUser == null) {
                _firebaseUser = await firebase.auth().createUser({
                    email: email,
                    emailVerified: false,
                    phoneNumber: '+91' + contact,
                    password: 'password',
                    displayName: name,
                    disabled: false,
                });
            }

            const sql2 = 'INSERT INTO staff SET ?';
            await queryParamPromise(sql2, {
                st_id: _firebaseUser.uid,
                st_name: name,
                gender: gender,
                dob: moment(dob, 'DD-MM-YYYY').toDate(),
                email: email,
                st_address: address + '-' + city + '-' + postalCode,
                contact: contact,
                dept_id: department,
            });

            const _firestore = firebase.firestore;
            const _user = await _firestore.collection('users').doc(_firebaseUser.uid).get();
    
            if (!_user.exists) {
              await  _firestore.collection('users').doc(_firebaseUser.uid).set({
                    "name": name,
                    "email": email,
                    "status": "Unavalible",
                    "uid": _firebaseUser.uid,
                  });
            }
            res.status(201).send({
                'response_code': 201,
                'response_message': "Staff Registered Successfully",
            });
        }
    } catch (error) {
        next(error);
    }

};


// 2.2 Get staffs on query
exports.getStaffBy = async (req, res, next) => {
    try {
        const { staff_id, dept_id } = req.query;

        if (!staff_id || validator.isEmpty(staff_id)) {
            const err = new Error('Select valid staff');
            err.status = 401;
            throw err;
        }

        const sql = 'SELECT staff.st_id,staff.st_name,staff.email,staff.contact,department.d_name,semester.sem_name,staff.st_address,staff.dob,staff.gender FROM staff LEFT JOIN department ON staff.dept_id = department.dept_id LEFT JOIN class ON staff.st_id = class.st_id LEFT JOIN semester ON class.sem_id = semester.sem_id WHERE staff.st_id =? GROUP BY staff.st_id,staff.st_name,staff.email,staff.contact,department.d_name,semester.sem_name,staff.st_address,staff.dob,staff.gender';
        const results = await queryParamPromise(sql, [staff_id]);
        if (!results || results.length < 1) {
            const err = new Error('No staff found');
            err.status = 401;
            throw err;
        }
        res.status(200).send({
            'response_code': 200,
            'data': results[0],
        });
    } catch (error) {
        next(error);
    }
}

// 2.3 Get all staffs
exports.getAllStaff = async (req, res, next) => {

    const { sem_id, dept_id } = req.query;

    try {

        if (dept_id && validator.isEmpty(dept_id)) {
            const err = new Error('Select valid department');
            err.status = 401;
            throw err;
        } else if (sem_id && validator.isEmpty(sem_id)) {
            const err = new Error('Select valid class');
            err.status = 401;
            throw err;
        }

        let results;

        if (dept_id && sem_id) {
            const sql = 'SELECT staff.st_id,staff.st_name,staff.email,staff.contact,department.d_name,semester.sem_name FROM staff LEFT JOIN department ON staff.dept_id = department.dept_id LEFT JOIN class ON staff.st_id = class.st_id LEFT JOIN semester ON class.sem_id = semester.sem_id WHERE staff.dept_id =? AND semester.sem_id = ? GROUP BY staff.st_id,staff.st_name,staff.email,staff.contact,department.d_name,semester.sem_name';
            results = await queryParamPromise(sql, [dept_id, sem_id]);
        } else if (dept_id) {
            const sql = 'SELECT staff.st_id,staff.st_name,staff.email,staff.contact,department.d_name,semester.sem_name FROM staff LEFT JOIN department ON staff.dept_id = department.dept_id LEFT JOIN class ON staff.st_id = class.st_id LEFT JOIN semester ON class.sem_id = semester.sem_id WHERE staff.dept_id =? GROUP BY staff.st_id,staff.st_name,staff.email,staff.contact,department.d_name,semester.sem_name';
            results = await queryParamPromise(sql, [dept_id]);
        } else {
            const sql = 'SELECT staff.st_id,staff.st_name,staff.email,staff.contact,department.d_name,semester.sem_name FROM staff LEFT JOIN department ON staff.dept_id = department.dept_id LEFT JOIN class ON staff.st_id = class.st_id LEFT JOIN semester ON class.sem_id = semester.sem_id GROUP BY staff.st_id,staff.st_name,staff.email,staff.contact,department.d_name,semester.sem_name';
            results = await zeroParamPromise(sql);
        }


        if (!results || results.length < 1) {
            const err = new Error('No staff found');
            err.status = 401;
            throw err;
        }
        res.status(200).send({
            'response_code': 200,
            'data': results,
        });
    } catch (error) {
        next(error);
    }
};
// 2.4 Modify existing staffs


// 3. STUDENTS
// 3.1 Add student
exports.postAddStudent = async (req, res, next) => {
    try {

        const {
            email,
            dob,
            name,
            gender,
            department,
            address,
            city,
            postalCode,
            contact,
            class_id,
        } = req.body;

        if (!email || validator.isEmpty(email)) {
            const err = new Error('Enter valid email');
            err.status = 401;
            throw err;
        }
        const sqlEmail = 'SELECT count(*) as `count` from student where email = ?';
        const count = (await queryParamPromise(sqlEmail, [email]))[0].count;
        if (count !== 0) {
            const err = new Error('Student already exits');
            err.status = 409;
            throw err;
        } else if (!dob || validator.isEmpty(dob)) {
            const err = new Error('Enter valid Date of birth');
            err.status = 401;
            throw err;
        } else if (!name || validator.isEmpty(name)) {
            const err = new Error('Enter valid name');
            err.status = 401;
            throw err;
        } else if (!gender || validator.isEmpty(gender)) {
            const err = new Error('Enter valid gender');
            err.status = 401;
            throw err;
        } else if (!department || validator.isEmpty(department)) {
            const err = new Error('Select valid department');
            err.status = 401;
            throw err;
        } else if (!address || validator.isEmpty(address)) {
            const err = new Error('Enter valid address');
            err.status = 401;
            throw err;
        } else if (!city || validator.isEmpty(city)) {
            const err = new Error('Enter valid city');
            err.status = 401;
            throw err;
        } else if (!postalCode || validator.isEmpty(postalCode) || postalCode.length != 6) {
            const err = new Error('Enter valid phone number');
            err.status = 401;
            throw err;
        } else if (!contact || validator.isEmpty(contact) || contact.length != 10) {
            const err = new Error('Enter valid phone number');
            err.status = 401;
            throw err;
        }
        //check valid department
        const sqlDepartment = 'SELECT * FROM department WHERE dept_id = ?';
        const resultsDepat = await queryParamPromise(sqlDepartment, [department]);
        if (!resultsDepat || resultsDepat.length < 1) {
            const err = new Error('Department not found');
            err.status = 404;
            throw err;
        }
        //check valid class
        const sqlClass = 'SELECT * FROM class WHERE class_id = ?';
        const resultsClass = await queryParamPromise(sqlClass, [class_id]);
        if (!resultsClass || resultsClass.length < 1) {
            const err = new Error('class not found');
            err.status = 404;
            throw err;
        }
        //firebase create user
        let _firebaseUser;
        try {
            const _checkUser = await firebase.auth().getUserByEmail(email);
            _firebaseUser = _checkUser;
        } catch (error) {
        }
        if (_firebaseUser == null) {
            _firebaseUser = await firebase.auth().createUser({
                email: email,
                emailVerified: false,
                phoneNumber: '+91' + contact,
                password: 'password',
                displayName: name,
                disabled: false,
            });
        }
        const sql2 = 'INSERT INTO STUDENT SET ?';
        await queryParamPromise(sql2, {
            s_id: _firebaseUser.uid,
            s_name: name,
            gender: gender,
            dob: moment(dob, 'DD-MM-YYYY').toDate(),
            email: email,
            s_address: address + '-' + city + '-' + postalCode,
            contact: contact,
            dept_id: department,
            class_id: class_id,
        });
        const _firestore = firebase.firestore;
        const _user = await _firestore.collection('users').doc(_firebaseUser.uid).get();

        if (!_user.exists) {
          await  _firestore.collection('users').doc(_firebaseUser.uid).set({
                "name": name,
                "email": email,
                "status": "Unavalible",
                "uid": _firebaseUser.uid,
              });
        }

        res.status(201).send({
            'response_code': 201,
            'response_message': "Student registered successfully",
        });
    } catch (error) {
        next(error);
    }
};
// 3.2 Get students on query
exports.getStudentsBy = async (req, res, next) => {
    try {
        const { dept_id, class_id, student_id } = req.query;

        if (!dept_id && !class_id && !student_id) {
            const err = new Error('Select department or class');
            err.status = 401;
            throw err;
        } else if (dept_id && validator.isEmpty(dept_id)) {
            const err = new Error('Select valid department');
            err.status = 401;
            throw err;
        } else if (class_id && validator.isEmpty(class_id)) {
            const err = new Error('Select valid class');
            err.status = 401;
            throw err;

        } else if (student_id && validator.isEmpty(student_id)) {
            const err = new Error('Select valid student');
            err.status = 401;
            throw err;
        }

        let students;
        if (dept_id) {
            sql1 = 'SELECT student.s_id,student.s_name,student.email,student.contact from student INNER JOIN department ON student.dept_id = department.dept_id INNER JOIN class ON student.class_id = class.class_id WHERE student.dept_id =?';
            students = await queryParamPromise(sql1, [dept_id]);
        } else if (class_id) {
            sql1 = 'SELECT student.s_id,student.s_name,student.email,student.contact from student INNER JOIN department ON student.dept_id = department.dept_id INNER JOIN class ON student.class_id = class.class_id WHERE student.class_id =?';
            students = await queryParamPromise(sql1, [class_id]);

        } else if (student_id) {
            sql1 = 'SELECT student.*,department.d_name,semester.sem_name,course.name,class.cls_name from student INNER JOIN department ON student.dept_id = department.dept_id INNER JOIN class ON student.class_id = class.class_id INNER JOIN course ON course.c_id = class.c_id INNER JOIN semester ON semester.sem_id = class.sem_id WHERE student.s_id =?';
            students = await queryParamPromise(sql1, [student_id]);
        } else {
            sql1 = 'SELECT student.s_id,student.s_name,student.email,student.contact from student INNER JOIN department ON student.dept_id = department.dept_id INNER JOIN class ON student.class_id = class.class_id';
            students = await zeroParamPromise(sql1,);
        }
        if (!students || students.length < 1) {
            const err = new Error('Students not found');
            err.status = 404;
            throw err;
        }
        res.status(200).send({
            'response_code': 200,
            'data': students,
        });


    } catch (error) {
        next(error);
    }
}
// 3.3 Get all students
exports.getAllStudents = async (req, res, next) => {
    try {
        const { dept_id, class_id, staff_id } = req.query;

        if (dept_id && validator.isEmpty(dept_id)) {
            const err = new Error('Select valid department');
            err.status = 401;
            throw err;
        } else if (class_id && validator.isEmpty(class_id)) {
            const err = new Error('Select valid class');
            err.status = 401;
            throw err;
        } else if (staff_id && validator.isEmpty(staff_id)) {
            const err = new Error('Select valid staff');
            err.status = 401;
            throw err;
        }

        let students;
        if (dept_id) {
            sql1 = 'SELECT student.s_id,student.s_name,student.email,student.contact,department.d_name,semester.sem_name,class.cls_name from student INNER JOIN department ON student.dept_id = department.dept_id INNER JOIN class ON student.class_id = class.class_id INNER JOIN semester ON class.sem_id = semester.sem_id WHERE student.dept_id =?';
            students = await queryParamPromise(sql1, [dept_id]);
        } else if (class_id) {
            sql1 = 'SELECT student.s_id,student.s_name,student.email,student.contact,department.d_name,semester.sem_name,class.cls_name from student INNER JOIN department ON student.dept_id = department.dept_id INNER JOIN class ON student.class_id = class.class_id INNER JOIN semester ON class.sem_id = semester.sem_id WHERE student.class_id =?';
            students = await queryParamPromise(sql1, [class_id]);
        } else if (staff_id) {
            sql1 = 'SELECT student.s_id,student.s_name,student.email,student.contact,department.d_name,semester.sem_name,class.cls_name from student INNER JOIN department ON student.dept_id = department.dept_id INNER JOIN class ON student.class_id = class.class_id INNER JOIN semester ON class.sem_id = semester.sem_id INNER JOIN staff on class.st_id = staff.st_id WHERE staff.st_id =?';
            students = await queryParamPromise(sql1, [staff_id]);
        } else {
            sql1 = 'SELECT student.s_id,student.s_name,student.email,student.contact,department.d_name,semester.sem_name,class.cls_name from student INNER JOIN department ON student.dept_id = department.dept_id INNER JOIN class ON student.class_id = class.class_id INNER JOIN semester ON class.sem_id = semester.sem_id';
            students = await zeroParamPromise(sql1);
        }
        if (!students || students.length < 1) {
            const err = new Error('Students not found');
            err.status = 404;
            throw err;
        }
        res.status(200).send({
            'response_code': 200,
            'data': students,
        });
    } catch (error) {
        next(error);
    }
}
// 3.4 Modify existing students

// 4. CLASSES
// 4.1 All Class
exports.getAllClass = async (req, res, next) => {

    const { staff_id, course_id } = req.query;
    try {

        if (!staff_id && !course_id) {
            const err = new Error('Select valid staff or course');
            err.status = 401;
            throw err;
        } else if (staff_id && validator.isEmpty(staff_id)) {
            const err = new Error('Select valid staff');
            err.status = 401;
            throw err;
        } else if (course_id && validator.isEmpty(course_id)) {
            const err = new Error('Select valid course');
            err.status = 401;
            throw err;
        }

        let students;

        if (staff_id) {
            const sql1 = 'SELECT class.class_id,class.year,class.cls_name,class.year,course.name,department.d_name,semester.sem_name from class INNER JOIN course ON class.c_id = course.c_id INNER JOIN semester ON class.sem_id = semester.sem_id INNER JOIN department ON course.dept_id = department.dept_id WHERE class.st_id =?';
            students = await queryParamPromise(sql1, [staff_id]);

        } else {
            const sql1 = 'SELECT class.class_id,class.year,class.cls_name,class.year,course.name,department.d_name,semester.sem_name from class INNER JOIN course ON class.c_id = course.c_id INNER JOIN semester ON class.sem_id = semester.sem_id INNER JOIN department ON course.dept_id = department.dept_id WHERE class.c_id =?';
            students = await queryParamPromise(sql1, [course_id]);

        }
        if (!students || students.length < 1) {
            const err = new Error('class not found');
            err.status = 404;
            throw err;
        }

        res.status(200).send({
            'response_code': 200,
            'data': students,
        });
    } catch (error) {
        next(error);
    }
}
// 4.2 Add class
exports.postAddClass = async (req, res, next) => {
    let { course_id, staff_id } = req.body;

    try {
        if (!course_id || validator.isEmpty(course_id)) {
            const err = new Error('Select valid course');
            err.status = 401;
            throw err;
        } else if (!staff_id || validator.isEmpty(staff_id)) {
            const err = new Error('Select valid staff');
            err.status = 401;
            throw err;
        }

        const sql1 = 'SELECT dept_id from staff where st_id = ?';
        const staffData = await queryParamPromise(sql1, [staff_id]);
        if (!staffData || staffData.length < 1) {
            const err = new Error('Staff not found');
            err.status = 404;
            throw err;
        }

        const sql2 = 'SELECT sem_id, dept_id from course where c_id = ?';
        const courseData = await queryParamPromise(sql2, [course_id]);
        if (!courseData || courseData.length < 1) {
            const err = new Error('course not found');
            err.status = 404;
            throw err;
        }

        if (staffData[0].dept_id !== courseData[0].dept_id) {
            const err = new Error('The staff and course are of different department');
            err.status = 401;
            throw err;
        }

        const sql4 = 'INSERT INTO class set ?';
        await queryParamPromise(sql4, {
            c_id: course_id,
            st_id: staff_id,
            sem_id: courseData[0].sem_id
        });

        res.status(201).send({
            'response_code': 201,
            'response_message': "Class added successfully",
        });
    } catch (error) {
        next(error);
    }
};
// 4.3 Modify existing classes

// 5. DEPARTMENTS
exports.getDept = async (req, res, next) => {
    try {
        const results = await zeroParamPromise('SELECT * FROM department');
        if (!results || results.length < 1) {
            const err = new Error('No departments found');
            err.status = 404;
            throw err;
        }
        res.status(200).send({
            'response_code': 200,
            'data': results,
        });
    } catch (error) {
        next(error);
    }
};

exports.postAddDept = async (req, res, next) => {
    const deptName = req.body.department;
    const deptId = req.body.deptId;
    try {
        if (!deptName || validator.isEmpty(deptName)) {
            const err = new Error('Enter valid department');
            err.status = 401;
            throw err;
        } else if (!deptId || validator.isEmpty(deptId)) {
            const err = new Error('Enter valid department id');
            err.status = 401;
            throw err;
        }
        const sql1 = 'SELECT * from department where dept_id = ? or d_name = ?';
        const results = await queryParamPromise(sql1, [deptId, deptName]);
        if (results.length !== 0) {
            const err = new Error('Department already exits');
            err.status = 401;
            throw err;
        } else {
            const sql2 = 'INSERT INTO department SET ?';
            await queryParamPromise(sql2, { dept_id: deptId, d_name: deptName });
            res.status(201).send({
                'response_code': 201,
                'response_message': "Department Registered Successfully",
            });
        }
    } catch (error) {
        next(error);
    }
};

exports.getSem = async (req, res, next) => {
    try {
        const results = await zeroParamPromise('SELECT * FROM semester');
        if (!results || results.length < 1) {
            const err = new Error('No semeter found');
            err.status = 404;
            throw err;
        }
        res.status(201).send({
            'response_code': 201,
            'data': results,
        });
    } catch (error) {
        next(error);
    }
};

exports.postAddSem = async (req, res, next) => {
    const semName = req.body.semester;
    const semId = req.body.semId;
    try {
        if (!semName || validator.isEmpty(semName)) {
            const err = new Error('Enter valid semester');
            err.status = 401;
            throw err;
        } else if (!semId || validator.isEmpty(semId)) {
            const err = new Error('Enter valid semester id');
            err.status = 401;
            throw err;
        }
        const sql1 = 'SELECT * from semester where sem_id = ? or sem_name = ?';
        const results = await queryParamPromise(sql1, [semId, semName]);
        if (results.length !== 0) {
            const err = new Error('Semester already exits');
            err.status = 401;
            throw err;
        } else {
            const sql2 = 'INSERT INTO semester SET ?';
            await queryParamPromise(sql2, { sem_id: semId, sem_name: semName });
            res.status(201).send({
                'response_code': 201,
                'response_message': "Semester Registered Successfully",
            });
        }
    } catch (error) {
        next(error);
    }
};



// 6. COURSE
// 6.1 Get all courses
exports.getAllCourses = async (req, res, next) => {
    try {
        const results = await zeroParamPromise('SELECT course.name,course.c_id,semester.sem_name,department.d_name,staff.st_name from course INNER JOIN semester ON course.sem_id = semester.sem_id INNER JOIN department ON course.dept_id = department.dept_id INNER JOIN class ON course.c_id = class.c_id INNER JOIN staff ON class.st_id = staff.st_id GROUP BY course.name,course.c_id,semester.sem_name,department.d_name,staff.st_name');
        if (!results || results.length < 1) {
            const err = new Error('No courses found');
            err.status = 404;
            throw err;
        }
        res.status(201).send({
            'response_code': 201,
            'data': results,
        });
    } catch (error) {
        next(error);
    }
}
// 6.2 Get courses on query
exports.getAllCoursesBy = async (req, res, next) => {

    const { sem_id, dept_id, staff_id, student_id } = req.query;

    try {
        if (!dept_id && !sem_id && !staff_id && !student_id) {
            const err = new Error('Select department or class');
            err.status = 401;
            throw err;
        } else if (dept_id && validator.isEmpty(dept_id)) {
            const err = new Error('Select valid department');
            err.status = 401;
            throw err;
        } else if (sem_id && validator.isEmpty(sem_id)) {
            const err = new Error('Select valid class');
            err.status = 401;
            throw err;
        } else if (staff_id && validator.isEmpty(staff_id)) {
            const err = new Error('Select valid Staff');
            err.status = 401;
            throw err;
        } else if (student_id && validator.isEmpty(student_id)) {
            const err = new Error('Select valid student');
            err.status = 401;
            throw err;
        }

        let results;

        if (dept_id && sem_id) {
            sql1 = 'SELECT course.name,course.c_id,semester.sem_name,department.d_name,staff.st_name from course INNER JOIN semester ON course.sem_id = semester.sem_id INNER JOIN department ON course.dept_id = department.dept_id LEFT JOIN class ON course.c_id = class.c_id LEFT JOIN staff ON class.st_id = staff.st_id WHERE course.dept_id = ? AND course.sem_id =? GROUP BY course.name,course.c_id,semester.sem_name,department.d_name,staff.st_name ';
            results = await queryParamPromise(sql1, [dept_id, sem_id]);

        } else if (dept_id) {
            sql1 = 'SELECT course.name,course.c_id,semester.sem_name,department.d_name,staff.st_name from course INNER JOIN semester ON course.sem_id = semester.sem_id INNER JOIN department ON course.dept_id = department.dept_id LEFT JOIN class ON course.c_id = class.c_id LEFT JOIN staff ON class.st_id = staff.st_id WHERE course.dept_id = ? GROUP BY course.name,course.c_id,semester.sem_name,department.d_name,staff.st_name ';
            results = await queryParamPromise(sql1, [dept_id]);
        } else if (staff_id) {
            sql1 = 'SELECT course.name,course.c_id,semester.sem_name,department.d_name,staff.st_name from course INNER JOIN semester ON course.sem_id = semester.sem_id INNER JOIN department ON course.dept_id = department.dept_id LEFT JOIN class ON course.c_id = class.c_id LEFT JOIN staff ON class.st_id = staff.st_id WHERE staff.st_id = ? GROUP BY course.name,course.c_id,semester.sem_name,department.d_name,staff.st_name ';
            results = await queryParamPromise(sql1, [staff_id]);
        } else if (student_id) {
            sql1 = 'SELECT course.name,course.c_id,staff.st_id from student INNER JOIN class ON class.class_id =student.class_id INNER JOIN course ON course.sem_id = class.sem_id INNER JOIN staff ON staff.st_id = class.st_id WHERE student.s_id =?';
            results = await queryParamPromise(sql1, [student_id]);
        } else {
            sql1 = 'SELECT course.name,course.c_id,semester.sem_name,department.d_name,staff.st_name from course INNER JOIN semester ON course.sem_id = semester.sem_id INNER JOIN department ON course.dept_id = department.dept_id LEFT JOIN class ON course.c_id = class.c_id LEFT JOIN staff ON class.st_id = staff.st_id WHERE course.sem_id = ? GROUP BY course.name,course.c_id,semester.sem_name,department.d_name,staff.st_name';
            results = await queryParamPromise(sql1, [sem_id]);
        }


        if (!results || results.length < 1) {
            const err = new Error('No courses found');
            err.status = 404;
            throw err;
        }
        res.status(201).send({
            'response_code': 201,
            'data': results,
        });
    } catch (error) {
        next(error);
    }
}

// 6.3 Add course
exports.postAddCourse = async (req, res, next) => {
    try {
        let { course, semester, department } = req.body;

        if (!course || validator.isEmpty(course)) {
            const err = new Error('Enter valid course');
            err.status = 401;
            throw err;
        } else if (!semester || validator.isEmpty(semester)) {
            const err = new Error('select valid semester');
            err.status = 401;
            throw err;
        } else if (!department || validator.isEmpty(department)) {
            const err = new Error('select valid department');
            err.status = 401;
            throw err;
        }
        //check valid department
        const sqlDepartment = 'SELECT * FROM department WHERE dept_id = ?';
        const resultsDepat = await queryParamPromise(sqlDepartment, [department]);
        if (!resultsDepat || resultsDepat.length < 1) {
            const err = new Error('Department not found');
            err.status = 404;
            throw err;
        }
        //check valid semester
        const sqlSemeter = 'SELECT * FROM semester WHERE sem_id = ?';
        const resultSemester = await queryParamPromise(sqlSemeter, [semester]);
        if (!resultSemester || resultSemester.length < 1) {
            const err = new Error('Semester not found');
            err.status = 404;
            throw err;
        }
        const sql1 = 'SELECT COUNT(dept_id) AS size FROM course WHERE dept_id = ?';
        const results = await queryParamPromise(sql1, [department]);
        let size = results[0].size + 1;
        const c_id = department + (size <= 9 ? '0' : '') + size.toString();
        const sql2 = 'INSERT INTO course SET ?';
        await queryParamPromise(sql2, {
            c_id,
            sem_id: semester,
            name: course,
            dept_id: department,
        });
        res.status(201).send({
            'response_code': 201,
            'response_message': "Course Registered Successfully",
        });
    } catch (error) {
        next(error);
    }
};
// 6.4 Modify existing courses

// 7 Attendace
exports.getAttendanceByClass = async (req, res, next) => {
    try {

        const { class_id, date, course_id, student_id } = req.query;
        if (!class_id && !date && !course_id) {
            const err = new Error('select valid class & date');
            err.status = 404;
            throw err;
        } else if (class_id && isNaN(class_id)) {
            const err = new Error('select valid class');
            err.status = 404;
            throw err;
        } else if (date && validator.isEmpty(date)) {
            const err = new Error('select valid date');
            err.status = 404;
            throw err;
        } else if (course_id && validator.isEmpty(course_id)) {
            const err = new Error('select valid course');
            err.status = 404;
            throw err;
        } else if (student_id && validator.isEmpty(student_id)) {
            const err = new Error('select valid student');
            err.status = 401;
            throw err;
        } else if (student_id && !course_id) {
            const err = new Error('select valid student & course');
            err.status = 401;
            throw err;
        }

        let results;

        if (class_id && date) {
            const sql1 = 'SELECT attendance.attendance,attendance.at_id,attendance.date,student.s_name,class.cls_name,course.name,department.d_name,semester.sem_name FROM attendance INNER JOIN student on student.s_id = attendance.s_id INNER JOIN class ON class.class_id  = attendance.class_id INNER JOIN course ON course.c_id = class.c_id INNER JOIN semester ON semester.sem_id = course.sem_id INNER JOIN department ON department.dept_id = course.dept_id WHERE attendance.class_id =? AND attendance.date =?';
            results = await queryParamPromise(sql1, [class_id, date]);
        } else if (student_id) {
            const sql1 = 'SELECT attendance.attendance,attendance.at_id,attendance.date,student.s_name,class.cls_name,course.name,department.d_name,semester.sem_name FROM attendance INNER JOIN student on student.s_id = attendance.s_id INNER JOIN class ON class.class_id  = attendance.class_id INNER JOIN course ON course.c_id = class.c_id INNER JOIN semester ON semester.sem_id = course.sem_id INNER JOIN department ON department.dept_id = course.dept_id WHERE attendance.s_id =? AND course.c_id =?';
            results = await queryParamPromise(sql1, [student_id, course_id]);
        } else if (course_id) {
            const sql1 = 'SELECT attendance.attendance,attendance.at_id,attendance.date,student.s_name,class.cls_name,course.name,department.d_name,semester.sem_name FROM attendance INNER JOIN student on student.s_id = attendance.s_id INNER JOIN class ON class.class_id  = attendance.class_id INNER JOIN course ON course.c_id = class.c_id INNER JOIN semester ON semester.sem_id = course.sem_id INNER JOIN department ON department.dept_id = course.dept_id WHERE class.c_id =? AND attendance.date =?';
            results = await queryParamPromise(sql1, [course_id, moment(new Date()).format("YYYY-MM-DD")]);
        } else {
            const sql1 = 'SELECT attendance.attendance,attendance.at_id,attendance.date,student.s_name,class.cls_name,course.name,department.d_name,semester.sem_name FROM attendance INNER JOIN student on student.s_id = attendance.s_id INNER JOIN class ON class.class_id  = attendance.class_id INNER JOIN course ON course.c_id = class.c_id INNER JOIN semester ON semester.sem_id = course.sem_id INNER JOIN department ON department.dept_id = course.dept_id WHERE attendance.class_id =? AND attendance.date =?';
            results = await queryParamPromise(sql1, [class_id, moment(new Date()).format("YYYY-MM-DD")]);
        }
        if (!results || results.length < 1) {
            const err = new Error('No Attendance marked');
            err.status = 404;
            throw err;
        }
        res.status(201).send({
            'response_code': 201,
            'data': results,
        });

    } catch (error) {
        next(error);
    }
}

exports.postAttendanceByClass = async (req, res, next) => {
    try {

        const { class_id, students } = req.body;
        if (!class_id && !students) {
            const err = new Error('select valid class & absent_student');
            err.status = 401;
            throw err;
        } else if (!class_id || validator.isEmpty(class_id)) {
            const err = new Error('select valid class');
            err.status = 401;
            throw err;
        } else if (!students) {
            const err = new Error('select valid date');
            err.status = 401;
            throw err;
        }

        const sql2 = 'SELECT s_id from student WHERE class_id =?';
        const studentList = await queryParamPromise(sql2, [class_id]);
        if (!studentList || studentList.length < 1) {
            const err = new Error('Students not found');
            err.status = 404;
            throw err;
        }

        let studentsEntry = [];

        studentList.forEach(student => {

            if (students.includes(student.s_id)) {
                studentsEntry.push([
                    student.s_id,
                    moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
                    0,
                    class_id
                ]);
            } else {
                studentsEntry.push([
                    student.s_id,
                    moment(new Date()).format("YYYY-MM-DD HH:mm:ss"),
                    1,
                    class_id
                ]);
            }
        });

        const sql3 = 'INSERT INTO attendance (s_id,date,attendance,class_id) VALUES ?';
        const insertAttendance = await queryParamPromise(sql3, [studentsEntry]);

        res.status(201).send({
            'response_code': 201,
            'response_message': 'Attendance marked'
        });

    } catch (error) {
        next(error);
    }
}


exports.postExam = async (req, res, next) => {
    try {

        const { course_id, name, total } = req.body;
        if (!course_id || validator.isEmpty(course_id)) {
            const err = new Error('select valid course');
            err.status = 401;
            throw err;
        } else if (!name || validator.isEmpty(name)) {
            const err = new Error('Enter valid exam name');
            err.status = 401;
            throw err;
        } else if (isNaN(total)) {
            const err = new Error('Enter valid total score');
            err.status = 401;
            throw err;
        }

        const sql2 = 'INSERT INTO exam SET ?';
        await queryParamPromise(sql2, { c_id: course_id, ex_name: name, ex_total: total });
        res.status(201).send({
            'response_code': 201,
            'response_message': "Exam Registered Successfully",
        });

    } catch (error) {
        next(error);
    }
}


exports.getExamByCourse = async (req, res, next) => {
    try {

        const { course_id, } = req.query;
        if (!course_id || validator.isEmpty(course_id)) {
            const err = new Error('select valid course');
            err.status = 401;
            throw err;
        }

        const sql2 = 'SELECT * FROM exam WHERE c_id =?';
        const results = await queryParamPromise(sql2, [course_id]);
        if (!results || results.length < 1) {
            const err = new Error('No courses found');
            err.status = 404;
            throw err;
        }
        res.status(201).send({
            'response_code': 201,
            'data': results,
        });

    } catch (error) {
        next(error);
    }
}


exports.postMark = async (req, res, next) => {
    try {

        const { class_id, marks, exam_id } = req.body;
        if (isNaN(class_id)) {
            const err = new Error('select valid class');
            err.status = 401;
            throw err;
        } else if (!marks || marks.length < 1) {
            const err = new Error('Enter valid marks list');
            err.status = 401;
            throw err;
        } else if (isNaN(exam_id)) {
            const err = new Error('select valid exam');
            err.status = 401;
            throw err;
        }


        const sql1 = 'SELECT s_id from student WHERE class_id =?';
        const studentList = await queryParamPromise(sql1, [class_id]);
        if (!studentList || studentList.length < 1) {
            const err = new Error('Students not found');
            err.status = 404;
            throw err;
        }

        let markEntry = [];

        studentList.forEach(student => {
            if (marks.some(mark => mark.s_id == student.s_id)) {
                markEntry.push([
                    exam_id,
                    student.s_id,
                    marks.find(mark => mark.s_id == student.s_id).marks,
                    class_id
                ]);
            }
        });


        const sql3 = 'INSERT INTO marks (ex_id,s_id,score,class_id) VALUES ?';
        const insertAttendance = await queryParamPromise(sql3, [markEntry]);

        res.status(201).send({
            'response_code': 201,
            'response_message': "Marks Uploaded Successfully",
        });

    } catch (error) {
        next(error);
    }
}

exports.getMarks = async (req, res, next) => {
    try {
        const { course_id, class_id, exam_id, student_id } = req.query;
        if (!course_id && !class_id && !exam_id && !student_id) {
            const err = new Error('select valid course,class,student or exam');
            err.status = 401;
            throw err;
        } else if (course_id && validator.isEmpty(course_id)) {
            const err = new Error('select valid course');
            err.status = 401;
            throw err;
        } else if (class_id && isNaN(class_id)) {
            const err = new Error('select valid class');
            err.status = 401;
            throw err;
        } else if (exam_id && isNaN(exam_id)) {
            const err = new Error('select valid exam');
            err.status = 401;
            throw err;
        } else if (student_id && validator.isEmpty(student_id)) {
            const err = new Error('select valid student');
            err.status = 401;
            throw err;
        } else if (student_id && !course_id) {
            const err = new Error('select valid student & course');
            err.status = 401;
            throw err;
        }

        let results;
        if (exam_id && class_id) {
            const sql2 = 'SELECT marks.mark_id,marks.score,exam.ex_name,exam.ex_total,student.s_id,class.cls_name,course.name,semester.sem_name,department.d_name,student.s_name FROM marks INNER JOIN exam ON exam.ex_id = marks.ex_id INNER JOIN class ON class.class_id = marks.class_id INNER JOIN student ON student.s_id = marks.s_id INNER JOIN course ON course.c_id = class.c_id INNER JOIN semester ON semester.sem_id = course.sem_id INNER JOIN department ON department.dept_id = course.dept_id WHERE marks.ex_id =? AND marks.class_id =?';
            results = await queryParamPromise(sql2, [exam_id, class_id]);

        } else if (exam_id) {
            const sql2 = 'SELECT marks.mark_id,marks.score,exam.ex_name,exam.ex_total,student.s_id,class.cls_name,course.name,semester.sem_name,department.d_name,student.s_name FROM marks INNER JOIN exam ON exam.ex_id = marks.ex_id INNER JOIN class ON class.class_id = marks.class_id INNER JOIN student ON student.s_id = marks.s_id INNER JOIN course ON course.c_id = class.c_id INNER JOIN semester ON semester.sem_id = course.sem_id INNER JOIN department ON department.dept_id = course.dept_id WHERE marks.ex_id =?';
            results = await queryParamPromise(sql2, [exam_id]);

        } else if (class_id) {
            const sql2 = 'SELECT marks.mark_id,marks.score,exam.ex_name,exam.ex_total,student.s_id,class.cls_name,course.name,semester.sem_name,department.d_name,student.s_name FROM marks INNER JOIN exam ON exam.ex_id = marks.ex_id INNER JOIN class ON class.class_id = marks.class_id INNER JOIN student ON student.s_id = marks.s_id INNER JOIN course ON course.c_id = class.c_id INNER JOIN semester ON semester.sem_id = course.sem_id INNER JOIN department ON department.dept_id = course.dept_id WHERE marks.class_id =?';
            results = await queryParamPromise(sql2, [class_id]);

        } else if (student_id) {
            const sql2 = 'SELECT marks.mark_id,marks.score,exam.ex_name,exam.ex_total,class.cls_name,department.d_name,semester.sem_name,course.name from student INNER JOIN marks ON marks.s_id = student.s_id INNER JOIN exam ON exam.ex_id = marks.ex_id INNER JOIN course ON course.c_id = exam.c_id LEFT JOIN class ON class.c_id = course.c_id INNER JOIN department ON department.dept_id = course.dept_id INNER JOIN semester ON semester.sem_id = course.sem_id WHERE student.s_id =? AND exam.c_id =? GROUP BY marks.mark_id,marks.score,exam.ex_name,exam.ex_total,class.cls_name,department.d_name,semester.sem_name,course.name';
            results = await queryParamPromise(sql2, [student_id, course_id]);

        } else {
            const sql2 = 'SELECT marks.mark_id,marks.score,exam.ex_name,exam.ex_total,student.s_id,class.cls_name,course.name,semester.sem_name,department.d_name,student.s_name FROM marks INNER JOIN exam ON exam.ex_id = marks.ex_id INNER JOIN class ON class.class_id = marks.class_id INNER JOIN student ON student.s_id = marks.s_id INNER JOIN course ON course.c_id = exam.c_id INNER JOIN semester ON semester.sem_id = course.sem_id INNER JOIN department ON department.dept_id = course.dept_id WHERE course.c_id =?';
            results = await queryParamPromise(sql2, [course_id]);
        }

        if (!results || results.length < 1) {
            const err = new Error('No marks found');
            err.status = 404;
            throw err;
        }
        res.status(201).send({
            'response_code': 201,
            'data': results,
        });

    } catch (error) {
        next(error);
    }
}

exports.postLoginStudent = async (req, res, next) => {
    try {
        const { email, uuid } = req.body;
        if (!email || validator.isEmpty(email)) {
            const err = new Error('Enter valid Email');
            err.status = 401;
            throw err;
        } else if (!uuid || validator.isEmpty(uuid)) {
            const err = new Error('Enter valid UUID');
            err.status = 401;
            throw err;
        }
        const sql1 = 'SELECT * FROM student WHERE email = ? AND s_id = ?';
        const users = await queryParamPromise(sql1, [email, uuid]);

        if (!users || users.length < 1) {
            const err = new Error('No Users Found');
            err.status = 404;
            throw err;
        }
        const token = jwt.sign({ id: users[0].s_id }, process.env.JWT_SECRET);
        res.status(200).send({
            'response_code': 200,
            'data': {
                'name': users[0].s_name,
                'email': users[0].email,
                'token': token,
                'admin_id': users[0].s_id,
            }
        });
    } catch (error) {
        next(error);
    }
};


exports.postLoginStaff = async (req, res, next) => {
    try {
        const { email, uuid } = req.body;
        if (!email || validator.isEmpty(email)) {
            const err = new Error('Enter valid Email');
            err.status = 401;
            throw err;
        } else if (!uuid || validator.isEmpty(uuid)) {
            const err = new Error('Enter valid UUID');
            err.status = 401;
            throw err;
        }
        const sql1 = 'SELECT * FROM staff WHERE email = ? AND st_id = ?';
        const users = await queryParamPromise(sql1, [email, uuid]);

        if (!users || users.length < 1) {
            const err = new Error('No Users Found');
            err.status = 404;
            throw err;
        }
        const token = jwt.sign({ id: users[0].st_id }, process.env.JWT_SECRET);
        res.status(200).send({
            'response_code': 200,
            'data': {
                'name': users[0].st_name,
                'email': users[0].email,
                'token': token,
                'admin_id': users[0].st_id,
            }
        });
    } catch (error) {
        next(error);
    }
};


exports.postNotification = async (req, res, next) => {
    const { title, description, link } = req.body;
    try {

        if (!title || validator.isEmpty(title)) {
            const err = new Error('Enter valid title');
            err.status = 401;
            throw err;
        } else if (!description || validator.isEmpty(description)) {
            const err = new Error('Enter valid description');
            err.status = 401;
            throw err;
        } else if (!link || validator.isEmpty(link)) {
            const err = new Error('Enter valid link');
            err.status = 401;
            throw err;
        }

        const sql2 = 'INSERT INTO notifications SET ?';
        await queryParamPromise(sql2, {
            title: title,
            description: description,
            link: link,
        });
        res.status(201).send({
            'response_code': 201,
            'response_message': "Notification uploaded Successfully",
        });
    } catch (error) {
        next(error);
    }
};

exports.getNotifications = async (req, res, next) => {
    try {
        const sql1 = 'SELECT title,description,link FROM notifications';
        const notifications = await zeroParamPromise(sql1);

        if (!notifications || notifications.length < 1) {
            const err = new Error('No notifications Found');
            err.status = 404;
            throw err;
        }
        res.status(200).send({
            'response_code': 200,
            'data': notifications
        });
    } catch (error) {
        next(error);
    }
};

