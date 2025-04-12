import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const userRoles = {
    USER :'user',
    ADMIN : 'admin'
}

const userSchema = new mongoose.Schema({
    Name:{type:String,required:true,trim:true},
    email:{type:String,required:true,trim:true,unique:true},
    password:{type:String,required:true,trim:true},
    role:{type:String,required:true,enum:[userRoles.USER,userRoles.ADMIN],default:userRoles.USER},
    createdAt:{type:Date,default:Date.now}
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 10);
    next();
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate JWT token
userSchema.methods.generateToken = function() {
    return jwt.sign(
        { id: this._id, email: this.email, role: this.role },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
    );
};

// define Admin Schema
const AdminSchema = new mongoose.Schema({
    Name:{type:String,required:true,trim:true},
    email:{type:String,required:true,unique:true,trim:true,lowercase:true},
    password:{type:String,required:true,trim:true},
    role:{type:String,enum:[userRoles.ADMIN],default:userRoles.ADMIN},
    Permissions:{type:[String],default:['manage-users']},
    createdAt:{type:Date,default:Date.now}
});

// define the login Schema
const loginSchema = new mongoose.Schema({
    userId:{type:mongoose.Schema.Types.ObjectId,ref:'User',required:true},
    ipAddress:{type:String,required:true},
    loginTime:{type:Date,default:Date.now}
})

const User = mongoose.model('User',userSchema);
const Admin = mongoose.model('Admin',AdminSchema);
const Login = mongoose.model('Login',loginSchema);

export {User,Admin,Login};