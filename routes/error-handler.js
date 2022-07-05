const noapiRoute = async (req, res, next) => {
    const err = new Error('No Api Found');
    err.status = 403;
    next(err);
}

const errorRoute = async (err, req, res, next) => {
    res.status(err.status || 500).send({
        'response_code': err.status || 500,
        'response_message': err.message || 'Something went wrong'
    });
}

module.exports = {
    NoApiRoute: noapiRoute,
    ErrorRoute: errorRoute,
}