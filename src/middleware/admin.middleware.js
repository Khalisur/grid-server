// Admin middleware to protect admin routes
const adminMiddleware = (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ message: 'Authentication required' });
    }
    
    // For now, we'll use a simple check - you can enhance this with a proper admin role system
    // You can add admin UIDs to environment variables or create an admin role in your User model
    const adminUids = process.env.ADMIN_UIDS ? process.env.ADMIN_UIDS.split(',') : [];
    
    // Check if user is in admin list
    if (adminUids.length > 0 && !adminUids.includes(req.user.uid)) {
      return res.status(403).json({ 
        message: 'Access denied. Admin privileges required.',
        userUid: req.user.uid
      });
    }
    
    // If no admin UIDs are configured, allow all authenticated users (for development)
    // In production, you should always configure admin UIDs
    if (adminUids.length === 0 && process.env.NODE_ENV !== 'production') {
      console.warn('Warning: No admin UIDs configured. All authenticated users have admin access.');
    }
    
    next();
  } catch (error) {
    console.error('Admin middleware error:', error);
    res.status(500).json({ 
      message: 'Server error in admin middleware',
      error: error.message 
    });
  }
};

module.exports = adminMiddleware; 