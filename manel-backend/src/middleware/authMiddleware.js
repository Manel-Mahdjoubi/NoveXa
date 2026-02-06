import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production';

// Verify JWT token
export const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization;

    try {
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('🔒 Auth Check: No Bearer token provided');
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No token provided.' 
            });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        console.log(`🔓 Auth Check: Success for user ${decoded.S_id || decoded.id}, role: ${decoded.role}`);
        req.user = decoded;
        next();
    } catch (error) {
        console.log(`🔒 Auth Check FAILED: ${error.message}`);
        return res.status(403).json({ 
            success: false, 
            message: 'Invalid or expired token.' 
        });
    }
};

// Check if user is a teacher
export const isTeacher = (req, res, next) => {
    if (req.user && req.user.role === 'teacher') {
        next();
    } else {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied. Teachers only.' 
        });
    }
};

// Check if user is a student
export const isStudent = (req, res, next) => {
    if (req.user && req.user.role === 'student') {
        next();
    } else {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied. Students only.' 
        });
    }
};

// Optional authentication (allows both authenticated and public access)
export const optionalAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.split(' ')[1];
        try {
            const decoded = jwt.verify(token, JWT_SECRET);
            req.user = decoded;
        } catch (error) {
            // Token invalid, but continue as public access
            req.user = null;
        }
    } else {
        req.user = null;
    }
    next();
};

export default { verifyToken, isTeacher, isStudent, optionalAuth };