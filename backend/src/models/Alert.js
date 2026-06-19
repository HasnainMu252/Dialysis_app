import mongoose from 'mongoose';
const alertSchema = new mongoose.Schema({
  type:{ type:String, enum:['late_patient','no_show','delayed_session','idle_chair','machine_failure','pending_clearance'], required:true },
  title:{ type:String, required:true }, message:String,
  severity:{ type:String, enum:['info','warning','critical'], default:'info' },
  entity:String, entityId:mongoose.Schema.Types.ObjectId,
  isRead:{ type:Boolean, default:false }, assignedTo:{ type:mongoose.Schema.Types.ObjectId, ref:'User' }
}, { timestamps:true });
export default mongoose.model('Alert', alertSchema);
