import jwt from 'jsonwebtoken';

export const authenticate = (roles = []) => {
    return (req, res, next) => {
        const authHeader = req.headers.authorization;

        if (!authHeader) {
            return res.status(401).json({ message: "No token provided" });
        }

        const token = authHeader.split(" ")[1];

        try {
            // Ensure JWT_SECRET is defined in your .env
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            req.user = decoded;

            // Role-based access control
            if (roles.length && !roles.includes(decoded.role)) {
                return res.status(403).json({ message: "Forbidden" });
            }

            next();
        } catch (err) {
            return res.status(401).json({ message: "Invalid token" });
        }
    };
};