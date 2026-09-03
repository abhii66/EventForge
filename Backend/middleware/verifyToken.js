import jwt from 'jsonwebtoken'

export const isAuthenticated = (req, res, next) => {
    const token = req.cookies.token;
    if(!token){
        return res.status(401).json({message: "Not Authenticated"})
    }

    try{
        const decoded=jwt.verify(token, process.env.JWT_SECRET);
        req.user=decoded
        next()
    } catch(err){
        return res.status(401).json({message:'Invalid or expired token'})
    }
}

export const authorizeRoles=(...allowedRoles)=>{
    return (req,res,next)=>{
        if(!allowedRoles.includes(req.user.role)){
            return res.status(403).json({message:"Access Denied"})
        }
        next()
    }
}