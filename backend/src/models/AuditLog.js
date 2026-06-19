import mongoose from 'mongoose';
const auditSchema = new mongoose.Schema({
  user:{ type:mongoose.Schema.Types.ObjectId, ref:'User' }, action:{ type:String, required:true }, entity:String, entityId:mongoose.Schema.Types.ObjectId,
  status:{ type:String, enum:['success','failed'], default:'success' }, details:Object
}, { timestamps:true });
export default mongoose.model('AuditLog', auditSchema);
