const AdminRoute = require('./admin');
const StaffRoute = require('./staff');
const StudentRoute = require('./student');
const { NoApiRoute, ErrorRoute } = require('./error-handler');

module.exports = {
    NoApiRoute,
    ErrorRoute,
    AdminRoute,
    StaffRoute,
    StudentRoute,
}